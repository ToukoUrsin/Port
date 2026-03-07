package models_test

import (
	"encoding/json"
	"reflect"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
)

func TestReviewResult_JSONRoundTrip(t *testing.T) {
	original := models.ReviewResult{
		Verification: []models.VerificationEntry{
			{Claim: "council voted 5-2", Evidence: "contributor said so", Status: "SUPPORTED"},
			{Claim: "budget is $4.2M", Evidence: "not in source", Status: "POSSIBLE_HALLUCINATION"},
		},
		Scores: models.QualityScores{
			Evidence:        0.8,
			Perspectives:    0.5,
			Representation:  0.7,
			EthicalFraming:  0.9,
			CulturalContext: 0.8,
			Manipulation:    0.95,
		},
		Gate: "YELLOW",
		RedTriggers: []models.RedTrigger{
			{
				Dimension:  "EVIDENCE",
				Trigger:    "hallucinated_claim",
				Paragraph:  2,
				Sentence:   "The budget totals $4.2M",
				FixOptions: []string{"Remove claim", "Attribute to source"},
			},
		},
		YellowFlags: []models.YellowFlag{
			{Dimension: "PERSPECTIVES", Description: "Single source", Suggestion: "Add another voice"},
		},
		Coaching: models.Coaching{
			Celebration: "Great quote from Korhonen.",
			Suggestions: []string{"Ask about budget details", "Get opposing view"},
		},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded models.ReviewResult
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if !reflect.DeepEqual(original, decoded) {
		t.Errorf("round-trip mismatch:\n got  %+v\n want %+v", decoded, original)
	}
}

func TestArticleMetadata_JSONRoundTrip(t *testing.T) {
	structures := []string{"news_report", "feature", "photo_essay", "brief", "narrative"}

	for _, s := range structures {
		t.Run(s, func(t *testing.T) {
			original := models.ArticleMetadata{
				ChosenStructure: s,
				Category:        "council",
				Confidence:      0.75,
				MissingContext:  []string{"vote breakdown", "opposing view"},
			}

			data, err := json.Marshal(original)
			if err != nil {
				t.Fatalf("marshal: %v", err)
			}

			var decoded models.ArticleMetadata
			if err := json.Unmarshal(data, &decoded); err != nil {
				t.Fatalf("unmarshal: %v", err)
			}

			if decoded.ChosenStructure != s {
				t.Errorf("chosen_structure = %q, want %q", decoded.ChosenStructure, s)
			}
			if decoded.Confidence != 0.75 {
				t.Errorf("confidence = %f, want 0.75", decoded.Confidence)
			}
			if decoded.Category != "council" {
				t.Errorf("category = %q, want %q", decoded.Category, "council")
			}
			if len(decoded.MissingContext) != 2 {
				t.Errorf("missing_context len = %d, want 2", len(decoded.MissingContext))
			}
		})
	}
}

func TestArticleVersion_JSONRoundTrip(t *testing.T) {
	ts := time.Date(2026, 3, 7, 12, 0, 0, 0, time.UTC)
	original := models.ArticleVersion{
		ArticleMarkdown: "# Headline\n\nBody text.",
		Metadata: models.ArticleMetadata{
			ChosenStructure: "news_report",
			Category:        "council",
			Confidence:      0.8,
			MissingContext:  []string{"details"},
		},
		Review: models.ReviewResult{
			Gate:        "GREEN",
			RedTriggers: []models.RedTrigger{},
			YellowFlags: []models.YellowFlag{},
			Coaching:    models.Coaching{Celebration: "Good work."},
		},
		ContributorInput: "Please add more about the vote",
		Timestamp:        ts,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded models.ArticleVersion
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.ArticleMarkdown != original.ArticleMarkdown {
		t.Errorf("article_markdown mismatch")
	}
	if decoded.ContributorInput != original.ContributorInput {
		t.Errorf("contributor_input mismatch")
	}
	if !decoded.Timestamp.Equal(original.Timestamp) {
		t.Errorf("timestamp = %v, want %v", decoded.Timestamp, original.Timestamp)
	}
}

func TestSubmissionMeta_JSONRoundTrip(t *testing.T) {
	now := time.Date(2026, 3, 7, 12, 0, 0, 0, time.UTC)
	pubID := uuid.New()

	original := models.SubmissionMeta{
		ArticleMarkdown: "# Test\n\nBody.",
		ArticleMetadata: &models.ArticleMetadata{
			ChosenStructure: "feature",
			Category:        "business",
			Confidence:      0.85,
			MissingContext:  []string{"prices"},
		},
		Versions:   []models.ArticleVersion{},
		Transcript: "raw transcript text",
		Review: &models.ReviewResult{
			Gate:        "GREEN",
			RedTriggers: []models.RedTrigger{},
			YellowFlags: []models.YellowFlag{},
		},
		Summary:     "Test summary",
		Category:    "business",
		Model:       "stub",
		GeneratedAt: &now,
		Slug:        "test-article",
		PublishedAt: &now,
		PublishedBy: &pubID,
		Blocks:      []models.Block{{Type: "text", Content: "legacy block"}},
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var decoded models.SubmissionMeta
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if decoded.ArticleMarkdown != original.ArticleMarkdown {
		t.Error("article_markdown mismatch")
	}
	if decoded.Transcript != original.Transcript {
		t.Error("transcript mismatch")
	}
	if decoded.ArticleMetadata == nil || decoded.ArticleMetadata.ChosenStructure != "feature" {
		t.Error("article_metadata mismatch")
	}
	if decoded.Review == nil || decoded.Review.Gate != "GREEN" {
		t.Error("review mismatch")
	}
	if len(decoded.Blocks) != 1 || decoded.Blocks[0].Type != "text" {
		t.Error("legacy blocks mismatch")
	}
	if decoded.PublishedBy == nil || *decoded.PublishedBy != pubID {
		t.Error("published_by mismatch")
	}
}

func TestJSONB_SubmissionMeta_ValueScan(t *testing.T) {
	original := models.JSONB[models.SubmissionMeta]{V: models.SubmissionMeta{
		ArticleMarkdown: "# Test",
		Transcript:      "hello",
		Category:        "council",
	}}

	val, err := original.Value()
	if err != nil {
		t.Fatalf("Value(): %v", err)
	}

	bytes, ok := val.([]byte)
	if !ok {
		t.Fatalf("Value() returned %T, want []byte", val)
	}

	var scanned models.JSONB[models.SubmissionMeta]
	if err := scanned.Scan(bytes); err != nil {
		t.Fatalf("Scan(): %v", err)
	}

	if scanned.V.ArticleMarkdown != "# Test" {
		t.Errorf("ArticleMarkdown = %q, want %q", scanned.V.ArticleMarkdown, "# Test")
	}
	if scanned.V.Transcript != "hello" {
		t.Errorf("Transcript = %q, want %q", scanned.V.Transcript, "hello")
	}

	// Scan(nil) should not error
	var nilScanned models.JSONB[models.SubmissionMeta]
	if err := nilScanned.Scan(nil); err != nil {
		t.Errorf("Scan(nil) returned error: %v", err)
	}
}

func TestJSONB_SubmissionMeta_JSONMarshal(t *testing.T) {
	original := models.JSONB[models.SubmissionMeta]{V: models.SubmissionMeta{
		Summary:  "A summary",
		Category: "events",
	}}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("Marshal: %v", err)
	}

	var decoded models.JSONB[models.SubmissionMeta]
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("Unmarshal: %v", err)
	}

	if decoded.V.Summary != "A summary" {
		t.Errorf("Summary = %q, want %q", decoded.V.Summary, "A summary")
	}
	if decoded.V.Category != "events" {
		t.Errorf("Category = %q, want %q", decoded.V.Category, "events")
	}
}

func TestStateMachine_ValidTransitions(t *testing.T) {
	validTransitions := map[int16][]int16{
		models.StatusDraft:        {models.StatusTranscribing, models.StatusGenerating},
		models.StatusTranscribing: {models.StatusGenerating, models.StatusDraft},
		models.StatusGenerating:   {models.StatusReviewing, models.StatusDraft},
		models.StatusReviewing:    {models.StatusReady, models.StatusDraft},
		models.StatusReady:        {models.StatusPublished, models.StatusRefining, models.StatusAppealed, models.StatusArchived},
		models.StatusPublished:    {models.StatusArchived},
		models.StatusRefining:     {models.StatusTranscribing, models.StatusGenerating, models.StatusDraft},
		models.StatusAppealed:     {models.StatusReady, models.StatusArchived},
	}

	statusNames := map[int16]string{
		models.StatusDraft:        "Draft",
		models.StatusTranscribing: "Transcribing",
		models.StatusGenerating:   "Generating",
		models.StatusReviewing:    "Reviewing",
		models.StatusReady:        "Ready",
		models.StatusPublished:    "Published",
		models.StatusArchived:     "Archived",
		models.StatusRefining:     "Refining",
		models.StatusAppealed:     "Appealed",
	}

	for from, tos := range validTransitions {
		for _, to := range tos {
			t.Run(statusNames[from]+"->"+statusNames[to], func(t *testing.T) {
				// This test documents valid transitions.
				// The status field is just an int16 — transitions are enforced
				// by pipeline logic and handlers, not by a state machine type.
				// We validate that the constants exist and are distinct.
				if from == to {
					t.Errorf("self-transition should not be valid: %d", from)
				}
			})
		}
	}

	// Verify all statuses are covered
	allStatuses := []int16{
		models.StatusDraft, models.StatusTranscribing, models.StatusGenerating,
		models.StatusReviewing, models.StatusReady, models.StatusPublished,
		models.StatusArchived, models.StatusRefining, models.StatusAppealed,
	}
	for _, s := range allStatuses {
		if _, ok := statusNames[s]; !ok {
			t.Errorf("status %d missing from statusNames", s)
		}
	}
}

func TestStateMachine_InvalidTransitions(t *testing.T) {
	invalidTransitions := []struct {
		name string
		from int16
		to   int16
	}{
		{"Published->Refining", models.StatusPublished, models.StatusRefining},
		{"Archived->Draft", models.StatusArchived, models.StatusDraft},
		{"Archived->Published", models.StatusArchived, models.StatusPublished},
		{"Appealed->Published", models.StatusAppealed, models.StatusPublished},
		{"Draft->Published", models.StatusDraft, models.StatusPublished},
		{"Refining->Published", models.StatusRefining, models.StatusPublished},
		{"Draft->Ready", models.StatusDraft, models.StatusReady},
	}

	validTransitions := map[int16]map[int16]bool{
		models.StatusDraft:        {models.StatusTranscribing: true, models.StatusGenerating: true},
		models.StatusTranscribing: {models.StatusGenerating: true, models.StatusDraft: true},
		models.StatusGenerating:   {models.StatusReviewing: true, models.StatusDraft: true},
		models.StatusReviewing:    {models.StatusReady: true, models.StatusDraft: true},
		models.StatusReady:        {models.StatusPublished: true, models.StatusRefining: true, models.StatusAppealed: true, models.StatusArchived: true},
		models.StatusPublished:    {models.StatusArchived: true},
		models.StatusRefining:     {models.StatusTranscribing: true, models.StatusGenerating: true, models.StatusDraft: true},
		models.StatusAppealed:     {models.StatusReady: true, models.StatusArchived: true},
	}

	for _, tt := range invalidTransitions {
		t.Run(tt.name, func(t *testing.T) {
			targets, ok := validTransitions[tt.from]
			if ok && targets[tt.to] {
				t.Errorf("transition %s should be invalid but is in valid set", tt.name)
			}
		})
	}
}
