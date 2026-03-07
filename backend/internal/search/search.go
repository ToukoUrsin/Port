package search

import (
	"context"
	"fmt"

	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
	"gorm.io/gorm"
)

type Mode string

const (
	ModeKeyword  Mode = "keyword"
	ModeSemantic Mode = "semantic"
	ModeHybrid   Mode = "hybrid"

	MaxResults = 120 // 8 chunks × 15
)

type Params struct {
	Query      string
	Mode       Mode
	Type       string // "submissions", "profiles", or "" (both)
	LocationID string
	Limit      int
	Offset     int
}

type Result struct {
	Submissions []models.Submission `json:"submissions,omitempty"`
	Profiles    []models.Profile    `json:"profiles,omitempty"`
	Mode        string              `json:"mode"`
}

type Service struct {
	db        *gorm.DB
	embedding services.EmbeddingService
	reranker  services.RerankerService
}

func NewService(db *gorm.DB, emb services.EmbeddingService, rr services.RerankerService) *Service {
	return &Service{
		db:        db,
		embedding: emb,
		reranker:  rr,
	}
}

func (s *Service) Search(ctx context.Context, p Params) (*Result, error) {
	switch p.Mode {
	case ModeKeyword, "":
		return s.Keyword(ctx, p)
	case ModeSemantic:
		return s.Semantic(ctx, p)
	case ModeHybrid:
		return s.Hybrid(ctx, p)
	default:
		return nil, fmt.Errorf("unknown search mode: %s", p.Mode)
	}
}
