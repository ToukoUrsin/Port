// Gemini-backed article generation service.
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

var generationTool = &genai.Tool{
	FunctionDeclarations: []*genai.FunctionDeclaration{{
		Name:        "submit_article",
		Description: "Submit the completed article with metadata",
		Parameters: &genai.Schema{
			Type: genai.TypeObject,
			Properties: map[string]*genai.Schema{
				"article_markdown":  {Type: genai.TypeString, Description: "The full article in markdown format"},
				"chosen_structure":  {Type: genai.TypeString, Enum: []string{"news_report", "feature", "photo_essay", "brief", "narrative", "hourglass"}},
				"category":          {Type: genai.TypeString, Enum: []string{"council", "schools", "business", "events", "sports", "community", "culture", "safety", "health", "environment"}},
				"confidence":        {Type: genai.TypeNumber, Description: "Confidence score 0.0-1.0"},
				"gap_annotations":   {Type: genai.TypeArray, Items: &genai.Schema{Type: genai.TypeString}, Description: "Factual gap annotations (not questions)"},
			},
			Required: []string{"article_markdown", "chosen_structure", "category", "confidence", "gap_annotations"},
		},
	}},
}

// generationFuncResult is the intermediate struct for unmarshaling the submit_article function call.
type generationFuncResult struct {
	ArticleMarkdown string   `json:"article_markdown"`
	ChosenStructure string   `json:"chosen_structure"`
	Category        string   `json:"category"`
	Confidence      float64  `json:"confidence"`
	GapAnnotations  []string `json:"gap_annotations"`
}

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

func (s *GeminiGenerationService) ModelName() string { return s.model }

func (s *GeminiGenerationService) Generate(ctx context.Context, pctx *PipelineContext) (*GenerationOutput, error) {
	userPrompt := buildGenerationUserPrompt(pctx)

	resp, err := s.client.Models.GenerateContent(ctx, s.model,
		[]*genai.Content{{
			Role:  "user",
			Parts: []*genai.Part{genai.NewPartFromText(userPrompt)},
		}},
		&genai.GenerateContentConfig{
			SystemInstruction: &genai.Content{
				Parts: []*genai.Part{genai.NewPartFromText(prompts.GenerationSystem)},
			},
			Tools: []*genai.Tool{generationTool},
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
		return nil, fmt.Errorf("gemini generation: %w", err)
	}

	_, args, fcErr := extractFunctionCall(resp)
	if fcErr != nil {
		// Fallback: try text extraction and old-style parsing
		text, textErr := extractText(resp)
		if textErr != nil {
			return nil, fmt.Errorf("gemini generation: no function call or text: %w", fcErr)
		}
		return parseGenerationOutput(text)
	}

	result, unmarshalErr := unmarshalFunctionArgs[generationFuncResult](args)
	if unmarshalErr != nil {
		return nil, fmt.Errorf("gemini generation: unmarshal function args: %w", unmarshalErr)
	}

	// Apply defaults
	if result.ChosenStructure == "" {
		result.ChosenStructure = "news_report"
	}
	if result.Category == "" {
		result.Category = "community"
	}
	if result.Confidence == 0 {
		result.Confidence = 0.5
	}

	return &GenerationOutput{
		ArticleMarkdown: strings.TrimSpace(result.ArticleMarkdown),
		Metadata: models.ArticleMetadata{
			ChosenStructure: result.ChosenStructure,
			Category:        result.Category,
			Confidence:      result.Confidence,
			MissingContext:  result.GapAnnotations,
		},
	}, nil
}

func buildGenerationUserPrompt(pctx *PipelineContext) string {
	var b strings.Builder

	if pctx.Transcript != "" {
		b.WriteString("Transcript: ")
		b.WriteString(pctx.Transcript)
		b.WriteString("\n\n")
	}
	if pctx.Notes != "" {
		b.WriteString("Notes: ")
		b.WriteString(pctx.Notes)
		b.WriteString("\n\n")
	}
	if len(pctx.PhotoDescriptions) > 0 {
		b.WriteString("Photo descriptions: ")
		b.WriteString(strings.Join(pctx.PhotoDescriptions, "\n"))
		b.WriteString("\n\n")
	}

	if pctx.ResearchContext != "" {
		b.WriteString("Background research (verified via web search — use where relevant, always attribute): ")
		b.WriteString(pctx.ResearchContext)
		b.WriteString("\n\n")
	}

	if pctx.ClarificationAnswers != "" {
		b.WriteString("Contributor clarifications (answers to follow-up questions — treat as primary source material):\n")
		b.WriteString(pctx.ClarificationAnswers)
		b.WriteString("\n\n")
	}

	if pctx.TownContext != "" {
		b.WriteString("Town context (background reference only — do NOT use to add geographic claims or details not in the source material): ")
		b.WriteString(pctx.TownContext)
	}

	if pctx.PreviousArticle != "" {
		b.WriteString("\n\nPrevious article:\n")
		b.WriteString(pctx.PreviousArticle)
		b.WriteString("\n\nThe contributor says: ")
		b.WriteString(pctx.Direction)
		b.WriteString("\n\nRegenerate the article incorporating the contributor's direction. Keep what works, change what they asked for. Do not lose information from the original sources.")
	}

	return b.String()
}

// parseGenerationOutput is the fallback parser for when function calling doesn't work.
// It splits on ---METADATA--- delimiter and parses JSON metadata.
func parseGenerationOutput(raw string) (*GenerationOutput, error) {
	article, metaJSON := splitMetadata(raw)

	var metadata models.ArticleMetadata
	if metaJSON != "" {
		cleaned := stripCodeFences(metaJSON)
		if err := json.Unmarshal([]byte(cleaned), &metadata); err != nil {
			if start := strings.Index(cleaned, "{"); start >= 0 {
				if end := strings.LastIndex(cleaned, "}"); end > start {
					_ = json.Unmarshal([]byte(cleaned[start:end+1]), &metadata)
				}
			}
		}
	}

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
	delimiters := []string{"---METADATA---", "--- METADATA ---", "---metadata---"}
	for _, d := range delimiters {
		if idx := strings.Index(raw, d); idx >= 0 {
			return raw[:idx], raw[idx+len(d):]
		}
	}
	if idx := strings.Index(raw, "## METADATA"); idx >= 0 {
		return raw[:idx], raw[idx+len("## METADATA"):]
	}
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
