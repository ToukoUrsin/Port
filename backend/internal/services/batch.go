package services

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/localnews/backend/internal/cache"
	"github.com/localnews/backend/internal/models"
	"gorm.io/gorm"
)

type BatchArticleInput struct {
	Title      string    `json:"title"`
	Content    string    `json:"content"`
	LocationID uuid.UUID `json:"location_id"`
	OwnerID    uuid.UUID `json:"owner_id"`
	Category   string    `json:"category"`
	Tags       int64     `json:"tags"`
}

type BatchJob struct {
	ID          string               `json:"id"`
	Status      string               `json:"status"`
	Total       int                  `json:"total"`
	Processed   int                  `json:"processed"`
	Failed      int                  `json:"failed"`
	Articles    []BatchArticleResult `json:"articles"`
	CreatedAt   time.Time            `json:"created_at"`
	CompletedAt *time.Time           `json:"completed_at,omitempty"`
}

type BatchArticleResult struct {
	Index        int        `json:"index"`
	SubmissionID *uuid.UUID `json:"submission_id,omitempty"`
	Title        string     `json:"title"`
	Status       string     `json:"status"`
	Error        string     `json:"error,omitempty"`
}

type batchWork struct {
	job    *BatchJob
	inputs []BatchArticleInput
}

type BatchService struct {
	db        *gorm.DB
	cache     *cache.Cache
	chunker   ChunkerService
	embedding EmbeddingService
	grouper   *SemanticGrouper
	delay     time.Duration
	jobs      map[string]*BatchJob
	mu        sync.RWMutex
	queue     chan batchWork
}

func NewBatchService(db *gorm.DB, c *cache.Cache, chunker ChunkerService, embedding EmbeddingService, delay time.Duration, workers int) *BatchService {
	s := &BatchService{
		db:        db,
		cache:     c,
		chunker:   chunker,
		embedding: embedding,
		grouper:   NewSemanticGrouper(embedding),
		delay:     delay,
		jobs:      make(map[string]*BatchJob),
		queue:     make(chan batchWork, 100),
	}
	for i := 0; i < workers; i++ {
		go s.worker()
	}
	return s
}

func (s *BatchService) Submit(inputs []BatchArticleInput) *BatchJob {
	job := &BatchJob{
		ID:        fmt.Sprintf("batch_%s", uuid.New().String()[:8]),
		Status:    "queued",
		Total:     len(inputs),
		Articles:  make([]BatchArticleResult, len(inputs)),
		CreatedAt: time.Now(),
	}
	for i, input := range inputs {
		job.Articles[i] = BatchArticleResult{
			Index:  i,
			Title:  input.Title,
			Status: "pending",
		}
	}

	s.mu.Lock()
	s.jobs[job.ID] = job
	s.mu.Unlock()

	s.queue <- batchWork{job: job, inputs: inputs}
	return job
}

func (s *BatchService) GetJob(id string) *BatchJob {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.jobs[id]
}

func (s *BatchService) worker() {
	for work := range s.queue {
		s.processJob(work)
	}
}

func (s *BatchService) processJob(work batchWork) {
	job := work.job

	s.mu.Lock()
	job.Status = "processing"
	s.mu.Unlock()

	for i, input := range work.inputs {
		if i > 0 {
			time.Sleep(s.delay)
		}
		s.processArticle(job, i, input)
	}

	s.mu.Lock()
	now := time.Now()
	job.CompletedAt = &now
	if job.Failed == job.Total {
		job.Status = "failed"
	} else {
		job.Status = "completed"
	}
	s.mu.Unlock()
}

func (s *BatchService) processArticle(job *BatchJob, index int, input BatchArticleInput) {
	ctx := context.Background()

	// Validate location exists
	var loc models.Location
	if err := s.db.First(&loc, "id = ?", input.LocationID).Error; err != nil {
		s.failArticle(job, index, "location not found")
		return
	}

	// Validate owner exists
	var profile models.Profile
	if err := s.db.First(&profile, "id = ?", input.OwnerID).Error; err != nil {
		s.failArticle(job, index, "owner not found")
		return
	}

	// Extract headline, falling back to input title
	headline := ExtractHeadline(input.Content)
	if headline == "" {
		headline = input.Title
	}

	now := time.Now()
	meta := models.SubmissionMeta{
		ArticleMarkdown: input.Content,
		Summary:         ExtractFirstParagraph(input.Content),
		Category:        input.Category,
		PublishedAt:     &now,
	}

	sub := models.Submission{
		OwnerID:    input.OwnerID,
		LocationID: input.LocationID,
		Title:      headline,
		Tags:       input.Tags,
		Status:     models.StatusPublished,
		Meta:       models.JSONB[models.SubmissionMeta]{V: meta},
	}

	if err := s.db.Create(&sub).Error; err != nil {
		s.failArticle(job, index, fmt.Sprintf("db create failed: %v", err))
		return
	}

	// Increment location article count
	s.db.Model(&models.Location{}).Where("id = ?", input.LocationID).
		Update("article_count", gorm.Expr("article_count + 1"))

	// Invalidate caches
	if s.cache != nil {
		s.cache.Delete(ctx, "articles:"+sub.ID.String())
		s.cache.DeletePattern(ctx, "articles:list:"+input.LocationID.String()+":*")
	}

	// Embed for semantic search (non-fatal)
	var chunks []Chunk
	if s.grouper != nil {
		sentences := SplitSentences(input.Content)
		if len(sentences) > 0 {
			grouped, err := s.grouper.Group(ctx, sentences, DefaultSemanticGrouperConfig())
			if err != nil {
				log.Printf("batch: semantic chunking failed for %s: %v", sub.ID, err)
			} else {
				chunks = grouped
			}
		}
	}
	if len(chunks) == 0 {
		chunks = s.chunker.ChunkMarkdown(input.Content, ChunkConfig{MaxTokens: 300})
	}
	if len(chunks) > 0 {
		if err := s.embedding.EmbedChunks(ctx, sub.ID, models.EntitySubmission, chunks); err != nil {
			log.Printf("batch: embedding failed for %s: %v", sub.ID, err)
		}
	}

	// Mark success
	s.mu.Lock()
	id := sub.ID
	job.Articles[index].SubmissionID = &id
	job.Articles[index].Status = "published"
	job.Processed++
	s.mu.Unlock()
}

func (s *BatchService) failArticle(job *BatchJob, index int, errMsg string) {
	s.mu.Lock()
	job.Articles[index].Status = "failed"
	job.Articles[index].Error = errMsg
	job.Processed++
	job.Failed++
	s.mu.Unlock()
}
