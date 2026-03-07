// Gemini-backed article generation service.
//
// Plan: 1_what/article_engine/spec/build/PROMPTS_SPEC.md
//
// Changes:
// - 2026-03-07: Initial implementation
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services/prompts"
	"google.golang.org/genai"
)

type GeminiGenerationService struct {
	client *genai.Client
	model  string
}

func NewGeminiGenerationService(client *genai.Client, model string) *GeminiGenerationService {
	if model == "" {
		model = "gemini-2.5-flash"
	}
	return &GeminiGenerationService{client: client, model: model}
}

func (s *GeminiGenerationService) Generate(ctx context.Context, input GenerationInput) (*GenerationOutput, error) {
	userPrompt := buildGenerationUserPrompt(input)

	resp, err := s.client.Models.GenerateContent(ctx, s.model,
		[]*genai.Content{{
			Role:  "user",
			Parts: []*genai.Part{genai.NewPartFromText(userPrompt)},
		}},
		&genai.GenerateContentConfig{
			SystemInstruction: &genai.Content{
				Parts: []*genai.Part{genai.NewPartFromText(prompts.GenerationSystem)},
			},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("gemini generation: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("gemini generation: empty response")
	}

	raw := resp.Candidates[0].Content.Parts[0].Text
	return parseGenerationOutput(raw)
}

func buildGenerationUserPrompt(input GenerationInput) string {
	var b strings.Builder

	if input.Transcript != "" {
		b.WriteString("Transcript: ")
		b.WriteString(input.Transcript)
		b.WriteString("\n\n")
	}
	if input.Notes != "" {
		b.WriteString("Notes: ")
		b.WriteString(input.Notes)
		b.WriteString("\n\n")
	}
	if len(input.PhotoDescriptions) > 0 {
		b.WriteString("Photo descriptions: ")
		b.WriteString(strings.Join(input.PhotoDescriptions, "\n"))
		b.WriteString("\n\n")
	}

	tc := input.TownContext
	if tc == "" {
		tc = prompts.TownContext
	}
	b.WriteString("Town context: ")
	b.WriteString(tc)

	if input.PreviousArticle != "" {
		b.WriteString("\n\nPrevious article:\n")
		b.WriteString(input.PreviousArticle)
		b.WriteString("\n\nThe contributor says: ")
		b.WriteString(input.Direction)
		b.WriteString("\n\nRegenerate the article incorporating the contributor's direction. Keep what works, change what they asked for. Do not lose information from the original sources.")
	}

	return b.String()
}

func parseGenerationOutput(raw string) (*GenerationOutput, error) {
	article, metaJSON := splitMetadata(raw)

	var metadata models.ArticleMetadata
	if metaJSON != "" {
		cleaned := stripCodeFences(metaJSON)
		if err := json.Unmarshal([]byte(cleaned), &metadata); err != nil {
			// Fallback: try to extract first JSON object
			if start := strings.Index(cleaned, "{"); start >= 0 {
				if end := strings.LastIndex(cleaned, "}"); end > start {
					_ = json.Unmarshal([]byte(cleaned[start:end+1]), &metadata)
				}
			}
		}
	}

	// Apply defaults if parsing failed
	if metadata.ChosenStructure == "" {
		metadata.ChosenStructure = "news_report"
	}
	if metadata.Category == "" {
		metadata.Category = "community"
	}
	if metadata.Confidence == 0 {
		metadata.Confidence = 0.5
	}

	return &GenerationOutput{
		ArticleMarkdown: strings.TrimSpace(article),
		Metadata:        metadata,
	}, nil
}

func splitMetadata(raw string) (article string, metaJSON string) {
	// Try exact delimiter first
	delimiters := []string{"---METADATA---", "--- METADATA ---", "---metadata---"}
	for _, d := range delimiters {
		if idx := strings.Index(raw, d); idx >= 0 {
			return raw[:idx], raw[idx+len(d):]
		}
	}
	// Try markdown heading variant
	if idx := strings.Index(raw, "## METADATA"); idx >= 0 {
		return raw[:idx], raw[idx+len("## METADATA"):]
	}
	// No delimiter found — everything is article
	return raw, ""
}

func stripCodeFences(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```json") {
		s = strings.TrimPrefix(s, "```json")
	} else if strings.HasPrefix(s, "```") {
		s = strings.TrimPrefix(s, "```")
	}
	if strings.HasSuffix(s, "```") {
		s = strings.TrimSuffix(s, "```")
	}
	return strings.TrimSpace(s)
}
