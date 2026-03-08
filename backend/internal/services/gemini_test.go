package services

import (
	"testing"
)

func TestSplitMetadata(t *testing.T) {
	tests := []struct {
		name         string
		raw          string
		wantArticle  string
		wantHasMeta  bool
	}{
		{
			"exact delimiter",
			"# Headline\n\nBody text.\n---METADATA---\n{\"chosen_structure\":\"news_report\"}",
			"# Headline\n\nBody text.\n",
			true,
		},
		{
			"spaced delimiter",
			"# Headline\n\nBody.\n--- METADATA ---\n{\"chosen_structure\":\"brief\"}",
			"# Headline\n\nBody.\n",
			true,
		},
		{
			"lowercase delimiter",
			"Article text.\n---metadata---\n{\"category\":\"community\"}",
			"Article text.\n",
			true,
		},
		{
			"markdown heading variant",
			"# Title\n\nParagraph.\n## METADATA\n{\"confidence\":0.9}",
			"# Title\n\nParagraph.\n",
			true,
		},
		{
			"no delimiter — everything is article",
			"# Title\n\nJust an article, no metadata.",
			"# Title\n\nJust an article, no metadata.",
			false,
		},
		{
			"empty input",
			"",
			"",
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			article, metaJSON := splitMetadata(tt.raw)
			if article != tt.wantArticle {
				t.Errorf("article = %q, want %q", article, tt.wantArticle)
			}
			if tt.wantHasMeta && metaJSON == "" {
				t.Error("expected metadata but got empty string")
			}
			if !tt.wantHasMeta && metaJSON != "" {
				t.Errorf("expected no metadata but got %q", metaJSON)
			}
		})
	}
}

func TestStripCodeFences(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"json fences", "```json\n{\"key\":\"val\"}\n```", "{\"key\":\"val\"}"},
		{"plain fences", "```\n{\"key\":\"val\"}\n```", "{\"key\":\"val\"}"},
		{"no fences", "{\"key\":\"val\"}", "{\"key\":\"val\"}"},
		{"fences with whitespace", "  ```json\n{\"a\":1}\n```  ", "{\"a\":1}"},
		{"only opening fence", "```json\n{\"a\":1}", "{\"a\":1}"},
		{"only closing fence", "{\"a\":1}\n```", "{\"a\":1}"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := stripCodeFences(tt.in)
			if got != tt.want {
				t.Errorf("stripCodeFences() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestParseGenerationOutput(t *testing.T) {
	tests := []struct {
		name            string
		raw             string
		wantArticle     string
		wantStructure   string
		wantCategory    string
		wantConfidence  float64
	}{
		{
			"complete output",
			"# Council Votes on Budget\n\nThe council voted 5-2.\n---METADATA---\n{\"chosen_structure\":\"news_report\",\"category\":\"politics\",\"confidence\":0.85,\"missing_context\":[]}",
			"# Council Votes on Budget\n\nThe council voted 5-2.",
			"news_report",
			"politics",
			0.85,
		},
		{
			"metadata in code fences",
			"# Bakery Opens\n\nNew bakery on Main Street.\n---METADATA---\n```json\n{\"chosen_structure\":\"feature\",\"category\":\"business\",\"confidence\":0.9,\"missing_context\":[]}\n```",
			"# Bakery Opens\n\nNew bakery on Main Street.",
			"feature",
			"business",
			0.9,
		},
		{
			"no metadata — defaults applied",
			"# Brief Update\n\nShort news item.",
			"# Brief Update\n\nShort news item.",
			"news_report",
			"community",
			0.5,
		},
		{
			"malformed metadata — defaults applied",
			"# Title\n\nBody.\n---METADATA---\nnot json at all",
			"# Title\n\nBody.",
			"news_report",
			"community",
			0.5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			out, err := parseGenerationOutput(tt.raw)
			if err != nil {
				t.Fatalf("parseGenerationOutput() error: %v", err)
			}
			if out.ArticleMarkdown != tt.wantArticle {
				t.Errorf("ArticleMarkdown = %q, want %q", out.ArticleMarkdown, tt.wantArticle)
			}
			if out.Metadata.ChosenStructure != tt.wantStructure {
				t.Errorf("ChosenStructure = %q, want %q", out.Metadata.ChosenStructure, tt.wantStructure)
			}
			if out.Metadata.Category != tt.wantCategory {
				t.Errorf("Category = %q, want %q", out.Metadata.Category, tt.wantCategory)
			}
			if out.Metadata.Confidence != tt.wantConfidence {
				t.Errorf("Confidence = %f, want %f", out.Metadata.Confidence, tt.wantConfidence)
			}
		})
	}
}

func TestParseReviewJSON(t *testing.T) {
	validJSON := `{
		"verification": [{"claim": "voted 5-2", "source_match": "exact", "note": "confirmed"}],
		"scores": {"evidence": 0.9, "perspectives": 0.7, "representation": 0.8, "ethical_framing": 0.85, "cultural_context": 0.75, "manipulation": 0.95},
		"gate": "GREEN",
		"red_triggers": [],
		"yellow_flags": [],
		"coaching": {"celebration": "Great factual reporting!", "suggestions": ["Consider adding council member quotes"]}
	}`

	tests := []struct {
		name     string
		raw      string
		wantGate string
		wantErr  bool
	}{
		{"valid JSON", validJSON, "GREEN", false},
		{"JSON in code fences", "```json\n" + validJSON + "\n```", "GREEN", false},
		{"JSON with surrounding text", "Here is the review:\n" + validJSON + "\nEnd of review.", "GREEN", false},
		{"completely invalid", "This is not JSON at all and has no braces", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseReviewJSON(tt.raw)
			if tt.wantErr {
				if err == nil {
					t.Error("expected error but got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("parseReviewJSON() error: %v", err)
			}
			if result.Gate != tt.wantGate {
				t.Errorf("Gate = %q, want %q", result.Gate, tt.wantGate)
			}
		})
	}
}

func TestFallbackReview(t *testing.T) {
	result := fallbackReview()

	if result.Gate != "YELLOW" {
		t.Errorf("Gate = %q, want YELLOW", result.Gate)
	}
	if result.Scores.Evidence != 0.5 {
		t.Errorf("Evidence = %f, want 0.5", result.Scores.Evidence)
	}
	if len(result.RedTriggers) != 0 {
		t.Errorf("RedTriggers = %d, want 0", len(result.RedTriggers))
	}
	if len(result.YellowFlags) != 1 {
		t.Errorf("YellowFlags = %d, want 1", len(result.YellowFlags))
	}
	if result.Coaching.Celebration == "" {
		t.Error("Coaching celebration should not be empty")
	}
}

func TestDetectMIME(t *testing.T) {
	tests := []struct {
		path string
		want string
	}{
		{"photo.jpg", "image/jpeg"},
		{"photo.JPEG", "image/jpeg"},
		{"image.png", "image/png"},
		{"anim.gif", "image/gif"},
		{"modern.webp", "image/webp"},
		{"iphone.heic", "image/heic"},
		{"unknown.bmp", "image/jpeg"},
		{"no-ext", "image/jpeg"},
	}

	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			got := detectMIME(tt.path)
			if got != tt.want {
				t.Errorf("detectMIME(%q) = %q, want %q", tt.path, got, tt.want)
			}
		})
	}
}

