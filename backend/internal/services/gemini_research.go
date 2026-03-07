// Gemini-backed research service for pre-generation context gathering.
//
// Plan: N/A
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

type GeminiResearchService struct {
	client *genai.Client
	model  string
}

func NewGeminiResearchService(client *genai.Client, model string) *GeminiResearchService {
	if model == "" {
		model = "gemini-2.5-flash"
	}
	return &GeminiResearchService{client: client, model: model}
}

func (s *GeminiResearchService) Research(ctx context.Context, input ResearchInput) (*models.ResearchResult, error) {
	userPrompt := buildResearchUserPrompt(input)

	resp, err := s.client.Models.GenerateContent(ctx, s.model,
		[]*genai.Content{{
			Role:  "user",
			Parts: []*genai.Part{genai.NewPartFromText(userPrompt)},
		}},
		&genai.GenerateContentConfig{
			SystemInstruction: &genai.Content{
				Parts: []*genai.Part{genai.NewPartFromText(prompts.ResearchSystem)},
			},
			Tools: []*genai.Tool{{
				GoogleSearch: &genai.GoogleSearch{},
			}},
			ThinkingConfig: &genai.ThinkingConfig{
				ThinkingLevel: genai.ThinkingLevelMedium,
			},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("gemini research: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("gemini research: empty response")
	}

	// Extract web sources from grounding metadata
	var webSources []models.WebSource
	if resp.Candidates[0].GroundingMetadata != nil {
		for _, chunk := range resp.Candidates[0].GroundingMetadata.GroundingChunks {
			if chunk.Web != nil {
				webSources = append(webSources, models.WebSource{
					Title: chunk.Web.Title,
					URL:   chunk.Web.URI,
				})
			}
		}
	}

	raw := resp.Candidates[0].Content.Parts[0].Text
	result, parseErr := parseResearchJSON(raw)
	if parseErr != nil {
		// Retry once with explicit JSON instruction
		retryResp, retryErr := s.client.Models.GenerateContent(ctx, s.model,
			[]*genai.Content{
				{Role: "user", Parts: []*genai.Part{genai.NewPartFromText(userPrompt)}},
				{Role: "model", Parts: []*genai.Part{genai.NewPartFromText(raw)}},
				{Role: "user", Parts: []*genai.Part{genai.NewPartFromText("Your previous response was not valid JSON. Output ONLY the JSON object, no other text.")}},
			},
			&genai.GenerateContentConfig{
				SystemInstruction: &genai.Content{
					Parts: []*genai.Part{genai.NewPartFromText(prompts.ResearchSystem)},
				},
			},
		)
		if retryErr == nil && len(retryResp.Candidates) > 0 && retryResp.Candidates[0].Content != nil && len(retryResp.Candidates[0].Content.Parts) > 0 {
			result, parseErr = parseResearchJSON(retryResp.Candidates[0].Content.Parts[0].Text)
		}
		if parseErr != nil {
			// Fallback: use raw text as context rather than failing
			return &models.ResearchResult{
				Context: raw,
				Sources: webSources,
				Queries: []string{},
			}, nil
		}
	}

	// Merge grounding sources not already in parsed result
	if len(webSources) > 0 {
		existing := make(map[string]bool)
		for _, src := range result.Sources {
			existing[src.URL] = true
		}
		for _, ws := range webSources {
			if !existing[ws.URL] {
				result.Sources = append(result.Sources, ws)
			}
		}
	}

	return result, nil
}

func buildResearchUserPrompt(input ResearchInput) string {
	var b strings.Builder

	if input.Transcript != "" {
		b.WriteString("Transcript:\n")
		b.WriteString(input.Transcript)
		b.WriteString("\n\n")
	}
	if input.Notes != "" {
		b.WriteString("Notes:\n")
		b.WriteString(input.Notes)
		b.WriteString("\n\n")
	}
	if len(input.PhotoDescriptions) > 0 {
		b.WriteString("Photo descriptions:\n")
		b.WriteString(strings.Join(input.PhotoDescriptions, "\n"))
		b.WriteString("\n\n")
	}
	if input.TownContext != "" {
		b.WriteString("Town context:\n")
		b.WriteString(input.TownContext)
	}

	return b.String()
}

func parseResearchJSON(raw string) (*models.ResearchResult, error) {
	cleaned := stripCodeFences(raw)

	var result models.ResearchResult
	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
		if start := strings.Index(cleaned, "{"); start >= 0 {
			if end := strings.LastIndex(cleaned, "}"); end > start {
				if err2 := json.Unmarshal([]byte(cleaned[start:end+1]), &result); err2 != nil {
					return nil, fmt.Errorf("research JSON parse: %w (retry: %w)", err, err2)
				}
				return &result, nil
			}
		}
		return nil, fmt.Errorf("research JSON parse: %w", err)
	}

	return &result, nil
}
