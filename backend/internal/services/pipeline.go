package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
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
	db            *gorm.DB
	transcription TranscriptionService
	generation    GenerationService
	review        ReviewService
	chunker       ChunkerService
	embedding     EmbeddingService
}

func NewPipelineService(
	db *gorm.DB,
	transcription TranscriptionService,
	generation GenerationService,
	review ReviewService,
	chunker ChunkerService,
	embedding EmbeddingService,
) *PipelineService {
	return &PipelineService{
		db:            db,
		transcription: transcription,
		generation:    generation,
		review:        review,
		chunker:       chunker,
		embedding:     embedding,
	}
}

func (p *PipelineService) Run(ctx context.Context, submissionID uuid.UUID, events chan<- PipelineEvent) {
	defer close(events)

	var sub models.Submission
	if err := p.db.First(&sub, "id = ?", submissionID).Error; err != nil {
		events <- PipelineEvent{Event: "error", Step: "load", Message: "Submission not found"}
		return
	}

	// Find audio file for this submission
	var audioFile models.File
	hasAudio := p.db.Where("submission_id = ? AND file_type = ?", submissionID, 1).First(&audioFile).Error == nil

	// Step 1: Transcribe
	events <- PipelineEvent{Event: "status", Step: "transcribing", Message: "Transcribing audio..."}
	p.db.Model(&sub).Update("status", models.StatusTranscribing)

	var transcript string
	if hasAudio {
		var err error
		transcript, err = p.transcription.Transcribe(ctx, audioFile.Name)
		if err != nil {
			p.db.Model(&sub).Updates(map[string]any{"status": models.StatusDraft, "error": models.ErrTranscription})
			events <- PipelineEvent{Event: "error", Step: "transcribing", Message: fmt.Sprintf("Transcription failed: %v", err)}
			return
		}
	} else {
		transcript = sub.Description
	}

	// Step 2: Generate
	events <- PipelineEvent{Event: "status", Step: "generating", Message: "Writing article..."}
	p.db.Model(&sub).Update("status", models.StatusGenerating)

	var fileCount int64
	p.db.Model(&models.File{}).Where("submission_id = ? AND file_type = ?", submissionID, 2).Count(&fileCount)

	article, err := p.generation.Generate(ctx, transcript, sub.Description, int(fileCount))
	if err != nil {
		p.db.Model(&sub).Updates(map[string]any{"status": models.StatusDraft, "error": models.ErrGeneration})
		events <- PipelineEvent{Event: "error", Step: "generating", Message: fmt.Sprintf("Generation failed: %v", err)}
		return
	}

	// Step 3: Review
	events <- PipelineEvent{Event: "status", Step: "reviewing", Message: "Editorial review..."}
	p.db.Model(&sub).Update("status", models.StatusReviewing)

	reviewResult, err := p.review.Review(ctx, article, transcript, sub.Description)
	if err != nil {
		p.db.Model(&sub).Updates(map[string]any{"status": models.StatusDraft, "error": models.ErrReview})
		events <- PipelineEvent{Event: "error", Step: "reviewing", Message: fmt.Sprintf("Review failed: %v", err)}
		return
	}

	// Step 4: Embed (non-fatal)
	events <- PipelineEvent{Event: "status", Step: "embedding", Message: "Indexing for search..."}

	blocks := []models.Block{
		{Type: "heading", Content: article.Headline, Level: 1},
		{Type: "text", Content: article.Body},
	}
	chunks := p.chunker.ChunkBlocks(blocks, ChunkConfig{})
	if err := p.embedding.EmbedChunks(ctx, submissionID, models.EntitySubmission, chunks); err != nil {
		log.Printf("embedding failed for %s: %v", submissionID, err)
	}

	// Save results
	now := time.Now()
	meta := sub.Meta.V
	meta.Blocks = blocks
	meta.Review = reviewResult
	meta.Summary = article.Summary
	meta.Category = article.Category
	meta.GeneratedAt = &now
	meta.Model = "stub"

	metaJSON, _ := json.Marshal(meta)
	_ = metaJSON

	p.db.Model(&sub).Updates(map[string]any{
		"title":  article.Headline,
		"status": models.StatusReady,
		"error":  models.ErrNone,
		"meta":   models.JSONB[models.SubmissionMeta]{V: meta},
	})

	// Reload full submission from DB so frontend gets the complete ApiSubmission shape
	p.db.First(&sub, "id = ?", submissionID)

	events <- PipelineEvent{
		Event: "complete",
		Data: map[string]any{
			"article": sub,
			"review":  reviewResult,
		},
	}
}
