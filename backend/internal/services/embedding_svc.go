package services

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/pgvector/pgvector-go"
)

type EmbeddingService interface {
	EmbedChunks(ctx context.Context, entityID uuid.UUID, category int16, chunks []Chunk) error
	EmbedQuery(ctx context.Context, query string) (pgvector.Vector, error)
	EmbedTexts(ctx context.Context, texts []string) ([][]float32, error)
}

type NoOpEmbeddingService struct{}

func NewNoOpEmbeddingService() *NoOpEmbeddingService {
	return &NoOpEmbeddingService{}
}

func (s *NoOpEmbeddingService) EmbedChunks(ctx context.Context, entityID uuid.UUID, category int16, chunks []Chunk) error {
	return nil
}

func (s *NoOpEmbeddingService) EmbedQuery(ctx context.Context, query string) (pgvector.Vector, error) {
	return pgvector.Vector{}, fmt.Errorf("embedding service not configured: set GEMINI_API_KEY")
}

func (s *NoOpEmbeddingService) EmbedTexts(ctx context.Context, texts []string) ([][]float32, error) {
	return nil, fmt.Errorf("embedding service not configured: set GEMINI_API_KEY")
}
