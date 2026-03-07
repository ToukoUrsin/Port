package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/pgvector/pgvector-go"
	"google.golang.org/genai"
	"gorm.io/gorm"
)

type GeminiEmbeddingService struct {
	db         *gorm.DB
	client     *genai.Client
	model      string
	dimensions int
}

func NewGeminiEmbeddingService(db *gorm.DB, client *genai.Client, model string, dimensions int) *GeminiEmbeddingService {
	return &GeminiEmbeddingService{
		db:         db,
		client:     client,
		model:      model,
		dimensions: dimensions,
	}
}

func (s *GeminiEmbeddingService) EmbedChunks(ctx context.Context, entityID uuid.UUID, category int16, chunks []Chunk) error {
	if len(chunks) == 0 {
		return nil
	}

	// Fetch all embeddings from Gemini before touching the DB
	const batchSize = 100
	type batchResult struct {
		embeddings []models.Embedding
	}
	var allResults []batchResult

	for i := 0; i < len(chunks); i += batchSize {
		end := i + batchSize
		if end > len(chunks) {
			end = len(chunks)
		}
		batch := chunks[i:end]

		contents := make([]*genai.Content, len(batch))
		for j, chunk := range batch {
			contents[j] = genai.NewContentFromText(chunk.Text, "user")
		}

		result, err := s.client.Models.EmbedContent(ctx, s.model, contents, &genai.EmbedContentConfig{
			TaskType:             "RETRIEVAL_DOCUMENT",
			OutputDimensionality: int32Ptr(int32(s.dimensions)),
		})
		if err != nil {
			return fmt.Errorf("gemini embed batch %d: %w", i/batchSize, err)
		}

		embeddings := make([]models.Embedding, len(result.Embeddings))
		for j, emb := range result.Embeddings {
			vec := make([]float32, len(emb.Values))
			for k, v := range emb.Values {
				vec[k] = v
			}
			embeddings[j] = models.Embedding{
				EntityID:       entityID,
				EntityCategory: category,
				ChunkIndex:     int16(batch[j].Index),
				ChunkText:      batch[j].Text,
				Vector:         pgvector.NewVector(vec),
			}
		}

		allResults = append(allResults, batchResult{embeddings: embeddings})
	}

	// Delete old + insert new in a single transaction
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("entity_id = ? AND entity_category = ?", entityID, category).
			Delete(&models.Embedding{}).Error; err != nil {
			return fmt.Errorf("delete old embeddings: %w", err)
		}
		for i, br := range allResults {
			if err := tx.Create(&br.embeddings).Error; err != nil {
				return fmt.Errorf("insert embeddings batch %d: %w", i, err)
			}
		}
		return nil
	})
}

func (s *GeminiEmbeddingService) EmbedQuery(ctx context.Context, query string) (pgvector.Vector, error) {
	contents := []*genai.Content{genai.NewContentFromText(query, "user")}

	result, err := s.client.Models.EmbedContent(ctx, s.model, contents, &genai.EmbedContentConfig{
		TaskType:        "RETRIEVAL_QUERY",
		OutputDimensionality: int32Ptr(int32(s.dimensions)),
	})
	if err != nil {
		return pgvector.Vector{}, fmt.Errorf("gemini embed query: %w", err)
	}

	if len(result.Embeddings) == 0 {
		return pgvector.Vector{}, fmt.Errorf("gemini returned no embeddings")
	}

	vec := make([]float32, len(result.Embeddings[0].Values))
	for i, v := range result.Embeddings[0].Values {
		vec[i] = v
	}

	return pgvector.NewVector(vec), nil
}

func (s *GeminiEmbeddingService) EmbedTexts(ctx context.Context, texts []string) ([][]float32, error) {
	if len(texts) == 0 {
		return nil, nil
	}

	const batchSize = 100
	result := make([][]float32, 0, len(texts))

	for i := 0; i < len(texts); i += batchSize {
		end := i + batchSize
		if end > len(texts) {
			end = len(texts)
		}
		batch := texts[i:end]

		contents := make([]*genai.Content, len(batch))
		for j, text := range batch {
			contents[j] = genai.NewContentFromText(text, "user")
		}

		resp, err := s.client.Models.EmbedContent(ctx, s.model, contents, &genai.EmbedContentConfig{
			TaskType:             "CLUSTERING",
			OutputDimensionality: int32Ptr(int32(s.dimensions)),
		})
		if err != nil {
			return nil, fmt.Errorf("gemini embed texts batch %d: %w", i/batchSize, err)
		}

		for _, emb := range resp.Embeddings {
			vec := make([]float32, len(emb.Values))
			for k, v := range emb.Values {
				vec[k] = v
			}
			result = append(result, vec)
		}
	}

	return result, nil
}

func int32Ptr(v int32) *int32 { return &v }
