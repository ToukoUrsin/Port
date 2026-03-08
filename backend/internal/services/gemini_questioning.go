// Gemini-backed questioning service for pre-generation clarification.
//
// Changes:
// - 2026-03-08: Initial implementation
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/localnews/backend/internal/services/prompts"
	"google.golang.org/genai"
)

type GeminiQuestioningService struct {
	client *genai.Client
	model  string
}

func NewGeminiQuestioningService(client *genai.Client, model string) *GeminiQuestioningService {
	if model == "" {
		model = "gemini-2.5-flash"
	}
	return &GeminiQuestioningService{client: client, model: model}
}

func (s *GeminiQuestioningService) Analyze(ctx context.Context, input QuestioningInput) (*QuestioningOutput, error) {
	userPrompt := buildQuestioningUserPrompt(input)

	resp, err := s.client.Models.GenerateContent(ctx, s.model,
		[]*genai.Content{{
			Role:  "user",
			Parts: []*genai.Part{genai.NewPartFromText(userPrompt)},
		}},
		&genai.GenerateContentConfig{
			SystemInstruction: &genai.Content{
				Parts: []*genai.Part{genai.NewPartFromText(prompts.QuestioningSystem)},
			},
			ThinkingConfig: &genai.ThinkingConfig{
				ThinkingLevel: genai.ThinkingLevelMedium,
			},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("gemini questioning: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("gemini questioning: empty response")
	}

	raw := resp.Candidates[0].Content.Parts[0].Text
	result, parseErr := parseQuestioningJSON(raw)
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
					Parts: []*genai.Part{genai.NewPartFromText(prompts.QuestioningSystem)},
				},
			},
		)
		if retryErr == nil && len(retryResp.Candidates) > 0 && retryResp.Candidates[0].Content != nil && len(retryResp.Candidates[0].Content.Parts) > 0 {
			result, parseErr = parseQuestioningJSON(retryResp.Candidates[0].Content.Parts[0].Text)
		}
		if parseErr != nil {
			// Fallback: return empty questions so pipeline continues without pause
			return &QuestioningOutput{Questions: []string{}}, nil
		}
	}

	return result, nil
}

func buildQuestioningUserPrompt(input QuestioningInput) string {
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
	if input.ResearchContext != "" {
		b.WriteString("Background research:\n")
		b.WriteString(input.ResearchContext)
		b.WriteString("\n\n")
	}
	if input.TownContext != "" {
		b.WriteString("Town context:\n")
		b.WriteString(input.TownContext)
	}

	return b.String()
}

func parseQuestioningJSON(raw string) (*QuestioningOutput, error) {
	cleaned := stripCodeFences(raw)

	var result QuestioningOutput
	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
		if start := strings.Index(cleaned, "{"); start >= 0 {
			if end := strings.LastIndex(cleaned, "}"); end > start {
				if err2 := json.Unmarshal([]byte(cleaned[start:end+1]), &result); err2 != nil {
					return nil, fmt.Errorf("questioning JSON parse: %w (retry: %w)", err, err2)
				}
				return &result, nil
			}
		}
		return nil, fmt.Errorf("questioning JSON parse: %w", err)
	}

	return &result, nil
}
