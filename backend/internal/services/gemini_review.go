// Gemini-backed article review service.
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

type GeminiReviewService struct {
	client *genai.Client
	model  string
}

func NewGeminiReviewService(client *genai.Client, model string) *GeminiReviewService {
	if model == "" {
		model = "gemini-2.5-flash"
	}
	return &GeminiReviewService{client: client, model: model}
}

func (s *GeminiReviewService) Review(ctx context.Context, input ReviewInput) (*models.ReviewResult, error) {
	userPrompt := buildReviewUserPrompt(input)

	resp, err := s.client.Models.GenerateContent(ctx, s.model,
		[]*genai.Content{{
			Role:  "user",
			Parts: []*genai.Part{genai.NewPartFromText(userPrompt)},
		}},
		&genai.GenerateContentConfig{
			SystemInstruction: &genai.Content{
				Parts: []*genai.Part{genai.NewPartFromText(prompts.ReviewSystem)},
			},
			Tools: []*genai.Tool{{
				GoogleSearch: &genai.GoogleSearch{},
			}},
			ThinkingConfig: &genai.ThinkingConfig{
				ThinkingLevel: genai.ThinkingLevelHigh,
			},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("gemini review: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("gemini review: empty response")
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
	result, parseErr := parseReviewJSON(raw)
	if parseErr != nil {
		// Retry once with explicit instruction
		retryResp, retryErr := s.client.Models.GenerateContent(ctx, s.model,
			[]*genai.Content{
				{Role: "user", Parts: []*genai.Part{genai.NewPartFromText(userPrompt)}},
				{Role: "model", Parts: []*genai.Part{genai.NewPartFromText(raw)}},
				{Role: "user", Parts: []*genai.Part{genai.NewPartFromText("Your previous response was not valid JSON. Output ONLY the JSON object, no other text.")}},
			},
			&genai.GenerateContentConfig{
				SystemInstruction: &genai.Content{
					Parts: []*genai.Part{genai.NewPartFromText(prompts.ReviewSystem)},
				},
			},
		)
		if retryErr == nil && len(retryResp.Candidates) > 0 && retryResp.Candidates[0].Content != nil && len(retryResp.Candidates[0].Content.Parts) > 0 {
			result, parseErr = parseReviewJSON(retryResp.Candidates[0].Content.Parts[0].Text)
		}
		if parseErr != nil {
			return fallbackReview(), nil
		}
	}

	if len(webSources) > 0 {
		result.WebSources = webSources
	}

	return result, nil
}

func buildReviewUserPrompt(input ReviewInput) string {
	var b strings.Builder

	b.WriteString("Article:\n")
	b.WriteString(input.ArticleMarkdown)

	if input.Transcript != "" {
		b.WriteString("\n\nSource transcript:\n")
		b.WriteString(input.Transcript)
	}
	if input.Notes != "" {
		b.WriteString("\n\nSource notes:\n")
		b.WriteString(input.Notes)
	}
	if len(input.PhotoDescriptions) > 0 {
		b.WriteString("\n\nPhoto descriptions:\n")
		b.WriteString(strings.Join(input.PhotoDescriptions, "\n"))
	}

	return b.String()
}

func parseReviewJSON(raw string) (*models.ReviewResult, error) {
	cleaned := stripCodeFences(raw)

	var result models.ReviewResult
	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
		// Try to extract JSON object from surrounding text
		if start := strings.Index(cleaned, "{"); start >= 0 {
			if end := strings.LastIndex(cleaned, "}"); end > start {
				if err2 := json.Unmarshal([]byte(cleaned[start:end+1]), &result); err2 != nil {
					return nil, fmt.Errorf("review JSON parse: %w (retry: %w)", err, err2)
				}
				return &result, nil
			}
		}
		return nil, fmt.Errorf("review JSON parse: %w", err)
	}

	return &result, nil
}

func fallbackReview() *models.ReviewResult {
	return &models.ReviewResult{
		Verification: []models.VerificationEntry{},
		Scores: models.QualityScores{
			Evidence:        0.5,
			Perspectives:    0.5,
			Representation:  0.5,
			EthicalFraming:  0.5,
			CulturalContext: 0.5,
			Manipulation:    0.5,
		},
		Gate:        "YELLOW",
		RedTriggers: []models.RedTrigger{},
		YellowFlags: []models.YellowFlag{
			{Dimension: "EVIDENCE", Description: "Review could not be completed automatically", Suggestion: "Please review this article manually before publishing"},
		},
		Coaching: models.Coaching{
			Celebration: "Thank you for your contribution.",
			Suggestions: []string{"The automatic review encountered an issue. A manual review is recommended before publishing."},
		},
	}
}
