// Research service for pre-generation context gathering.
//
// Plan: N/A
//
// Changes:
// - 2026-03-07: Initial implementation
package services

import (
	"context"
	"time"

	"github.com/localnews/backend/internal/models"
)

type ResearchService interface {
	Research(ctx context.Context, pctx *PipelineContext) (*models.ResearchResult, error)
}

type StubResearchService struct{}

func NewStubResearchService() *StubResearchService {
	return &StubResearchService{}
}

func (s *StubResearchService) Research(ctx context.Context, pctx *PipelineContext) (*models.ResearchResult, error) {
	time.Sleep(1 * time.Second)
	return &models.ResearchResult{
		Context: "",
		Sources: []models.WebSource{},
		Queries: []string{},
	}, nil
}
