package services

import (
	"context"

	"github.com/google/uuid"
)

type EmbeddingService interface {
	EmbedChunks(ctx context.Context, entityID uuid.UUID, category int16, chunks []Chunk) error
}

type NoOpEmbeddingService struct{}

func NewNoOpEmbeddingService() *NoOpEmbeddingService {
	return &NoOpEmbeddingService{}
}

func (s *NoOpEmbeddingService) EmbedChunks(ctx context.Context, entityID uuid.UUID, category int16, chunks []Chunk) error {
	// No-op: embedding is handled by a teammate's implementation
	return nil
}
