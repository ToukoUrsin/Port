// Gemini-backed questioning service for pre-generation clarification.
package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/localnews/backend/internal/services/prompts"
	"google.golang.org/genai"
)

var questioningTool = &genai.Tool{
	FunctionDeclarations: []*genai.FunctionDeclaration{{
		Name:        "submit_questions",
		Description: "Submit clarification questions for the contributor",
		Parameters: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"questions": {Type: genai.TypeArray, Items: &genai.Schema{Type: genai.TypeString}, Description: "List of clarification questions"},
			},
			Required: []string{"questions"},
		},
	}},
}

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

func (s *GeminiQuestioningService) Analyze(ctx context.Context, pctx *PipelineContext) (*QuestioningOutput, error) {
	userPrompt := buildQuestioningUserPrompt(pctx)

	resp, err := s.client.Models.GenerateContent(ctx, s.model,
		[]*genai.Content{{
			Role:  "user",
			Parts: []*genai.Part{genai.NewPartFromText(userPrompt)},
		}},
		&genai.GenerateContentConfig{
			SystemInstruction: &genai.Content{
				Parts: []*genai.Part{genai.NewPartFromText(prompts.QuestioningSystem)},
			},
			Tools: []*genai.Tool{questioningTool},
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
		return nil, fmt.Errorf("gemini questioning: %w", err)
	}

	_, args, fcErr := extractFunctionCall(resp)
	if fcErr != nil {
		// Fallback: return empty questions so pipeline continues
		return &QuestioningOutput{Questions: []string{}}, nil
	}

	result, unmarshalErr := unmarshalFunctionArgs[QuestioningOutput](args)
	if unmarshalErr != nil {
		return &QuestioningOutput{Questions: []string{}}, nil
	}

	return result, nil
}

func buildQuestioningUserPrompt(pctx *PipelineContext) string {
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
	if pctx.ResearchContext != "" {
		b.WriteString("Background research:\n")
		b.WriteString(pctx.ResearchContext)
		b.WriteString("\n\n")
	}
	if pctx.TownContext != "" {
		b.WriteString("Town context:\n")
		b.WriteString(pctx.TownContext)
	}

	return b.String()
}
