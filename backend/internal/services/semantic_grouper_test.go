package services

import (
	"context"
	"fmt"
	"math"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/pgvector/pgvector-go"
)

// --- mock embedding for grouper tests ---

type mockGrouperEmbedding struct {
	vectors [][]float32
	err     error
}

func (m *mockGrouperEmbedding) EmbedChunks(_ context.Context, _ uuid.UUID, _ int16, _ []Chunk) error {
	return nil
}
func (m *mockGrouperEmbedding) EmbedQuery(_ context.Context, _ string) (pgvector.Vector, error) {
	return pgvector.Vector{}, nil
}
func (m *mockGrouperEmbedding) EmbedTexts(_ context.Context, texts []string) ([][]float32, error) {
	if m.err != nil {
		return nil, m.err
	}
	if len(m.vectors) > 0 {
		return m.vectors, nil
	}
	// Return unit vectors by default
	vecs := make([][]float32, len(texts))
	for i := range texts {
		vecs[i] = []float32{1, 0, 0}
	}
	return vecs, nil
}

// --- SplitSentences tests ---

func TestSplitSentences_Basic(t *testing.T) {
	input := "The council met today. They voted on the budget. The result was unanimous."
	sentences := SplitSentences(input)
	if len(sentences) != 3 {
		t.Fatalf("got %d sentences, want 3: %v", len(sentences), sentences)
	}
	if sentences[0] != "The council met today." {
		t.Errorf("sentence[0] = %q", sentences[0])
	}
	if sentences[2] != "The result was unanimous." {
		t.Errorf("sentence[2] = %q", sentences[2])
	}
}

func TestSplitSentences_MarkdownStripping(t *testing.T) {
	input := "# Headline\n\n![photo](url)\n\n> A quote here. With more text.\n\nParagraph text."
	sentences := SplitSentences(input)
	// Should strip heading marker, skip image, strip blockquote prefix
	for _, s := range sentences {
		if strings.HasPrefix(s, "#") || strings.HasPrefix(s, "![") || strings.HasPrefix(s, "> ") {
			t.Errorf("sentence not cleaned: %q", s)
		}
	}
	if len(sentences) == 0 {
		t.Fatal("expected at least one sentence")
	}
}

func TestSplitSentences_NoTerminalPunctuation(t *testing.T) {
	input := "This has no period at the end"
	sentences := SplitSentences(input)
	if len(sentences) != 1 {
		t.Fatalf("got %d sentences, want 1: %v", len(sentences), sentences)
	}
	if sentences[0] != "This has no period at the end" {
		t.Errorf("sentence = %q", sentences[0])
	}
}

// --- cosineSimilarity tests ---

func TestCosineSimilarity(t *testing.T) {
	// Identical vectors = 1.0
	sim := cosineSimilarity([]float32{1, 0, 0}, []float32{1, 0, 0})
	if math.Abs(sim-1.0) > 1e-6 {
		t.Errorf("identical vectors: got %f, want 1.0", sim)
	}

	// Orthogonal vectors = 0.0
	sim = cosineSimilarity([]float32{1, 0, 0}, []float32{0, 1, 0})
	if math.Abs(sim) > 1e-6 {
		t.Errorf("orthogonal vectors: got %f, want 0.0", sim)
	}

	// Opposite vectors = -1.0
	sim = cosineSimilarity([]float32{1, 0, 0}, []float32{-1, 0, 0})
	if math.Abs(sim+1.0) > 1e-6 {
		t.Errorf("opposite vectors: got %f, want -1.0", sim)
	}

	// Empty/mismatched = 0.0
	sim = cosineSimilarity([]float32{}, []float32{})
	if sim != 0 {
		t.Errorf("empty vectors: got %f, want 0.0", sim)
	}
}

// --- buildWindows tests ---

func TestBuildWindows(t *testing.T) {
	sentences := []string{"A.", "B.", "C.", "D.", "E."}
	windows := buildWindows(sentences, 3)
	if len(windows) != 3 {
		t.Fatalf("got %d windows, want 3", len(windows))
	}
	if windows[0] != "A. B. C." {
		t.Errorf("window[0] = %q", windows[0])
	}
	if windows[2] != "C. D. E." {
		t.Errorf("window[2] = %q", windows[2])
	}
}

// --- findBreakpoints tests ---

func TestFindBreakpoints(t *testing.T) {
	// High similarities with one clear drop
	similarities := []float64{0.95, 0.93, 0.30, 0.92, 0.94}
	breakpoints := findBreakpoints(similarities, 1.0)
	if len(breakpoints) != 1 {
		t.Fatalf("got %d breakpoints, want 1: %v", len(breakpoints), breakpoints)
	}
	if breakpoints[0] != 3 {
		t.Errorf("breakpoint = %d, want 3", breakpoints[0])
	}
}

