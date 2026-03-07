// Pipeline orchestrates GATHER -> GENERATE -> REVIEW for submissions.
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
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services/prompts"
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
}

func NewPipelineService(
	db *gorm.DB,
	transcription TranscriptionService,
	generation GenerationService,
	review ReviewService,
	photoDescription PhotoDescriptionService,
	chunker ChunkerService,
	embedding EmbeddingService,
) *PipelineService {
	return &PipelineService{
		db:               db,
		transcription:    transcription,
		generation:       generation,
		review:           review,
		photoDescription: photoDescription,
		chunker:          chunker,
		embedding:        embedding,
	}
}

// Transcription exposes the transcription service for use by handlers (e.g., refinement voice clips).
func (p *PipelineService) Transcription() TranscriptionService {
	return p.transcription
}

func (p *PipelineService) Run(ctx context.Context, submissionID uuid.UUID, events chan<- PipelineEvent) {
	defer close(events)

	var sub models.Submission
	if err := p.db.First(&sub, "id = ?", submissionID).Error; err != nil {
		events <- PipelineEvent{Event: "error", Step: "load", Message: "Submission not found"}
		return
	}

	// Validate starting state
	if sub.Status != models.StatusDraft && sub.Status != models.StatusRefining {
		events <- PipelineEvent{Event: "error", Step: "load", Message: "Submission is not in a valid state for pipeline processing"}
		return
	}

	var transcript string
	var photoDescs []string
	var photoFileURLs []string

	if sub.Status == models.StatusRefining && sub.Meta.V.Transcript != "" {
		// Refinement: reuse persisted transcript, skip GATHER
		transcript = sub.Meta.V.Transcript
		// Photo descriptions were already incorporated in previous generation
	} else {
		// First run: full GATHER stage
		var err error
		transcript, photoDescs, photoFileURLs, err = p.gather(ctx, &sub, submissionID, events)
		if err != nil {
			return // gather already sent error event
		}
	}

	// GENERATE
	events <- PipelineEvent{Event: "status", Step: "generating", Message: "Writing article..."}
	p.db.Model(&sub).Update("status", models.StatusGenerating)

	genInput := GenerationInput{
		Transcript:        transcript,
		Notes:             sub.Description,
		PhotoDescriptions: photoDescs,
		TownContext:       prompts.TownContext,
	}

	// If refinement, add previous article + direction
	if sub.Meta.V.ArticleMarkdown != "" {
		genInput.PreviousArticle = sub.Meta.V.ArticleMarkdown
		if len(sub.Meta.V.Versions) > 0 {
			latest := sub.Meta.V.Versions[len(sub.Meta.V.Versions)-1]
			genInput.Direction = latest.ContributorInput
		}
	}

	genOutput, err := p.generation.Generate(ctx, genInput)
	if err != nil {
		p.db.Model(&sub).Updates(map[string]any{"status": models.StatusDraft, "error": models.ErrGeneration})
		events <- PipelineEvent{Event: "error", Step: "generating", Message: fmt.Sprintf("Generation failed: %v", err)}
		return
	}

	// REVIEW
	events <- PipelineEvent{Event: "status", Step: "reviewing", Message: "Reviewing quality..."}
	p.db.Model(&sub).Update("status", models.StatusReviewing)

	reviewResult, err := p.review.Review(ctx, ReviewInput{
		ArticleMarkdown:   genOutput.ArticleMarkdown,
		Transcript:        transcript,
		Notes:             sub.Description,
		PhotoDescriptions: photoDescs,
	})
	if err != nil {
		p.db.Model(&sub).Updates(map[string]any{"status": models.StatusDraft, "error": models.ErrReview})
		events <- PipelineEvent{Event: "error", Step: "reviewing", Message: fmt.Sprintf("Review failed: %v", err)}
		return
	}

	// Replace photo placeholders with actual URLs
	article := genOutput.ArticleMarkdown
	for i, fileURL := range photoFileURLs {
		placeholder := fmt.Sprintf("photo_%d", i+1)
		article = strings.ReplaceAll(article, placeholder, fileURL)
	}

	// Extract headline from markdown
	headline := extractHeadline(article)

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
	meta.Category = genOutput.Metadata.Category
	meta.Summary = extractFirstParagraph(article)
	meta.GeneratedAt = &now
	meta.Model = p.generation.ModelName()

	p.db.Model(&sub).Updates(map[string]any{
		"title":  headline,
		"status": models.StatusReady,
		"error":  models.ErrNone,
		"meta":   models.JSONB[models.SubmissionMeta]{V: meta},
	})

	// Embed for semantic search (non-fatal)
	events <- PipelineEvent{Event: "status", Step: "embedding", Message: "Indexing for search..."}
	chunks := p.chunker.ChunkMarkdown(article, ChunkConfig{MaxTokens: 300})
	if len(chunks) > 0 {
		if err := p.embedding.EmbedChunks(ctx, sub.ID, models.EntitySubmission, chunks); err != nil {
			log.Printf("embedding failed for submission %s: %v", submissionID, err)
		}
	}

	events <- PipelineEvent{
		Event: "complete",
		Data: map[string]any{
			"article":  article,
			"metadata": genOutput.Metadata,
			"review":   reviewResult,
		},
	}
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
			events <- PipelineEvent{Event: "status", Step: "transcribing", Message: "Transcribing audio..."}
			p.db.Model(sub).Update("status", models.StatusTranscribing)
			transcript, transcriptErr = p.transcription.Transcribe(ctx, audioFile.Name)
		}()
	}

	// Photo description goroutine — only if photos exist
	if len(photoFiles) > 0 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			events <- PipelineEvent{Event: "status", Step: "describing_photos", Message: "Analyzing photos..."}
			photoDescs = make([]string, len(photoFiles))
			photoFileURLs = make([]string, len(photoFiles))
			for i, pf := range photoFiles {
				photoFileURLs[i] = pf.Name
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
		events <- PipelineEvent{Event: "error", Step: "transcribing", Message: fmt.Sprintf("Transcription failed: %v", transcriptErr)}
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

func extractHeadline(markdown string) string {
	for _, line := range strings.Split(markdown, "\n") {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "# ") {
			return strings.TrimPrefix(line, "# ")
		}
	}
	return ""
}

func extractFirstParagraph(markdown string) string {
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

