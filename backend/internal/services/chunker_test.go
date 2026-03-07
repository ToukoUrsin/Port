package services

import (
	"strings"
	"testing"
)

func TestChunkMarkdown_HeadingSections(t *testing.T) {
	md := "# Headline\n\nThe city council voted on the new budget proposal today.\n\n## Section Two\n\nResidents expressed concern about rising property taxes in the area."
	chunker := NewStubChunkerService()
	chunks := chunker.ChunkMarkdown(md, ChunkConfig{MaxTokens: 300})

	if len(chunks) != 2 {
		t.Fatalf("got %d chunks, want 2", len(chunks))
	}
	if chunks[0].Text != "Headline: The city council voted on the new budget proposal today." {
		t.Errorf("chunk[0] = %q", chunks[0].Text)
	}
	if chunks[1].Text != "Section Two: Residents expressed concern about rising property taxes in the area." {
		t.Errorf("chunk[1] = %q", chunks[1].Text)
	}
}

func TestChunkMarkdown_HashtagNotTreatedAsHeading(t *testing.T) {
	md := "# Real Heading\n\nSome text with #hashtag and #another tag in the body."
	chunker := NewStubChunkerService()
	chunks := chunker.ChunkMarkdown(md, ChunkConfig{MaxTokens: 300})

	if len(chunks) != 1 {
		t.Fatalf("got %d chunks, want 1 (hashtags should not split)", len(chunks))
	}
	if !strings.Contains(chunks[0].Text, "#hashtag") {
		t.Errorf("chunk should contain #hashtag, got %q", chunks[0].Text)
	}
}

func TestChunkMarkdown_ImageLinesSkipped(t *testing.T) {
	md := "# Story\n\nParagraph one.\n\n![A photo](photo_1)\n\nParagraph two with enough words to be valid."
	chunker := NewStubChunkerService()
	chunks := chunker.ChunkMarkdown(md, ChunkConfig{MaxTokens: 300})

	for _, c := range chunks {
		if strings.Contains(c.Text, "![") {
			t.Errorf("chunk should not contain image markdown, got %q", c.Text)
		}
	}
}

func TestChunkMarkdown_BlockquoteStripped(t *testing.T) {
	md := "# Quote Section\n\n> This is a blockquote line with enough words to pass minimum."
	chunker := NewStubChunkerService()
	chunks := chunker.ChunkMarkdown(md, ChunkConfig{MaxTokens: 300})

	if len(chunks) == 0 {
		t.Fatal("expected at least 1 chunk")
	}
	if strings.Contains(chunks[0].Text, "> ") {
		t.Errorf("blockquote prefix should be stripped, got %q", chunks[0].Text)
	}
	if !strings.Contains(chunks[0].Text, "This is a blockquote") {
		t.Errorf("blockquote content missing, got %q", chunks[0].Text)
	}
}

func TestChunkMarkdown_EmptyInput(t *testing.T) {
	chunker := NewStubChunkerService()
	chunks := chunker.ChunkMarkdown("", ChunkConfig{MaxTokens: 300})

	if len(chunks) != 0 {
		t.Errorf("empty input should produce 0 chunks, got %d", len(chunks))
	}
}

func TestChunkMarkdown_OversizedParagraphSplitsAtWordBoundary(t *testing.T) {
	// Build a single section with one paragraph of 20 words, max 8 tokens per chunk
	words := make([]string, 20)
	for i := range words {
		words[i] = "word"
	}
	md := "# Big\n\n" + strings.Join(words, " ")

	chunker := NewStubChunkerService()
	chunks := chunker.ChunkMarkdown(md, ChunkConfig{MaxTokens: 8})

	if len(chunks) < 2 {
		t.Fatalf("expected multiple chunks for oversized paragraph, got %d", len(chunks))
	}

	for _, c := range chunks {
		wordCount := len(strings.Fields(c.Text))
		if wordCount > 8 {
			t.Errorf("chunk has %d words (max 8): %q", wordCount, c.Text)
		}
	}

	// Verify all 20 "word" tokens appear across chunks (plus heading prefix words)
	totalWords := 0
	for _, c := range chunks {
		totalWords += strings.Count(c.Text, "word")
	}
	if totalWords < 20 {
		t.Errorf("expected at least 20 'word' tokens across chunks, got %d", totalWords)
	}
}

func TestChunkMarkdown_RuntMergedWithPrevious(t *testing.T) {
	// First section has enough words, second section is a runt (< 5 words)
	md := "# First\n\nThis section has enough words to be valid on its own.\n\n## Second\n\nToo short."
	chunker := NewStubChunkerService()
	chunks := chunker.ChunkMarkdown(md, ChunkConfig{MaxTokens: 300})

	// Runt should be merged, so we get 1 chunk instead of 2
	if len(chunks) != 1 {
		t.Fatalf("expected 1 chunk (runt merged), got %d: %v", len(chunks), chunks)
	}
	if !strings.Contains(chunks[0].Text, "Too short") {
		t.Errorf("runt content should be merged into previous chunk, got %q", chunks[0].Text)
	}
}
