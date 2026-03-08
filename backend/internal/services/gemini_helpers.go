// Gemini function-calling helpers for structured output extraction.
package services

import (
	"encoding/json"
	"fmt"

	"github.com/localnews/backend/internal/models"
	"google.golang.org/genai"
)

// extractFunctionCall finds the first FunctionCall part in a Gemini response.
func extractFunctionCall(resp *genai.GenerateContentResponse) (string, map[string]any, error) {
	if resp == nil || len(resp.Candidates) == 0 {
		return "", nil, fmt.Errorf("empty response")
	}
	cand := resp.Candidates[0]
	if cand.Content == nil {
		return "", nil, fmt.Errorf("no content in response")
	}
	for _, part := range cand.Content.Parts {
		if part.FunctionCall != nil {
			return part.FunctionCall.Name, part.FunctionCall.Args, nil
		}
	}
	return "", nil, fmt.Errorf("no function call in response")
}

// unmarshalFunctionArgs converts a FunctionCall.Args map to a typed struct via JSON round-trip.
func unmarshalFunctionArgs[T any](args map[string]any) (*T, error) {
	data, err := json.Marshal(args)
	if err != nil {
		return nil, fmt.Errorf("marshal args: %w", err)
	}
	var result T
	if err := json.Unmarshal(data, &result); err != nil {
		return nil, fmt.Errorf("unmarshal args: %w", err)
	}
	return &result, nil
}

// extractGroundingSources extracts web sources from Gemini grounding metadata.
func extractGroundingSources(resp *genai.GenerateContentResponse) []models.WebSource {
	if resp == nil || len(resp.Candidates) == 0 {
		return nil
	}
	gm := resp.Candidates[0].GroundingMetadata
	if gm == nil {
		return nil
	}
	var sources []models.WebSource
	for _, chunk := range gm.GroundingChunks {
		if chunk.Web != nil {
			sources = append(sources, models.WebSource{
				Title: chunk.Web.Title,
				URL:   chunk.Web.URI,
			})
		}
	}
	return sources
}

// extractText gets the first text part from a Gemini response (for fallback parsing).
func extractText(resp *genai.GenerateContentResponse) (string, error) {
	if resp == nil || len(resp.Candidates) == 0 {
		return "", fmt.Errorf("empty response")
	}
	cand := resp.Candidates[0]
	if cand.Content == nil {
		return "", fmt.Errorf("no content in response")
	}
	for _, part := range cand.Content.Parts {
		if part.Text != "" {
			return part.Text, nil
		}
	}
	return "", fmt.Errorf("no text part in response")
}
