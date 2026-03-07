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

type ReviewInput struct {
	ArticleMarkdown   string
	Transcript        string
	Notes             string
	PhotoDescriptions []string
}

type ReviewService interface {
	Review(ctx context.Context, input ReviewInput) (*models.ReviewResult, error)
}

type StubReviewService struct{}

func NewStubReviewService() *StubReviewService {
	return &StubReviewService{}
}

func (s *StubReviewService) Review(ctx context.Context, input ReviewInput) (*models.ReviewResult, error) {
	time.Sleep(2 * time.Second)
	return &models.ReviewResult{
		Verification: []models.VerificationEntry{
			{Claim: "council convened Tuesday evening", Evidence: "contributor mentioned council meeting", Status: "SUPPORTED"},
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
			{Dimension: "PERSPECTIVES", Description: "Only one side of the budget debate is represented", Suggestion: "Did anyone speak in favor of the budget?"},
		},
		Coaching: models.Coaching{
			Celebration: "The quote from Korhonen really captures the tension of the vote. Strong opening that leads with the news.",
			Suggestions: []string{"Do you know what the budget specifically cuts?"},
		},
	}, nil
}
