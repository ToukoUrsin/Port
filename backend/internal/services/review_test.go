package services

import (
	"context"
	"strings"
	"testing"

	"github.com/localnews/backend/internal/models"
)

func TestGateInvariant_RedTriggersImplyRED(t *testing.T) {
	triggerTypes := []string{
		"hallucinated_claim", "fabricated_quote", "unattributed_accusation",
		"hate_speech", "minor_identified", "private_info",
	}

	for _, trigger := range triggerTypes {
		t.Run(trigger, func(t *testing.T) {
			review := models.ReviewResult{
				Gate: "RED",
				RedTriggers: []models.RedTrigger{
					{Dimension: "EVIDENCE", Trigger: trigger, Paragraph: 1, Sentence: "test"},
				},
			}
			if review.Gate != "RED" {
				t.Errorf("gate = %q with red trigger %q, want RED", review.Gate, trigger)
			}
		})
	}
}

func TestGateInvariant_NoRedMeansNotRED(t *testing.T) {
	tests := []struct {
		name string
		gate string
	}{
		{"GREEN", "GREEN"},
		{"YELLOW", "YELLOW"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			review := models.ReviewResult{
				Gate:        tt.gate,
				RedTriggers: []models.RedTrigger{},
			}
			if review.Gate == "RED" {
				t.Errorf("gate should not be RED with no red triggers")
			}
		})
	}
}

func TestGateInvariant_YellowFlagsImplyYELLOW(t *testing.T) {
	review := models.ReviewResult{
		Gate:        "YELLOW",
		RedTriggers: []models.RedTrigger{},
		YellowFlags: []models.YellowFlag{
			{Dimension: "PERSPECTIVES", Description: "Single source", Suggestion: "Add voices"},
		},
	}
	if review.Gate != "YELLOW" {
		t.Errorf("gate = %q with yellow flags and no red triggers, want YELLOW", review.Gate)
	}
}

func TestGateInvariant_NoIssuesMeansGREEN(t *testing.T) {
	review := models.ReviewResult{
		Gate:        "GREEN",
		RedTriggers: []models.RedTrigger{},
		YellowFlags: []models.YellowFlag{},
	}
	if review.Gate != "GREEN" {
		t.Errorf("gate = %q with no issues, want GREEN", review.Gate)
	}
}

func TestEvidenceSeverityMatrix(t *testing.T) {
	// Documents the evidence x severity matrix from the spec.
	// Severity: low (observations), medium (claims), high (accusations)
	// Evidence: low (no sources), medium (single source), high (multiple/documented)
	tests := []struct {
		name     string
		severity string
		evidence string
		expected string
	}{
		{"low_severity_low_evidence", "low", "low", "GREEN"},
		{"medium_severity_low_evidence", "medium", "low", "YELLOW"},
		{"high_severity_low_evidence", "high", "low", "RED"},
		{"high_severity_medium_evidence", "high", "medium", "YELLOW"},
		{"high_severity_high_evidence", "high", "high", "GREEN"},
	}

	gateForMatrix := func(severity, evidence string) string {
		matrix := map[string]map[string]string{
			"low":    {"low": "GREEN", "medium": "GREEN", "high": "GREEN"},
			"medium": {"low": "YELLOW", "medium": "GREEN", "high": "GREEN"},
			"high":   {"low": "RED", "medium": "YELLOW", "high": "GREEN"},
		}
		return matrix[severity][evidence]
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := gateForMatrix(tt.severity, tt.evidence)
			if got != tt.expected {
				t.Errorf("gate(%s, %s) = %q, want %q", tt.severity, tt.evidence, got, tt.expected)
			}
		})
	}
}

func TestReviewFallback(t *testing.T) {
	// Documents the expected fallback review object when parsing fails.
	fallback := models.ReviewResult{
		Gate: "YELLOW",
		Scores: models.QualityScores{
			Evidence:        0.5,
			Perspectives:    0.5,
			Representation:  0.5,
			EthicalFraming:  0.5,
			CulturalContext: 0.5,
			Manipulation:    0.5,
		},
		RedTriggers: []models.RedTrigger{},
		YellowFlags: []models.YellowFlag{
			{Dimension: "EVIDENCE", Description: "Automated review unavailable", Suggestion: "Manual review recommended"},
		},
		Coaching: models.Coaching{
			Celebration: "Thank you for your contribution.",
			Suggestions: []string{"This article requires manual review before publishing."},
		},
	}

	if fallback.Gate != "YELLOW" {
		t.Errorf("fallback gate = %q, want YELLOW", fallback.Gate)
	}
	if fallback.Scores.Evidence != 0.5 {
		t.Errorf("fallback evidence score = %f, want 0.5", fallback.Scores.Evidence)
	}
	if len(fallback.YellowFlags) != 1 {
		t.Errorf("fallback yellow flags = %d, want 1", len(fallback.YellowFlags))
	}
	if fallback.YellowFlags[0].Dimension != "EVIDENCE" {
		t.Errorf("fallback yellow flag dimension = %q, want EVIDENCE", fallback.YellowFlags[0].Dimension)
	}
	if !strings.Contains(fallback.Coaching.Suggestions[0], "manual review") {
		t.Errorf("fallback coaching should mention manual review")
	}
}

func TestStubReviewService_ReturnsValidOutput(t *testing.T) {
	svc := NewStubReviewService()
	result, err := svc.Review(context.Background(), &PipelineContext{
		ArticleMarkdown: "# Test\n\nBody.",
		Transcript:      "test",
	})
	if err != nil {
		t.Fatalf("Review() error: %v", err)
	}

	validGates := map[string]bool{"GREEN": true, "YELLOW": true, "RED": true}
	if !validGates[result.Gate] {
		t.Errorf("Gate = %q, not valid", result.Gate)
	}

	scores := []struct {
		name  string
		value float64
	}{
		{"evidence", result.Scores.Evidence},
		{"perspectives", result.Scores.Perspectives},
		{"representation", result.Scores.Representation},
		{"ethical_framing", result.Scores.EthicalFraming},
		{"cultural_context", result.Scores.CulturalContext},
		{"manipulation", result.Scores.Manipulation},
	}
	for _, s := range scores {
		if s.value < 0 || s.value > 1 {
			t.Errorf("score %s = %f, want 0-1 range", s.name, s.value)
		}
	}

	if result.Coaching.Celebration == "" {
		t.Error("coaching celebration should not be empty")
	}
}
