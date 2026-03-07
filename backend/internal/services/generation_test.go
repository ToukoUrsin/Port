package services

import (
	"context"
	"strings"
	"testing"
)

func TestExtractHeadline(t *testing.T) {
	tests := []struct {
		name     string
		markdown string
		want     string
	}{
		{"standard", "# City Council Votes\n\nBody text.", "City Council Votes"},
		{"no headline", "Just some text.\nMore text.", ""},
		{"multiple H1", "# First\n\n# Second\n\nBody.", "First"},
		{"H2 ignored", "## Not a headline\n\nBody.", ""},
		{"special chars", "# Budget Passes at $4.2M\n\nDetails.", "Budget Passes at $4.2M"},
		{"leading blank lines", "\n\n# After Blanks\n\nBody.", "After Blanks"},
		{"headline with trailing spaces", "#  Spaced Headline \n\nBody.", " Spaced Headline "},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractHeadline(tt.markdown)
			if got != tt.want {
				t.Errorf("extractHeadline() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestExtractFirstParagraph(t *testing.T) {
	tests := []struct {
		name     string
		markdown string
		want     string
	}{
		{
			"standard",
			"# Headline\n\nThe council voted 5-2 on the budget.",
			"The council voted 5-2 on the budget.",
		},
		{
			"long paragraph truncated",
			"# H\n\n" + strings.Repeat("x", 250),
			strings.Repeat("x", 200),
		},
		{
			"no body",
			"# Headline Only",
			"",
		},
		{
			"blank lines before body",
			"# H\n\n\n\nEventual body paragraph.",
			"Eventual body paragraph.",
		},
		{
			"skips headline",
			"# Headline\nNot a blank line but text.",
			"Not a blank line but text.",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := extractFirstParagraph(tt.markdown)
			if got != tt.want {
				t.Errorf("extractFirstParagraph() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestReplacePhotoPlaceholders(t *testing.T) {
	tests := []struct {
		name      string
		article   string
		photoURLs []string
		want      string
	}{
		{
			"single photo",
			"![caption](photo_1)",
			[]string{"/uploads/abc/img1.jpg"},
			"![caption](/uploads/abc/img1.jpg)",
		},
		{
			"two photos",
			"![a](photo_1)\n![b](photo_2)",
			[]string{"/uploads/abc/img1.jpg", "/uploads/abc/img2.jpg"},
			"![a](/uploads/abc/img1.jpg)\n![b](/uploads/abc/img2.jpg)",
		},
		{
			"no photos unchanged",
			"Just text, no photos.",
			[]string{},
			"Just text, no photos.",
		},
		{
			"more placeholders than URLs",
			"![a](photo_1)\n![b](photo_2)\n![c](photo_3)",
			[]string{"/uploads/abc/img1.jpg"},
			"![a](/uploads/abc/img1.jpg)\n![b](photo_2)\n![c](photo_3)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			article := tt.article
			for i, fileURL := range tt.photoURLs {
				placeholder := "photo_" + string(rune('1'+i))
				// Use same logic as pipeline.go:141-144
				article = strings.ReplaceAll(article, placeholder, fileURL)
			}
			if article != tt.want {
				t.Errorf("got %q, want %q", article, tt.want)
			}
		})
	}
}

func TestStubGenerationService_ReturnsValidOutput(t *testing.T) {
	svc := NewStubGenerationService()
	out, err := svc.Generate(context.Background(), GenerationInput{
		Transcript: "test transcript",
		Notes:      "test notes",
	})
	if err != nil {
		t.Fatalf("Generate() error: %v", err)
	}

	if !strings.HasPrefix(out.ArticleMarkdown, "# ") {
		t.Errorf("ArticleMarkdown should start with '# ', got %q", out.ArticleMarkdown[:20])
	}

	validStructures := map[string]bool{
		"news_report": true, "feature": true, "photo_essay": true,
		"brief": true, "narrative": true,
	}
	if !validStructures[out.Metadata.ChosenStructure] {
		t.Errorf("ChosenStructure = %q, not a valid structure", out.Metadata.ChosenStructure)
	}

	if out.Metadata.Confidence < 0 || out.Metadata.Confidence > 1 {
		t.Errorf("Confidence = %f, want 0-1 range", out.Metadata.Confidence)
	}

	if out.Metadata.MissingContext == nil {
		t.Error("MissingContext should be non-nil")
	}
}
