// Photo description service for Gemini Vision.
//
// Plan: 1_what/article_engine/spec/build/PROMPTS_SPEC.md
//
// Changes:
// - 2026-03-07: Initial implementation (stub)
package services

import (
	"context"
)

type PhotoDescriptionService interface {
	Describe(ctx context.Context, photoPath string) (string, error)
}

type StubPhotoDescriptionService struct{}

func NewStubPhotoDescriptionService() *StubPhotoDescriptionService {
	return &StubPhotoDescriptionService{}
}

func (s *StubPhotoDescriptionService) Describe(ctx context.Context, photoPath string) (string, error) {
	return "A photo showing a local scene in Kirkkonummi. Several people are visible in an indoor setting.", nil
}
