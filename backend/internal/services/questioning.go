// Questioning service for pre-generation clarification questions.
//
// Changes:
// - 2026-03-08: Initial implementation
package services

import (
	"context"
	"time"
)

type QuestioningOutput struct {
	Questions []string `json:"questions"`
}

type QuestioningService interface {
	Analyze(ctx context.Context, pctx *PipelineContext) (*QuestioningOutput, error)
}

// StubQuestioningService returns 2 mock questions after 1s delay.
type StubQuestioningService struct{}

func NewStubQuestioningService() *StubQuestioningService {
	return &StubQuestioningService{}
}

func (s *StubQuestioningService) Analyze(ctx context.Context, pctx *PipelineContext) (*QuestioningOutput, error) {
	time.Sleep(1 * time.Second)
	return &QuestioningOutput{
		Questions: []string{
			"[Stub] Can you estimate how many people were present?",
			"[Stub] Did anyone else comment or react to what happened?",
		},
	}, nil
}