func TestBuildGenerationUserPrompt(t *testing.T) {
	t.Run("full input", func(t *testing.T) {
		input := &PipelineContext{
			Transcript:        "The mayor spoke about the budget.",
			Notes:             "Budget meeting at town hall.",
			PhotoDescriptions: []string{"Photo of town hall exterior"},
			TownContext:       "Kirkkonummi, Finland",
		}
		prompt := buildGenerationUserPrompt(input)

		if !contains(prompt, "Transcript:") {
			t.Error("should contain Transcript")
		}
		if !contains(prompt, "Notes:") {
			t.Error("should contain Notes")
		}
		if !contains(prompt, "Photo descriptions:") {
			t.Error("should contain Photo descriptions")
		}
		if !contains(prompt, "Town context") {
			t.Error("should contain Town context")
		}
	})

	t.Run("notes only — no transcript or photos sections", func(t *testing.T) {
		input := &PipelineContext{
			Notes:       "Just notes.",
			TownContext: "Test town",
		}
		prompt := buildGenerationUserPrompt(input)

		if contains(prompt, "Transcript:") {
			t.Error("should not contain Transcript when empty")
		}
		if contains(prompt, "Photo descriptions:") {
			t.Error("should not contain Photo descriptions when empty")
		}
		if !contains(prompt, "Notes:") {
			t.Error("should contain Notes")
		}
	})

	t.Run("refinement includes previous article and direction", func(t *testing.T) {
		input := &PipelineContext{
			Transcript:      "transcript",
			TownContext:     "town",
			PreviousArticle: "# Old Article\n\nOld body.",
			Direction:       "Make it shorter",
		}
		prompt := buildGenerationUserPrompt(input)

		if !contains(prompt, "Previous article:") {
			t.Error("should contain Previous article")
		}
		if !contains(prompt, "Make it shorter") {
			t.Error("should contain contributor direction")
		}
	})
}

func TestBuildReviewUserPrompt(t *testing.T) {
	input := &PipelineContext{
		ArticleMarkdown:   "# Test\n\nArticle body.",
		Transcript:        "Source transcript.",
		Notes:             "Source notes.",
		PhotoDescriptions: []string{"desc1", "desc2"},
	}
	prompt := buildReviewUserPrompt(input)

	if !contains(prompt, "Article:") {
		t.Error("should contain Article")
	}
	if !contains(prompt, "Source transcript:") {
		t.Error("should contain Source transcript")
	}
	if !contains(prompt, "Source notes:") {
		t.Error("should contain Source notes")
	}
	if !contains(prompt, "Photo descriptions:") {
		t.Error("should contain Photo descriptions")
	}
}

func contains(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 && (s == substr || len(s) > len(substr) && indexSubstring(s, substr) >= 0)
}

func indexSubstring(s, sub string) int {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return i
		}
	}
	return -1
}
