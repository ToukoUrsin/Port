package services

import (
	"context"
	"time"

	"github.com/localnews/backend/internal/models"
)

type ReviewService interface {
	Review(ctx context.Context, article *GeneratedArticle, transcript, notes string) (*models.ReviewResult, error)
}

type StubReviewService struct{}

func NewStubReviewService() *StubReviewService {
	return &StubReviewService{}
}

func (s *StubReviewService) Review(ctx context.Context, article *GeneratedArticle, transcript, notes string) (*models.ReviewResult, error) {
	time.Sleep(2 * time.Second)
	return &models.ReviewResult{
		Score: 82,
		Flags: []models.ReviewFlag{
			{
				Type:       "missing_context",
				Text:       "The article mentions 'construction could begin as early as spring' but this timeline is not mentioned in the source transcript.",
				Suggestion: "Remove the spring timeline or attribute it to a specific source if available.",
			},
		},
		Approved: true,
	}, nil
}
