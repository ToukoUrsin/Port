// Gemini-backed article review service.
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

var reviewTool = &genai.Tool{
	FunctionDeclarations: []*genai.FunctionDeclaration{{
		Name:        "submit_review",
		Description: "Submit the complete editorial review",
		Parameters: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"verification": {Type: genai.TypeArray, Items: &genai.Schema{
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"claim":    {Type: genai.TypeString},
						"evidence": {Type: genai.TypeString},
						"status":   {Type: genai.TypeString, Enum: []string{"SUPPORTED", "NOT_IN_SOURCE", "POSSIBLE_HALLUCINATION", "FABRICATED_QUOTE"}},
					},
					Required: []string{"claim", "evidence", "status"},
				}},
				"scores": {Type: genai.TypeObject, Properties: map[string]*genai.Schema{
					"evidence":        {Type: genai.TypeNumber},
					"perspectives":    {Type: genai.TypeNumber},
					"representation":  {Type: genai.TypeNumber},
					"ethical_framing":  {Type: genai.TypeNumber},
					"cultural_context": {Type: genai.TypeNumber},
					"manipulation":    {Type: genai.TypeNumber},
				}, Required: []string{"evidence", "perspectives", "representation", "ethical_framing", "cultural_context", "manipulation"}},
				"gate": {Type: genai.TypeString, Enum: []string{"GREEN", "YELLOW", "RED"}},
				"red_triggers": {Type: genai.TypeArray, Items: &genai.Schema{
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"dimension":   {Type: genai.TypeString},
						"trigger":     {Type: genai.TypeString},
						"paragraph":   {Type: genai.TypeInteger},
						"sentence":    {Type: genai.TypeString},
						"fix_options": {Type: genai.TypeArray, Items: &genai.Schema{Type: genai.TypeString}},
					},
					Required: []string{"dimension", "trigger", "paragraph", "sentence", "fix_options"},
				}},
				"yellow_flags": {Type: genai.TypeArray, Items: &genai.Schema{
					Type: genai.TypeObject,
					Properties: map[string]*genai.Schema{
						"dimension":   {Type: genai.TypeString},
						"description": {Type: genai.TypeString},
						"suggestion":  {Type: genai.TypeString},
					},
					Required: []string{"dimension", "description", "suggestion"},
				}},
				"coaching": {Type: genai.TypeObject, Properties: map[string]*genai.Schema{
					"celebration": {Type: genai.TypeString},
					"suggestions": {Type: genai.TypeArray, Items: &genai.Schema{Type: genai.TypeString}},
				}, Required: []string{"celebration", "suggestions"}},
			},
			Required: []string{"verification", "scores", "gate", "red_triggers", "yellow_flags", "coaching"},
		},
	}},
}

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

func (s *GeminiReviewService) Review(ctx context.Context, pctx *PipelineContext) (*models.ReviewResult, error) {
	result, err := s.reviewWithFunctionCall(ctx, pctx)
	if err != nil {
		log.Printf("review function calling failed, text parse fallback: %v", err)
		return s.reviewWithTextParse(ctx, pctx)
	}
	return result, nil
}

func (s *GeminiReviewService) reviewWithFunctionCall(ctx context.Context, pctx *PipelineContext) (*models.ReviewResult, error) {
	userPrompt := buildReviewUserPrompt(pctx)

	resp, err := s.client.Models.GenerateContent(ctx, s.model,
		[]*genai.Content{{
			Role:  "user",
			Parts: []*genai.Part{genai.NewPartFromText(userPrompt)},
		}},
		&genai.GenerateContentConfig{
			SystemInstruction: &genai.Content{
				Parts: []*genai.Part{genai.NewPartFromText(prompts.ReviewSystem)},
			},
			Tools: []*genai.Tool{
				{GoogleSearch: &genai.GoogleSearch{}},
				reviewTool,
			},
			ToolConfig: &genai.ToolConfig{
				FunctionCallingConfig: &genai.FunctionCallingConfig{
					Mode: genai.FunctionCallingConfigModeAny,
				},
			},
			ThinkingConfig: &genai.ThinkingConfig{
				ThinkingLevel: genai.ThinkingLevelHigh,
			},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("gemini review (function call): %w", err)
	}

	webSources := extractGroundingSources(resp)

	_, args, fcErr := extractFunctionCall(resp)
	if fcErr != nil {
		return nil, fmt.Errorf("no function call in review response: %w", fcErr)
	}

	result, unmarshalErr := unmarshalFunctionArgs[models.ReviewResult](args)
	if unmarshalErr != nil {
		return nil, fmt.Errorf("unmarshal review args: %w", unmarshalErr)
	}

	if len(webSources) > 0 {
		result.WebSources = webSources
	}

	return result, nil
}

func (s *GeminiReviewService) reviewWithTextParse(ctx context.Context, pctx *PipelineContext) (*models.ReviewResult, error) {
	userPrompt := buildReviewUserPrompt(pctx)

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
		return nil, fmt.Errorf("gemini review (text parse): %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("gemini review: empty response")
	}

	webSources := extractGroundingSources(resp)

	raw := resp.Candidates[0].Content.Parts[0].Text
	result, parseErr := parseReviewJSON(raw)
	if parseErr != nil {
		// Retry once
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

func buildReviewUserPrompt(pctx *PipelineContext) string {
	var b strings.Builder

	b.WriteString("Article:\n")
	b.WriteString(pctx.ArticleMarkdown)

	if pctx.Transcript != "" {
		b.WriteString("\n\nSource transcript:\n")
		b.WriteString(pctx.Transcript)
	}
	if pctx.Notes != "" {
		b.WriteString("\n\nSource notes:\n")
		b.WriteString(pctx.Notes)
	}
	if len(pctx.PhotoDescriptions) > 0 {
		b.WriteString("\n\nPhoto descriptions:\n")
		b.WriteString(strings.Join(pctx.PhotoDescriptions, "\n"))
	}

	// NEW: Research context
	if pctx.ResearchContext != "" {
		b.WriteString("\n\nBackground research (web-verified):\n")
		b.WriteString(pctx.ResearchContext)
	}

	// NEW: Questions already asked (prevent duplicates in coaching)
	if len(pctx.QuestionsAsked) > 0 {
		b.WriteString("\n\nQuestions already asked to contributor (DO NOT repeat in coaching):\n")
		for i, q := range pctx.QuestionsAsked {
			b.WriteString(fmt.Sprintf("%d. %s\n", i+1, q))
		}
	}

	// NEW: Contributor's answers
	if pctx.ClarificationAnswers != "" {
		b.WriteString("\n\nContributor's answers (treat as primary source material):\n")
		b.WriteString(pctx.ClarificationAnswers)
	}

	// NEW: Gap annotations from generation
	if len(pctx.Metadata.MissingContext) > 0 {
		b.WriteString("\n\nGap annotations from generation (still missing):\n")
		for _, gap := range pctx.Metadata.MissingContext {
			b.WriteString("- ")
			b.WriteString(gap)
			b.WriteString("\n")
		}
	}

	if pctx.Language != "" {
		b.WriteString("\n\nLanguage: Write coaching output in ")
		b.WriteString(pctx.Language)
		b.WriteString(".\n")
	}

	return b.String()
}

func parseReviewJSON(raw string) (*models.ReviewResult, error) {
	cleaned := stripCodeFences(raw)

	var result models.ReviewResult
	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
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
