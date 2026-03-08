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

type GenerationOutput struct {
	ArticleMarkdown string
	Metadata        models.ArticleMetadata
}

type GenerationService interface {
	Generate(ctx context.Context, pctx *PipelineContext) (*GenerationOutput, error)
	ModelName() string
}

type StubGenerationService struct{}

func NewStubGenerationService() *StubGenerationService {
	return &StubGenerationService{}
}

func (s *StubGenerationService) ModelName() string { return "stub" }

func (s *StubGenerationService) Generate(ctx context.Context, pctx *PipelineContext) (*GenerationOutput, error) {
	time.Sleep(3 * time.Second)

	return &GenerationOutput{
		ArticleMarkdown: "# Community Meeting Draws Residents\n\n[Stub] A local community meeting drew residents to discuss matters of public interest.\n\n> \"We need to work together on this.\"\n> — Local resident\n\n[Stub] Details of the meeting's specific outcomes were not immediately available.\n\n![Residents at the meeting](photo_1)",
		Metadata: models.ArticleMetadata{
			ChosenStructure: "news_report",
			Category:        "community",
			Confidence:      0.5,
			MissingContext:  []string{"[Stub] Specific details not available in stub mode"},
		},
	}, nil
}
