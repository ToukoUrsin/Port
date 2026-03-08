// Review service for article quality assessment.
//
// Plan: 1_what/article_engine/spec/build/PROMPTS_SPEC.md
//
// Changes:
// - 2026-03-07: Replace old interface with ReviewInput, return new ReviewResult
package services

import (
	"context"
	"time"

	"github.com/localnews/backend/internal/models"
)

type ReviewService interface {
	Review(ctx context.Context, pctx *PipelineContext) (*models.ReviewResult, error)
}

type StubReviewService struct{}

func NewStubReviewService() *StubReviewService {
	return &StubReviewService{}
}

func (s *StubReviewService) Review(ctx context.Context, pctx *PipelineContext) (*models.ReviewResult, error) {
	time.Sleep(2 * time.Second)
	return &models.ReviewResult{
		Verification: []models.VerificationEntry{
			{Claim: "[Stub] community meeting held", Evidence: "[Stub] contributor mentioned meeting", Status: "SUPPORTED"},
		},
		Scores: models.QualityScores{
			Evidence:        0.75,
			Perspectives:    0.5,
			Representation:  0.6,
			EthicalFraming:  0.9,
			CulturalContext: 0.8,
			Manipulation:    0.95,
		},
		Gate:        "GREEN",
		RedTriggers: []models.RedTrigger{},
		YellowFlags: []models.YellowFlag{
			{Dimension: "PERSPECTIVES", Description: "[Stub] Only one side of the discussion is represented", Suggestion: "[Stub] Did anyone speak with a different viewpoint?"},
		},
		Coaching: models.Coaching{
			Celebration: "[Stub] Good contribution with clear firsthand account.",
			Suggestions: []string{"[Stub] Consider adding more specific details about what was discussed."},
		},
	}, nil
}
