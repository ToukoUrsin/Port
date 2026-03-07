// Generation service for article creation.
//
// Plan: 1_what/article_engine/spec/build/PROMPTS_SPEC.md
//
// Changes:
// - 2026-03-07: Replace old GeneratedArticle/interface with GenerationInput/Output
package services

import (
	"context"
	"time"

	"github.com/localnews/backend/internal/models"
)

type GenerationInput struct {
	Transcript        string
	Notes             string
	PhotoDescriptions []string
	TownContext       string
	PreviousArticle   string // empty on first run
	Direction         string // empty on first run
}

type GenerationOutput struct {
	ArticleMarkdown string
	Metadata        models.ArticleMetadata
}

type GenerationService interface {
	Generate(ctx context.Context, input GenerationInput) (*GenerationOutput, error)
	ModelName() string
}

type StubGenerationService struct{}

func NewStubGenerationService() *StubGenerationService {
	return &StubGenerationService{}
}

func (s *StubGenerationService) ModelName() string { return "stub" }

func (s *StubGenerationService) Generate(ctx context.Context, input GenerationInput) (*GenerationOutput, error) {
	time.Sleep(3 * time.Second)

	return &GenerationOutput{
		ArticleMarkdown: "# City Council Debates $4.2M Budget\n\nThe Kirkkonummi city council convened Tuesday evening for a budget discussion that drew approximately 30 residents to the chamber.\n\n> \"Our children deserve better than this.\"\n> — Korhonen, council member\n\nThe budget's specific provisions were not immediately available. Council members' reasoning for their votes was not available at press time.\n\n![Residents at the council meeting](photo_1)",
		Metadata: models.ArticleMetadata{
			ChosenStructure: "news_report",
			Category:        "council",
			Confidence:      0.7,
			MissingContext:  []string{"What specifically does the budget cut?", "How did the other council members vote?"},
		},
	}, nil
}
