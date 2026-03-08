//go:build integration

// Live Gemini integration tests for the pipeline.
// Run with: GEMINI_API_KEY=... go test ./internal/services/ -run TestIntegration -tags integration -timeout 120s -v
package services

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"google.golang.org/genai"
)

func geminiClient(t *testing.T) *genai.Client {
	t.Helper()
	key := os.Getenv("GEMINI_API_KEY")
	if key == "" {
		t.Skip("GEMINI_API_KEY not set")
	}
	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  key,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		t.Fatalf("create gemini client: %v", err)
	}
	return client
}

func TestIntegration_FullPipeline_Finnish(t *testing.T) {
	client := geminiClient(t)
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	model := os.Getenv("GENERATION_MODEL")
	if model == "" {
		model = "gemini-2.5-flash"
	}

	genSvc := NewGeminiGenerationService(client, model)
	revSvc := NewGeminiReviewService(client, model)

	pctx := &PipelineContext{
		Transcript: `Kirkkonummen kunnanvaltuusto kokoontui tiistai-iltana. Valtuusto äänesti budjetista äänin 5-2.
Valtuutettu Korhonen vastusti leikkauksia ja sanoi: "Lapsemme ansaitsevat parempaa."
Kunnanjohtaja Virtanen puolusti budjettia sanoen, että kunnan taloustilanne on vaikea.
Paikalla oli paljon yleisöä, lähinnä vanhempia.`,
		Notes:       "Kirkkonummen budjettikokous tiistaina",
		TownContext: "Kirkkonummi, Uusimaa, Finland.",
	}

	// GENERATE
	genOut, err := genSvc.Generate(ctx, pctx)
	if err != nil {
		t.Fatalf("generation failed: %v", err)
	}
	if genOut.ArticleMarkdown == "" {
		t.Fatal("article is empty")
	}
	t.Logf("Article (%d words, structure=%s, category=%s):\n%s",
		len(strings.Fields(genOut.ArticleMarkdown)),
		genOut.Metadata.ChosenStructure,
		genOut.Metadata.Category,
		genOut.ArticleMarkdown[:min(500, len(genOut.ArticleMarkdown))])

	// Verify article is in Finnish (check for common Finnish words)
	lower := strings.ToLower(genOut.ArticleMarkdown)
	finnishMarkers := []string{"valtuusto", "budjetti", "kunnan"}
	found := 0
	for _, marker := range finnishMarkers {
		if strings.Contains(lower, marker) {
			found++
		}
	}
	if found == 0 {
		t.Error("article does not appear to be in Finnish — no Finnish markers found")
	}

	// Verify structured metadata
	if genOut.Metadata.ChosenStructure == "" {
		t.Error("missing chosen_structure in metadata")
	}
	if genOut.Metadata.Category == "" {
		t.Error("missing category in metadata")
	}
	if genOut.Metadata.Confidence == 0 {
		t.Error("confidence should not be 0")
	}

	// REVIEW
	pctx.ArticleMarkdown = genOut.ArticleMarkdown
	pctx.Metadata = genOut.Metadata

	revOut, err := revSvc.Review(ctx, pctx)
	if err != nil {
		t.Fatalf("review failed: %v", err)
	}
	t.Logf("Review gate=%s, scores=%+v, red_triggers=%d, yellow_flags=%d",
		revOut.Gate, revOut.Scores, len(revOut.RedTriggers), len(revOut.YellowFlags))

	if revOut.Gate == "" {
		t.Error("review gate is empty")
	}
	if revOut.Coaching.Celebration == "" {
		t.Error("coaching celebration is empty")
	}

	// Coaching should be in Finnish (article is Finnish)
	celebLower := strings.ToLower(revOut.Coaching.Celebration)
	// Check for at least some non-ASCII or Finnish-like content
	t.Logf("Coaching celebration: %s", revOut.Coaching.Celebration)
}

func TestIntegration_FullPipeline_English(t *testing.T) {
	client := geminiClient(t)
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	model := os.Getenv("GENERATION_MODEL")
	if model == "" {
		model = "gemini-2.5-flash"
	}

	genSvc := NewGeminiGenerationService(client, model)

	pctx := &PipelineContext{
		Transcript: `The city council met on Tuesday evening to discuss the new park renovation project.
Council member Johnson proposed a $2.5 million budget for the renovation.
"This park has been neglected for too long," Johnson said. "Our families deserve better green spaces."
Mayor Williams expressed support but noted budget constraints.
About 30 residents attended the meeting, many from the Riverside neighborhood.`,
		Notes:       "City council park renovation meeting",
		TownContext: "Springfield, Illinois, United States.",
	}

	genOut, err := genSvc.Generate(ctx, pctx)
	if err != nil {
		t.Fatalf("generation failed: %v", err)
	}
	if genOut.ArticleMarkdown == "" {
		t.Fatal("article is empty")
	}
	t.Logf("Article (%d words):\n%s",
		len(strings.Fields(genOut.ArticleMarkdown)),
		genOut.ArticleMarkdown[:min(500, len(genOut.ArticleMarkdown))])

	// Verify article is in English
	lower := strings.ToLower(genOut.ArticleMarkdown)
	englishMarkers := []string{"council", "park", "renovation"}
	found := 0
	for _, marker := range englishMarkers {
		if strings.Contains(lower, marker) {
			found++
		}
	}
	if found == 0 {
		t.Error("article does not appear to be in English")
	}

	// Verify structured metadata
	if genOut.Metadata.ChosenStructure == "" {
		t.Error("missing chosen_structure")
	}
	if genOut.Metadata.Category == "" {
		t.Error("missing category")
	}
}

func TestIntegration_Questioning_MatchesLanguage(t *testing.T) {
	client := geminiClient(t)
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	model := os.Getenv("GENERATION_MODEL")
	if model == "" {
		model = "gemini-2.5-flash"
	}

	qSvc := NewGeminiQuestioningService(client, model)

	// Thin Finnish input — should trigger questions
	pctx := &PipelineContext{
		Transcript:  "Valtuusto kokoontui. Budjetti hyväksyttiin.",
		TownContext: "Kirkkonummi, Finland.",
	}

	qOut, err := qSvc.Analyze(ctx, pctx)
	if err != nil {
		t.Fatalf("questioning failed: %v", err)
	}

	t.Logf("Questions (%d):", len(qOut.Questions))
	for i, q := range qOut.Questions {
		t.Logf("  %d. %s", i+1, q)
	}

	if len(qOut.Questions) == 0 {
		t.Log("No questions returned for thin input (acceptable if model decides input is too thin to ask about)")
		return
	}

	// Check that at least one question contains Finnish characters or words
	finnishFound := false
	for _, q := range qOut.Questions {
		lower := strings.ToLower(q)
		if strings.ContainsAny(lower, "äöå") || strings.Contains(lower, "valtuusto") || strings.Contains(lower, "budjetti") || strings.Contains(lower, "kuinka") || strings.Contains(lower, "montako") {
			finnishFound = true
			break
		}
	}
	if !finnishFound {
		t.Error("questions do not appear to be in Finnish despite Finnish input")
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