// --- SemanticGrouper tests ---

func TestSemanticGrouper_FallbackOnEmbeddingError(t *testing.T) {
	emb := &mockGrouperEmbedding{err: fmt.Errorf("API down")}
	grouper := NewSemanticGrouper(emb)

	sentences := make([]string, 10)
	for i := range sentences {
		sentences[i] = fmt.Sprintf("Sentence number %d with enough words to matter.", i)
	}

	cfg := DefaultSemanticGrouperConfig()
	chunks, err := grouper.Group(context.Background(), sentences, cfg)
	// err is returned but chunks should still be produced via fallback
	if err == nil {
		t.Error("expected error to be propagated")
	}
	if len(chunks) == 0 {
		t.Error("expected fallback chunks when embedding fails")
	}
}

func TestSemanticGrouper_FallbackOnTooFewSentences(t *testing.T) {
	emb := &mockGrouperEmbedding{}
	grouper := NewSemanticGrouper(emb)

	sentences := []string{"One sentence.", "Two sentence."}
	cfg := DefaultSemanticGrouperConfig() // WindowSize=3, more than len(sentences)
	chunks, err := grouper.Group(context.Background(), sentences, cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(chunks) == 0 {
		t.Error("expected at least one chunk")
	}
}

func TestSemanticGrouper_FindsBreakpoints(t *testing.T) {
	// Create vectors where first 4 windows are similar, then a sharp change
	// 7 sentences, window=3 -> 5 windows -> 4 similarities
	vectors := [][]float32{
		{1, 0, 0}, // window 0 (sentences 0-2)
		{1, 0, 0}, // window 1 (sentences 1-3)
		{1, 0, 0}, // window 2 (sentences 2-4)
		{0, 1, 0}, // window 3 (sentences 3-5) — topic shift
		{0, 1, 0}, // window 4 (sentences 4-6)
	}
	emb := &mockGrouperEmbedding{vectors: vectors}
	grouper := NewSemanticGrouper(emb)

	sentences := []string{
		"The council discussed budget items.",
		"Revenue projections were presented.",
		"Tax rates remain unchanged.",
		"Parks department requested new funding.",
		"The weather forecast calls for rain.",
		"Local sports teams had a good season.",
		"Community events are planned for spring.",
	}

	cfg := DefaultSemanticGrouperConfig()
	cfg.MinChunkSize = 1
	chunks, err := grouper.Group(context.Background(), sentences, cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(chunks) < 2 {
		t.Errorf("expected at least 2 chunks from topic shift, got %d", len(chunks))
	}
}

func TestSemanticGrouper_MergesRunts(t *testing.T) {
	// Create a breakpoint that produces a tiny first group
	vectors := [][]float32{
		{1, 0, 0},
		{0, 1, 0}, // break after first window
		{0, 1, 0},
		{0, 1, 0},
	}
	emb := &mockGrouperEmbedding{vectors: vectors}
	grouper := NewSemanticGrouper(emb)

	sentences := []string{
		"Short.",           // group 1 — only ~1 word
		"More content.",    // group 2 start
		"Even more here.",  //
		"Continuing on.",   //
		"Almost done now.", //
		"Final sentence.",  //
	}

	cfg := DefaultSemanticGrouperConfig()
	cfg.MinChunkSize = 5
	chunks, err := grouper.Group(context.Background(), sentences, cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Runt "Short." should be merged into the next chunk
	for _, c := range chunks {
		words := len(strings.Fields(c.Text))
		if words < cfg.MinChunkSize && len(chunks) > 1 {
			t.Errorf("chunk has %d words, below min %d: %q", words, cfg.MinChunkSize, c.Text)
		}
	}
}

func TestSemanticGrouper_SplitsOversized(t *testing.T) {
	emb := &mockGrouperEmbedding{} // all identical vectors = no breakpoints
	grouper := NewSemanticGrouper(emb)

	// Create many sentences that would form one huge group
	sentences := make([]string, 50)
	for i := range sentences {
		sentences[i] = fmt.Sprintf("This is sentence number %d with several words to fill up space nicely.", i)
	}

	cfg := DefaultSemanticGrouperConfig()
	cfg.MaxChunkSize = 30
	cfg.MinChunkSize = 5
	chunks, err := grouper.Group(context.Background(), sentences, cfg)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	for _, c := range chunks {
		words := len(strings.Fields(c.Text))
		// Allow some slack for sentence boundaries
		if words > cfg.MaxChunkSize+20 {
			t.Errorf("chunk has %d words, exceeds max %d: %q", words, cfg.MaxChunkSize, c.Text[:80])
		}
	}
	if len(chunks) < 2 {
		t.Errorf("expected multiple chunks from splitting, got %d", len(chunks))
	}
}
