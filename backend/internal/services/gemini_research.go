// Gemini-backed research service for pre-generation context gathering.
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"

	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services/prompts"
	"google.golang.org/genai"
)

var researchTool = &genai.Tool{
	FunctionDeclarations: []*genai.FunctionDeclaration{{
		Name:        "submit_research",
		Description: "Submit compiled research findings",
		Parameters: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"context": {Type: genai.TypeString, Description: "Multi-paragraph summary of research findings"},
				"sources": {Type: genai.TypeArray, Items: &genai.Schema{
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"title": {Type: genai.TypeString},
						"url":   {Type: genai.TypeString},
					},
					Required: []string{"title", "url"},
				}},
				"queries": {Type: genai.TypeArray, Items: &genai.Schema{Type: genai.TypeString}},
			},
			Required: []string{"context", "sources", "queries"},
		},
	}},
}

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

func (s *GeminiResearchService) Research(ctx context.Context, pctx *PipelineContext) (*models.ResearchResult, error) {
	result, err := s.researchWithFunctionCall(ctx, pctx)
	if err != nil {
		log.Printf("research function calling failed, text parse fallback: %v", err)
		return s.researchWithTextParse(ctx, pctx)
	}
	return result, nil
}

func (s *GeminiResearchService) researchWithFunctionCall(ctx context.Context, pctx *PipelineContext) (*models.ResearchResult, error) {
	userPrompt := buildResearchUserPrompt(pctx)

	resp, err := s.client.Models.GenerateContent(ctx, s.model,
		[]*genai.Content{{
			Role:  "user",
			Parts: []*genai.Part{genai.NewPartFromText(userPrompt)},
		}},
		&genai.GenerateContentConfig{
			SystemInstruction: &genai.Content{
				Parts: []*genai.Part{genai.NewPartFromText(prompts.ResearchSystem)},
			},
			Tools: []*genai.Tool{
				{GoogleSearch: &genai.GoogleSearch{}},
				researchTool,
			},
			ToolConfig: &genai.ToolConfig{
				FunctionCallingConfig: &genai.FunctionCallingConfig{
					Mode: genai.FunctionCallingConfigModeAny,
				},
			},
			ThinkingConfig: &genai.ThinkingConfig{
				ThinkingLevel: genai.ThinkingLevelMedium,
			},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("gemini research (function call): %w", err)
	}

	// Extract grounding sources from GoogleSearch
	webSources := extractGroundingSources(resp)

	_, args, fcErr := extractFunctionCall(resp)
	if fcErr != nil {
		return nil, fmt.Errorf("no function call in research response: %w", fcErr)
	}

	result, unmarshalErr := unmarshalFunctionArgs[models.ResearchResult](args)
	if unmarshalErr != nil {
		return nil, fmt.Errorf("unmarshal research args: %w", unmarshalErr)
	}

	// Merge grounding sources not already in parsed result
	mergeWebSources(result, webSources)

	return result, nil
}

func (s *GeminiResearchService) researchWithTextParse(ctx context.Context, pctx *PipelineContext) (*models.ResearchResult, error) {
	userPrompt := buildResearchUserPrompt(pctx)

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
		return nil, fmt.Errorf("gemini research (text parse): %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("gemini research: empty response")
	}

	webSources := extractGroundingSources(resp)

	raw := resp.Candidates[0].Content.Parts[0].Text
	result, parseErr := parseResearchJSON(raw)
	if parseErr != nil {
		// Fallback: use raw text as context
		return &models.ResearchResult{
			Context: raw,
			Sources: webSources,
			Queries: []string{},
		}, nil
	}

	mergeWebSources(result, webSources)
	return result, nil
}

// mergeWebSources adds grounding sources not already present in the result.
func mergeWebSources(result *models.ResearchResult, webSources []models.WebSource) {
	if len(webSources) == 0 {
		return
	}
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

func buildResearchUserPrompt(pctx *PipelineContext) string {
	var b strings.Builder

	if pctx.Transcript != "" {
		b.WriteString("Transcript:\n")
		b.WriteString(pctx.Transcript)
		b.WriteString("\n\n")
	}
	if pctx.Notes != "" {
		b.WriteString("Notes:\n")
		b.WriteString(pctx.Notes)
		b.WriteString("\n\n")
	}
	if len(pctx.PhotoDescriptions) > 0 {
		b.WriteString("Photo descriptions:\n")
		b.WriteString(strings.Join(pctx.PhotoDescriptions, "\n"))
		b.WriteString("\n\n")
	}
	if pctx.TownContext != "" {
		b.WriteString("Town context:\n")
		b.WriteString(pctx.TownContext)
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
