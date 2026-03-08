// Pipeline orchestrates GATHER -> RESEARCH -> GENERATE -> REVIEW for submissions.
//
// Plan: 1_what/article_engine/spec/build/BACKEND_UPDATE_SPEC.md
//
// Changes:
// - 2026-03-07: Parallel GATHER, markdown output, new review types, refinement support
package services

import (
	"context"
	"fmt"
	"log"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"gorm.io/gorm"
)

type PipelineEvent struct {
	Event   string `json:"event"`
	Step    string `json:"step,omitempty"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
}

type PipelineService struct {
	db               *gorm.DB
	transcription    TranscriptionService
	generation       GenerationService
	review           ReviewService
	photoDescription PhotoDescriptionService
	chunker          ChunkerService
	embedding        EmbeddingService
	researcher       ResearchService
	questioning      QuestioningService
	semanticGrouper  *SemanticGrouper
}

func NewPipelineService(
	db *gorm.DB,
	transcription TranscriptionService,
	generation GenerationService,
	review ReviewService,
	photoDescription PhotoDescriptionService,
	chunker ChunkerService,
	embedding EmbeddingService,
	researcher ResearchService,
	questioning QuestioningService,
) *PipelineService {
	return &PipelineService{
		db:               db,
		transcription:    transcription,
		generation:       generation,
		review:           review,
		photoDescription: photoDescription,
		chunker:          chunker,
		embedding:        embedding,
		researcher:       researcher,
		questioning:      questioning,
		semanticGrouper:  NewSemanticGrouper(embedding),
	}
}

// Transcription exposes the transcription service for use by handlers (e.g., refinement voice clips).
func (p *PipelineService) Transcription() TranscriptionService {
	return p.transcription
}

// sendEvent sends a pipeline event, returning false if the context is cancelled.
// Prevents goroutine leaks when the SSE client disconnects and the channel fills.
func sendEvent(ctx context.Context, events chan<- PipelineEvent, ev PipelineEvent) bool {
	select {
	case events <- ev:
		return true
	case <-ctx.Done():
		return false
	}
}

func (p *PipelineService) Run(ctx context.Context, submissionID uuid.UUID, events chan<- PipelineEvent) {
	defer close(events)

	var sub models.Submission
	if err := p.db.First(&sub, "id = ?", submissionID).Error; err != nil {
		sendEvent(ctx, events, PipelineEvent{Event: "error", Step: "load", Message: "Submission not found"})
		return
	}

	// Validate starting state
	if sub.Status != models.StatusDraft && sub.Status != models.StatusRefining && sub.Status != models.StatusQuestioning {
		sendEvent(ctx, events, PipelineEvent{Event: "error", Step: "load", Message: "Submission is not in a valid state for pipeline processing"})
		return
	}

	// Build town context from location hierarchy
	townContext := p.buildTownContext(sub.LocationID)

	var transcript string
	var photoDescs []string
	var photoFileURLs []string

	if sub.Status == models.StatusQuestioning && sub.Meta.V.Transcript != "" {
		// Resume from questioning: reuse persisted transcript, photoDescs, photoFileURLs
		transcript = sub.Meta.V.Transcript
		photoDescs = sub.Meta.V.PhotoDescs
		photoFileURLs = sub.Meta.V.PhotoFileURLs
	} else if sub.Status == models.StatusRefining && sub.Meta.V.Transcript != "" {
		// Refinement: reuse persisted transcript, skip GATHER
		transcript = sub.Meta.V.Transcript
		// Load photo URLs for placeholder replacement during refinement
		var photoFiles []models.File
		p.db.Where("submission_id = ? AND file_type = ?", submissionID, 2).Find(&photoFiles)
		for _, pf := range photoFiles {
			photoFileURLs = append(photoFileURLs, fmt.Sprintf("/api/media/%s/%s", submissionID, filepath.Base(pf.Name)))
		}
	} else {
		// First run: full GATHER stage
		var err error
		transcript, photoDescs, photoFileURLs, err = p.gather(ctx, &sub, submissionID, events)
		if err != nil {
			return // gather already sent error event
		}
	}

	// Send gathered data to frontend
	gatherData := map[string]any{}
	if transcript != "" {
		gatherData["transcript"] = transcript
	}
	if len(photoDescs) > 0 {
		gatherData["photo_descriptions"] = photoDescs
	}
	if len(photoFileURLs) > 0 {
		gatherData["photo_urls"] = photoFileURLs
	}
	if sub.Description != "" {
		gatherData["notes"] = sub.Description
	}
	if len(gatherData) > 0 {
		if !sendEvent(ctx, events, PipelineEvent{Event: "status", Step: "gathered", Message: "Input collected", Data: gatherData}) {
			return
		}
	}

	// RESEARCH (non-fatal — continue with empty context on failure)
	var researchContext string
	var researchResult *models.ResearchResult
	if (sub.Status == models.StatusRefining || sub.Status == models.StatusQuestioning) && sub.Meta.V.Research != nil {
		// Refinement or question-resume: reuse persisted research
		researchContext = sub.Meta.V.Research.Context
		researchResult = sub.Meta.V.Research
	} else {
		if !sendEvent(ctx, events, PipelineEvent{Event: "status", Step: "researching", Message: "Researching context..."}) {
			return
		}
		p.db.Model(&sub).Update("status", models.StatusResearching)

		researchPctx := &PipelineContext{
			Transcript:        transcript,
			Notes:             sub.Description,
			PhotoDescriptions: photoDescs,
			TownContext:       townContext,
		}
		rr, researchErr := p.researcher.Research(ctx, researchPctx)
		if researchErr != nil {
			log.Printf("research failed for submission %s: %v", submissionID, researchErr)
		} else if rr != nil {
			researchContext = rr.Context
			researchResult = rr
			// Send research results to frontend
			sendEvent(ctx, events, PipelineEvent{Event: "status", Step: "researched", Message: "Research complete", Data: rr})
		}
	}

	// Build PipelineContext
	pctx := &PipelineContext{
		Transcript:        transcript,
		Notes:             sub.Description,
		PhotoDescriptions: photoDescs,
		PhotoFileURLs:     photoFileURLs,
		TownContext:       townContext,
		ResearchContext:   researchContext,
	}
	if researchResult != nil {
		pctx.ResearchSources = researchResult.Sources
	}

	// QUESTIONING — ask clarification questions before generation (skip during refinement and question-resume)
	if sub.Status != models.StatusRefining && sub.Status != models.StatusQuestioning {
		if !sendEvent(ctx, events, PipelineEvent{Event: "status", Step: "questioning", Message: "Analyzing for follow-up questions..."}) {
			return
		}

		qOutput, qErr := p.questioning.Analyze(ctx, pctx)
		if qErr != nil {
			log.Printf("questioning failed for submission %s: %v", submissionID, qErr)
			// Non-fatal: continue without questions
		} else if qOutput != nil && len(qOutput.Questions) > 0 {
			// Persist state for resume: transcript, research, photoDescs, photoFileURLs, questions
			meta := sub.Meta.V
			if meta.Transcript == "" && transcript != "" {
				meta.Transcript = transcript
			}
			meta.PhotoDescs = photoDescs
			meta.PhotoFileURLs = photoFileURLs
			if researchResult != nil {
				meta.Research = researchResult
			}
			questions := make([]models.ClarificationQA, len(qOutput.Questions))
			for i, q := range qOutput.Questions {
				questions[i] = models.ClarificationQA{Question: q}
			}
			meta.Questions = questions

			p.db.Model(&sub).Updates(map[string]any{
				"status": models.StatusQuestioning,
				"meta":   models.JSONB[models.SubmissionMeta]{V: meta},
			})

			// Send questions event and pause the pipeline
			sendEvent(ctx, events, PipelineEvent{
				Event: "questions",
				Data: map[string]any{
					"questions": qOutput.Questions,
				},
			})
			return // pipeline pauses — will resume when contributor answers
		}
	}

	// GENERATE
	if !sendEvent(ctx, events, PipelineEvent{Event: "status", Step: "generating", Message: "Writing article..."}) {
		return
	}
	p.db.Model(&sub).Update("status", models.StatusGenerating)

	// Fold in clarification answers from questioning stage
	if len(sub.Meta.V.Questions) > 0 {
		pctx.ClarificationAnswers = formatQAPairs(sub.Meta.V.Questions)
		for _, qa := range sub.Meta.V.Questions {
			if !qa.Skipped && qa.Answer != "" {
				pctx.QuestionsAsked = append(pctx.QuestionsAsked, qa.Question)
			}
		}
	}

	// If refinement, add previous article + direction
	if sub.Meta.V.ArticleMarkdown != "" {
		pctx.PreviousArticle = sub.Meta.V.ArticleMarkdown
		if len(sub.Meta.V.Versions) > 0 {
			latest := sub.Meta.V.Versions[len(sub.Meta.V.Versions)-1]
			pctx.Direction = latest.ContributorInput
		}
	}

	genOutput, err := p.generation.Generate(ctx, pctx)
	if err != nil {
		p.db.Model(&sub).Updates(map[string]any{"status": models.StatusDraft, "error": models.ErrGeneration})
		sendEvent(ctx, events, PipelineEvent{Event: "error", Step: "generating", Message: fmt.Sprintf("Generation failed: %v", err)})
		return
	}

	// Send generation metadata to frontend
	wordCount := len(strings.Fields(genOutput.ArticleMarkdown))
	sendEvent(ctx, events, PipelineEvent{Event: "status", Step: "generated", Message: "Article written", Data: map[string]any{
		"structure":       genOutput.Metadata.ChosenStructure,
		"category":        genOutput.Metadata.Category,
		"confidence":      genOutput.Metadata.Confidence,
		"missing_context": genOutput.Metadata.MissingContext,
		"word_count":      wordCount,
	}})

	// Update pipeline context with generation outputs
	pctx.ArticleMarkdown = genOutput.ArticleMarkdown
	pctx.Metadata = genOutput.Metadata

	// Collect gap annotations as additional questions asked
	for _, gap := range genOutput.Metadata.MissingContext {
		pctx.QuestionsAsked = append(pctx.QuestionsAsked, gap)
	}

	// REVIEW
	if !sendEvent(ctx, events, PipelineEvent{Event: "status", Step: "reviewing", Message: "Reviewing quality..."}) {
		return
	}
	p.db.Model(&sub).Update("status", models.StatusReviewing)

	reviewResult, err := p.review.Review(ctx, pctx)
	if err != nil {
		p.db.Model(&sub).Updates(map[string]any{"status": models.StatusDraft, "error": models.ErrReview})
		sendEvent(ctx, events, PipelineEvent{Event: "error", Step: "reviewing", Message: fmt.Sprintf("Review failed: %v", err)})
		return
	}

	// Send review summary to frontend
	sendEvent(ctx, events, PipelineEvent{Event: "status", Step: "reviewed", Message: "Review complete", Data: map[string]any{
		"gate":               reviewResult.Gate,
		"scores":             reviewResult.Scores,
		"verified_claims":    len(reviewResult.Verification),
		"red_triggers":       len(reviewResult.RedTriggers),
		"yellow_flags":       len(reviewResult.YellowFlags),
		"coaching":           reviewResult.Coaching,
		"web_sources":        len(reviewResult.WebSources),
	}})

	// Replace photo placeholders with actual URLs.
	// Replace in reverse order so photo_10 is handled before photo_1 can match it.
	// Use markdown image context (photo_N) to avoid replacing plain text occurrences.
	article := genOutput.ArticleMarkdown
	for i := len(photoFileURLs) - 1; i >= 0; i-- {
		placeholder := fmt.Sprintf("(photo_%d)", i+1)
		article = strings.ReplaceAll(article, placeholder, fmt.Sprintf("(%s)", photoFileURLs[i]))
	}

	// Extract headline and featured image from markdown
	headline := ExtractHeadline(article)
	featuredImg := ExtractFirstImage(article)

	// Persist transcript on first run
	meta := sub.Meta.V
	if meta.Transcript == "" && transcript != "" {
		meta.Transcript = transcript
	}

	// Save results
	now := time.Now()
	meta.ArticleMarkdown = article
	meta.ArticleMetadata = &genOutput.Metadata
	meta.Review = reviewResult
	if researchResult != nil {
		meta.Research = researchResult
	}
	meta.Category = genOutput.Metadata.Category
	meta.Summary = ExtractFirstParagraph(article)
	meta.GeneratedAt = &now
	meta.Model = p.generation.ModelName()
	if featuredImg != "" {
		meta.FeaturedImg = featuredImg
	}

	p.db.Model(&sub).Updates(map[string]any{
		"title":  headline,
		"status": models.StatusReady,
		"error":  models.ErrNone,
		"meta":   models.JSONB[models.SubmissionMeta]{V: meta},
	})

	// Embed for semantic search (non-fatal)
	if !sendEvent(ctx, events, PipelineEvent{Event: "status", Step: "embedding", Message: "Indexing for search..."}) {
		return
	}
	var chunks []Chunk
	if p.semanticGrouper != nil {
		sentences := SplitSentences(article)
		if len(sentences) > 0 {
			var groupErr error
			chunks, groupErr = p.semanticGrouper.Group(ctx, sentences, DefaultSemanticGrouperConfig())
			if groupErr != nil {
				log.Printf("semantic chunking failed for %s, falling back: %v", submissionID, groupErr)
			}
		}
	}
	if len(chunks) == 0 {
		chunks = p.chunker.ChunkMarkdown(article, ChunkConfig{MaxTokens: 300})
	}
	if len(chunks) > 0 {
		if err := p.embedding.EmbedChunks(ctx, sub.ID, models.EntitySubmission, chunks); err != nil {
			log.Printf("embedding failed for submission %s: %v", submissionID, err)
		}
	}

	sendEvent(ctx, events, PipelineEvent{
		Event: "complete",
		Data: map[string]any{
			"article":  article,
			"metadata": genOutput.Metadata,
			"review":   reviewResult,
		},
	})
}

func (p *PipelineService) gather(ctx context.Context, sub *models.Submission, submissionID uuid.UUID, events chan<- PipelineEvent) (transcript string, photoDescs []string, photoFileURLs []string, err error) {
	var wg sync.WaitGroup
	var transcriptErr, photoErr error

	// Find audio file
	var audioFile models.File
	hasAudio := p.db.Where("submission_id = ? AND file_type = ?", submissionID, 1).First(&audioFile).Error == nil

	// Find photo files
	var photoFiles []models.File
	p.db.Where("submission_id = ? AND file_type = ?", submissionID, 2).Find(&photoFiles)

	// Transcription goroutine — only if audio exists
	if hasAudio {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if !sendEvent(ctx, events, PipelineEvent{Event: "status", Step: "transcribing", Message: "Transcribing audio..."}) {
				return
			}
			p.db.Model(sub).Update("status", models.StatusTranscribing)
			transcript, transcriptErr = p.transcription.Transcribe(ctx, audioFile.Name)
		}()
	}

	// Photo description goroutine — only if photos exist
	if len(photoFiles) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if !sendEvent(ctx, events, PipelineEvent{Event: "status", Step: "describing_photos", Message: "Analyzing photos..."}) {
				return
			}
			photoDescs = make([]string, len(photoFiles))
			photoFileURLs = make([]string, len(photoFiles))
			for i, pf := range photoFiles {
				photoFileURLs[i] = fmt.Sprintf("/api/media/%s/%s", submissionID, filepath.Base(pf.Name))
				desc, descErr := p.photoDescription.Describe(ctx, pf.Name)
				if descErr != nil {
					photoErr = descErr
					return
				}
				photoDescs[i] = desc
			}
		}()
	}

	wg.Wait()

	if transcriptErr != nil {
		p.db.Model(sub).Updates(map[string]any{"status": models.StatusDraft, "error": models.ErrTranscription})
		sendEvent(ctx, events, PipelineEvent{Event: "error", Step: "transcribing", Message: fmt.Sprintf("Transcription failed: %v", transcriptErr)})
		return "", nil, nil, transcriptErr
	}
	if photoErr != nil {
		log.Printf("photo description failed for %s: %v", submissionID, photoErr)
		// Non-fatal: continue without photo descriptions
		photoDescs = nil
	}

	// If no audio, use notes as transcript fallback
	if !hasAudio {
		transcript = sub.Description
	}

	return transcript, photoDescs, photoFileURLs, nil
}

// buildTownContext loads the submission's location and its parent hierarchy
// to produce a dynamic context string for article generation and research.
func (p *PipelineService) buildTownContext(locationID uuid.UUID) string {
	var locations []models.Location
	currentID := &locationID

	// Walk up the hierarchy: city -> region -> country -> continent
	for currentID != nil {
		var loc models.Location
		if err := p.db.First(&loc, "id = ?", *currentID).Error; err != nil {
			break
		}
		locations = append(locations, loc)
		currentID = loc.ParentID
	}

	if len(locations) == 0 {
		return ""
	}

	var b strings.Builder

	// Primary location (most specific — usually city)
	primary := locations[0]
	b.WriteString(primary.Name)

	// Add parent names for geographic context: "City, Region, Country"
	if len(locations) > 1 {
		for _, loc := range locations[1:] {
			b.WriteString(", ")
			b.WriteString(loc.Name)
		}
	}
	b.WriteString(".")

	// Add description if available
	if primary.Description != nil && *primary.Description != "" {
		b.WriteString(" ")
		b.WriteString(*primary.Description)
	}

	// Add meta.about for richer context
	meta := primary.Meta.V
	if meta.About != "" {
		b.WriteString(" ")
		b.WriteString(meta.About)
	}

	// Population
	if meta.Population > 0 {
		b.WriteString(fmt.Sprintf(" Population approximately %d.", meta.Population))
	}

	// Highlights (landmarks, key features)
	if len(meta.Highlights) > 0 {
		b.WriteString(" Key features: ")
		b.WriteString(strings.Join(meta.Highlights, ", "))
		b.WriteString(".")
	}

	return b.String()
}

func ExtractHeadline(markdown string) string {
	for _, line := range strings.Split(markdown, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# ") {
			return strings.TrimPrefix(line, "# ")
		}
	}
	return ""
}

var mdImageRe = regexp.MustCompile(`!\[.*?\]\(([^)]+)\)`)

func ExtractFirstImage(markdown string) string {
	m := mdImageRe.FindStringSubmatch(markdown)
	if len(m) >= 2 {
		return m[1]
	}
	return ""
}

func ExtractFirstParagraph(markdown string) string {
	lines := strings.Split(markdown, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if len(line) > 200 {
			return line[:200]
		}
		return line
	}
	return ""
}

// formatQAPairs formats answered clarification questions into a string for generation input.
func formatQAPairs(questions []models.ClarificationQA) string {
	var b strings.Builder
	for _, qa := range questions {
		if qa.Skipped || qa.Answer == "" {
			continue
		}
		b.WriteString("Q: ")
		b.WriteString(qa.Question)
		b.WriteString("\nA: ")
		b.WriteString(qa.Answer)
		b.WriteString("\n\n")
	}
	return b.String()
}

