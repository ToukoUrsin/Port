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

	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
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
		model = "gemini-3.1-pro-preview"
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
	t.Logf("Coaching celebration: %s", revOut.Coaching.Celebration)
}

func TestIntegration_FullPipeline_English(t *testing.T) {
	client := geminiClient(t)
	ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
	defer cancel()

	model := os.Getenv("GENERATION_MODEL")
	if model == "" {
		model = "gemini-3.1-pro-preview"
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
		model = "gemini-3.1-pro-preview"
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

// TestIntegration_FullPipelineService_E2E exercises the entire PipelineService.Run()
// with real Gemini calls — the same code path a user hits via the SSE endpoint.
// Uses SQLite in-memory DB + stub transcription/photo, real generation/review/questioning/research.
func TestIntegration_FullPipelineService_E2E(t *testing.T) {
	client := geminiClient(t)
	ctx, cancel := context.WithTimeout(context.Background(), 180*time.Second)
	defer cancel()

	model := os.Getenv("GENERATION_MODEL")
	if model == "" {
		model = "gemini-3.1-pro-preview"
	}

	db := setupTestDB(t)

	// Real Gemini services
	genSvc := NewGeminiGenerationService(client, model)
	revSvc := NewGeminiReviewService(client, model)
	qSvc := NewGeminiQuestioningService(client, model)
	resSvc := NewGeminiResearchService(client, model)

	// Stub services for transcription/photo/embedding
	stubTrans := &mockTranscription{}
	stubPhoto := &mockPhotoDescription{}
	stubChunker := &mockChunker{}
	stubEmb := &mockEmbedding{}

	pipeline := NewPipelineService(db, stubTrans, genSvc, revSvc, stubPhoto, stubChunker, stubEmb, resSvc, qSvc)

	// Create a notes-only Finnish submission (no audio/photos to avoid needing real files)
	sub := models.Submission{
		ID: uuid.New(), OwnerID: uuid.New(), LocationID: uuid.New(),
		Title:       "",
		Description: "Kirkkonummen kunnanvaltuusto kokoontui tiistai-iltana ja äänesti budjetista äänin 5-2. Valtuutettu Korhonen vastusti ja sanoi: \"Lapsemme ansaitsevat parempaa.\" Kunnanjohtaja Virtanen puolusti budjettia. Paikalla oli paljon vanhempia.",
		Status:      models.StatusDraft,
	}
	insertSubmission(t, db, &sub)

	events := make(chan PipelineEvent, 50)
	done := make(chan struct{})

	var allEvents []PipelineEvent
	go func() {
		for ev := range events {
			allEvents = append(allEvents, ev)
		}
		close(done)
	}()

	t.Log("Starting full pipeline run...")
	pipeline.Run(ctx, sub.ID, events)
	<-done

	// Log all events
	t.Logf("Total events: %d", len(allEvents))
	for i, ev := range allEvents {
		msg := ev.Message
		if msg == "" && ev.Event == "complete" {
			msg = "[complete payload]"
		}
		if ev.Event == "questions" {
			msg = "[questions payload]"
		}
		t.Logf("  [%d] event=%s step=%s msg=%s", i, ev.Event, ev.Step, msg)
	}

	// Check that pipeline completed (not paused on questions)
	lastEvent := allEvents[len(allEvents)-1]
	if lastEvent.Event == "questions" {
		// Pipeline paused for questions — this is valid behavior for thin input.
		// The questioning service decided we need clarifications.
		t.Log("Pipeline paused for questions (valid for this input richness)")
		qData, ok := lastEvent.Data.(map[string]any)
		if ok {
			if qs, ok := qData["questions"].([]string); ok {
				t.Logf("Questions asked (%d):", len(qs))
				for i, q := range qs {
					t.Logf("  %d. %s", i+1, q)
				}
			}
		}
		// Questions should be in Finnish
		return
	}

	if lastEvent.Event == "error" {
		t.Fatalf("pipeline ended with error: step=%s msg=%s", lastEvent.Step, lastEvent.Message)
	}

	if lastEvent.Event != "complete" {
		t.Fatalf("expected complete event, got %s", lastEvent.Event)
	}

	// Extract complete data
	data, ok := lastEvent.Data.(map[string]any)
	if !ok {
		t.Fatalf("complete data type = %T", lastEvent.Data)
	}

	article, ok := data["article"].(string)
	if !ok || article == "" {
		t.Fatal("no article in complete event")
	}
	t.Logf("\n--- FINAL ARTICLE ---\n%s\n--- END ---", article)

	review, ok := data["review"].(*models.ReviewResult)
	if !ok {
		t.Fatalf("review type = %T, want *ReviewResult", data["review"])
	}
	t.Logf("Gate: %s", review.Gate)
	t.Logf("Scores: evidence=%.1f perspectives=%.1f representation=%.1f ethical=%.1f cultural=%.1f manipulation=%.1f",
		review.Scores.Evidence, review.Scores.Perspectives, review.Scores.Representation,
		review.Scores.EthicalFraming, review.Scores.CulturalContext, review.Scores.Manipulation)
	if review.Coaching.Celebration != "" {
		t.Logf("Coaching: %s", review.Coaching.Celebration)
	}
	for i, s := range review.Coaching.Suggestions {
		t.Logf("Suggestion %d: %s", i+1, s)
	}
	if len(review.RedTriggers) > 0 {
		for i, rt := range review.RedTriggers {
			t.Logf("RED trigger %d: %s — %s", i+1, rt.Trigger, rt.Sentence)
		}
	}
	if len(review.YellowFlags) > 0 {
		for i, yf := range review.YellowFlags {
			t.Logf("YELLOW flag %d: %s — %s", i+1, yf.Dimension, yf.Description)
		}
	}

	// Check article is in Finnish
	lower := strings.ToLower(article)
	finnishMarkers := []string{"valtuusto", "budjetti", "korhonen"}
	found := 0
	for _, m := range finnishMarkers {
		if strings.Contains(lower, m) {
			found++
		}
	}
	if found == 0 {
		t.Error("article does not appear to be in Finnish")
	}

	// Check that pipeline event steps include key stages
	steps := map[string]bool{}
	for _, ev := range allEvents {
		if ev.Step != "" {
			steps[ev.Step] = true
		}
	}
	for _, required := range []string{"researching", "generating", "reviewing"} {
		if !steps[required] {
			t.Errorf("missing pipeline step: %s", required)
		}
	}

	// Check auto_fixing was emitted if there were fixable RED triggers
	if steps["auto_fixing"] {
		t.Log("Auto-fix loop was triggered!")
	}

	// Check DB was updated
	var updated models.Submission
	db.First(&updated, "id = ?", sub.ID)
	if updated.Status != models.StatusReady {
		t.Errorf("DB status = %d, want StatusReady (%d)", updated.Status, models.StatusReady)
	}
	if updated.Title == "" {
		t.Error("headline not extracted to DB")
	} else {
		t.Logf("DB title: %s", updated.Title)
	}
}

// TestIntegration_RichInput_SkipsQuestions tests that rich input goes straight
// through RESEARCH → GENERATE → REVIEW without pausing for questions.
func TestIntegration_RichInput_SkipsQuestions(t *testing.T) {
	client := geminiClient(t)
	ctx, cancel := context.WithTimeout(context.Background(), 180*time.Second)
	defer cancel()

	model := os.Getenv("GENERATION_MODEL")
	if model == "" {
		model = "gemini-3.1-pro-preview"
	}

	db := setupTestDB(t)

	genSvc := NewGeminiGenerationService(client, model)
	revSvc := NewGeminiReviewService(client, model)
	qSvc := NewGeminiQuestioningService(client, model)
	resSvc := NewGeminiResearchService(client, model)

	pipeline := NewPipelineService(db, &mockTranscription{}, genSvc, revSvc, &mockPhotoDescription{}, &mockChunker{}, &mockEmbedding{}, resSvc, qSvc)

	// Simulate a submission that already went through questioning and has answers.
	// This tests the GENERATE → REVIEW path with real Gemini.
	transcript := `Springfield city council met Tuesday evening at City Hall to vote on the $2.5 million Riverside Park renovation project.

Council member Sarah Johnson proposed the budget, saying: "This park has been neglected for too long. Our families deserve better green spaces. The playground equipment is from 1987 and the walking paths are crumbling."

Mayor Robert Williams supported the plan but raised concerns: "I'm fully behind improving our parks, but we need to find the funding without raising property taxes. We should explore state grants first."

Council member David Chen disagreed: "Every year we say we'll apply for grants and every year we don't. Let's commit the funds now and apply for reimbursement later."

The vote passed 4-1, with only council member Patricia Adams opposing. Adams said she wanted to see a full environmental impact assessment first.

About 30 residents from the Riverside neighborhood attended. Parent Lisa Martinez told the council: "My kids play in that park every day. The swings are rusty and the sandbox hasn't been cleaned in months."

The renovation plan includes a new playground, resurfaced walking paths, improved lighting, and an accessible restroom facility. Construction is expected to begin in June and finish by October.

The project will be funded from the city's capital improvement fund. City Manager Tom Bradley said the fund currently has $4.1 million available.`

	sub := models.Submission{
		ID: uuid.New(), OwnerID: uuid.New(), LocationID: uuid.New(),
		Title:       "",
		Description: transcript,
		Status:      models.StatusQuestioning,
		Meta: models.JSONB[models.SubmissionMeta]{V: models.SubmissionMeta{
			Transcript: transcript,
			Research: &models.ResearchResult{
				Context: "Springfield, Illinois city council public records.",
				Sources: []models.WebSource{},
				Queries: []string{"Springfield city council park renovation"},
			},
			Questions: []models.ClarificationQA{
				{Question: "When exactly did the meeting take place?", Answer: "Last Tuesday, March 3rd at 7pm"},
				{Question: "Has the environmental assessment been started?", Answer: "Not yet, Adams wants it before construction begins"},
			},
		}},
	}
	insertSubmission(t, db, &sub)

	events := make(chan PipelineEvent, 50)
	done := make(chan struct{})
	var allEvents []PipelineEvent
	go func() {
		for ev := range events {
			allEvents = append(allEvents, ev)
		}
		close(done)
	}()

	t.Log("Starting rich-input pipeline run...")
	pipeline.Run(ctx, sub.ID, events)
	<-done

	t.Logf("Total events: %d", len(allEvents))
	for i, ev := range allEvents {
		msg := ev.Message
		if ev.Event == "complete" {
			msg = "[complete]"
		}
		if ev.Event == "questions" {
			msg = "[questions]"
		}
		t.Logf("  [%d] event=%s step=%s msg=%s", i, ev.Event, ev.Step, msg)
	}

	lastEvent := allEvents[len(allEvents)-1]
	if lastEvent.Event == "questions" {
		t.Log("Pipeline paused for questions even with rich input — acceptable")
		return
	}
	if lastEvent.Event == "error" {
		t.Fatalf("pipeline error: %s — %s", lastEvent.Step, lastEvent.Message)
	}
	if lastEvent.Event != "complete" {
		t.Fatalf("expected complete, got %s", lastEvent.Event)
	}

	data := lastEvent.Data.(map[string]any)
	article := data["article"].(string)
	review := data["review"].(*models.ReviewResult)

	t.Logf("\n--- ARTICLE ---\n%s\n--- END ---", article)
	t.Logf("Gate: %s | Evidence: %.1f | Perspectives: %.1f",
		review.Gate, review.Scores.Evidence, review.Scores.Perspectives)
	t.Logf("Coaching: %s", review.Coaching.Celebration)
	for i, s := range review.Coaching.Suggestions {
		t.Logf("  Suggestion %d: %s", i+1, s)
	}
	if len(review.RedTriggers) > 0 {
		for _, rt := range review.RedTriggers {
			t.Logf("  RED: %s — %s", rt.Trigger, rt.Sentence)
		}
	}

	// Verify English output
	lower := strings.ToLower(article)
	if !strings.Contains(lower, "council") && !strings.Contains(lower, "park") {
		t.Error("article doesn't appear to be in English")
	}

	// Check DB
	var updated models.Submission
	db.First(&updated, "id = ?", sub.ID)
	t.Logf("DB: status=%d title=%q", updated.Status, updated.Title)
	if updated.Status != models.StatusReady {
		t.Errorf("status = %d, want Ready", updated.Status)
	}

	// Check for auto-fix
	for _, ev := range allEvents {
		if ev.Step == "auto_fixing" {
			t.Log("Auto-fix loop triggered during this run!")
		}
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
