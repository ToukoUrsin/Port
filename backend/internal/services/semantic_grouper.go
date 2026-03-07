package services

import (
	"context"
	"math"
	"regexp"
	"strings"
)

type SemanticGrouperConfig struct {
	WindowSize   int     // sentences per sliding window
	Threshold    float64 // stddev multiplier for breakpoint detection
	MinChunkSize int     // minimum words per chunk
	MaxChunkSize int     // maximum words per chunk
}

func DefaultSemanticGrouperConfig() SemanticGrouperConfig {
	return SemanticGrouperConfig{
		WindowSize:   3,
		Threshold:    1.0,
		MinChunkSize: 20,
		MaxChunkSize: 300,
	}
}

type SemanticGrouper struct {
	embedding EmbeddingService
}

func NewSemanticGrouper(embedding EmbeddingService) *SemanticGrouper {
	return &SemanticGrouper{embedding: embedding}
}

// Group splits sentences into semantically coherent chunks using embedding similarity.
// Falls back to sequential grouping if embeddings are unavailable.
func (g *SemanticGrouper) Group(ctx context.Context, sentences []string, cfg SemanticGrouperConfig) ([]Chunk, error) {
	if len(sentences) == 0 {
		return nil, nil
	}

	// Too few sentences for windowed comparison — use fallback
	if len(sentences) <= cfg.WindowSize {
		return fallbackGroup(sentences, cfg), nil
	}

	windows := buildWindows(sentences, cfg.WindowSize)
	vectors, err := g.embedding.EmbedTexts(ctx, windows)
	if err != nil || len(vectors) != len(windows) {
		return fallbackGroup(sentences, cfg), err
	}

	similarities := make([]float64, len(vectors)-1)
	for i := 0; i < len(vectors)-1; i++ {
		similarities[i] = cosineSimilarity(vectors[i], vectors[i+1])
	}

	breakpoints := findBreakpoints(similarities, cfg.Threshold)
	chunks := groupByBreakpoints(sentences, breakpoints, cfg)
	return chunks, nil
}

// SplitSentences splits markdown text into sentences, stripping images, blockquote
// prefixes, and heading markers. Splits on sentence-ending punctuation followed by whitespace.
func SplitSentences(markdown string) []string {
	lines := strings.Split(markdown, "\n")
	var cleaned []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}
		// Skip image lines
		if strings.HasPrefix(trimmed, "![") {
			continue
		}
		// Strip blockquote prefix
		if strings.HasPrefix(trimmed, "> ") {
			trimmed = strings.TrimPrefix(trimmed, "> ")
		}
		// Strip heading markers
		if stripped := strings.TrimLeft(trimmed, "#"); len(stripped) < len(trimmed) && len(stripped) > 0 && stripped[0] == ' ' {
			trimmed = strings.TrimSpace(stripped)
		}
		if trimmed != "" {
			cleaned = append(cleaned, trimmed)
		}
	}

	text := strings.Join(cleaned, " ")
	if text == "" {
		return nil
	}

	// Split on sentence-ending punctuation followed by whitespace
	re := regexp.MustCompile(`([.!?])\s+`)
	parts := re.Split(text, -1)
	delims := re.FindAllStringSubmatch(text, -1)

	var sentences []string
	for i, part := range parts {
		s := strings.TrimSpace(part)
		if s == "" {
			continue
		}
		// Re-attach the punctuation delimiter
		if i < len(delims) {
			s += delims[i][1]
		}
		sentences = append(sentences, s)
	}

	return sentences
}

func buildWindows(sentences []string, windowSize int) []string {
	if len(sentences) <= windowSize {
		return []string{strings.Join(sentences, " ")}
	}
	windows := make([]string, 0, len(sentences)-windowSize+1)
	for i := 0; i <= len(sentences)-windowSize; i++ {
		windows = append(windows, strings.Join(sentences[i:i+windowSize], " "))
	}
	return windows
}

func cosineSimilarity(a, b []float32) float64 {
	if len(a) != len(b) || len(a) == 0 {
		return 0
	}
	var dot, normA, normB float64
	for i := range a {
		dot += float64(a[i]) * float64(b[i])
		normA += float64(a[i]) * float64(a[i])
		normB += float64(b[i]) * float64(b[i])
	}
	denom := math.Sqrt(normA) * math.Sqrt(normB)
	if denom == 0 {
		return 0
	}
	return dot / denom
}

func findBreakpoints(similarities []float64, threshold float64) []int {
	if len(similarities) == 0 {
		return nil
	}

	// Compute mean and stddev
	var sum float64
	for _, s := range similarities {
		sum += s
	}
	mean := sum / float64(len(similarities))

	var sqDiffSum float64
	for _, s := range similarities {
		diff := s - mean
		sqDiffSum += diff * diff
	}
	stddev := math.Sqrt(sqDiffSum / float64(len(similarities)))

	cutoff := mean - threshold*stddev
	var breakpoints []int
	for i, s := range similarities {
		if s < cutoff {
			// Breakpoint index is after sentence (i + windowSize - 1) in the original
			// But since similarity[i] compares window[i] and window[i+1],
			// the topic shift is between sentence i+windowSize-1 and i+windowSize.
			// We record the sentence index where the new group starts.
			breakpoints = append(breakpoints, i+1)
		}
	}
	return breakpoints
}

func groupByBreakpoints(sentences []string, breakpoints []int, cfg SemanticGrouperConfig) []Chunk {
	// Add boundaries
	starts := []int{0}
	starts = append(starts, breakpoints...)

	var rawGroups [][]string
	for i := 0; i < len(starts); i++ {
		start := starts[i]
		end := len(sentences)
		if i+1 < len(starts) {
			end = starts[i+1]
		}
		if start < end {
			rawGroups = append(rawGroups, sentences[start:end])
		}
	}

	// Merge runts and split oversized
	var chunks []Chunk
	idx := 0
	for gi, group := range rawGroups {
		text := strings.Join(group, " ")
		words := len(strings.Fields(text))

		if words < cfg.MinChunkSize {
			if len(chunks) > 0 {
				// Merge with previous chunk
				chunks[len(chunks)-1].Text += " " + text
			} else if gi+1 < len(rawGroups) {
				// No previous chunk — prepend to next group
				rawGroups[gi+1] = append(group, rawGroups[gi+1]...)
			} else {
				// Only group — keep it
				chunks = append(chunks, Chunk{Index: idx, Text: text, Type: "semantic"})
				idx++
			}
			continue
		}

		if words > cfg.MaxChunkSize {
			// Split at sentence boundaries
			var buf strings.Builder
			for _, sent := range group {
				candidate := buf.String() + sent
				if len(strings.Fields(candidate)) > cfg.MaxChunkSize && buf.Len() > 0 {
					chunks = append(chunks, Chunk{Index: idx, Text: strings.TrimSpace(buf.String()), Type: "semantic"})
					idx++
					buf.Reset()
				}
				if buf.Len() > 0 {
					buf.WriteString(" ")
				}
				buf.WriteString(sent)
			}
			if buf.Len() > 0 {
				remaining := strings.TrimSpace(buf.String())
				if len(strings.Fields(remaining)) < cfg.MinChunkSize && len(chunks) > 0 {
					chunks[len(chunks)-1].Text += " " + remaining
				} else {
					chunks = append(chunks, Chunk{Index: idx, Text: remaining, Type: "semantic"})
					idx++
				}
			}
			continue
		}

		chunks = append(chunks, Chunk{Index: idx, Text: text, Type: "semantic"})
		idx++
	}

	// Re-index
	for i := range chunks {
		chunks[i].Index = i
	}

	return chunks
}

func fallbackGroup(sentences []string, cfg SemanticGrouperConfig) []Chunk {
	var chunks []Chunk
	idx := 0
	var buf strings.Builder

	for _, sent := range sentences {
		candidate := buf.String() + sent
		if len(strings.Fields(candidate)) > cfg.MaxChunkSize && buf.Len() > 0 {
			chunks = append(chunks, Chunk{Index: idx, Text: strings.TrimSpace(buf.String()), Type: "semantic"})
			idx++
			buf.Reset()
		}
		if buf.Len() > 0 {
			buf.WriteString(" ")
		}
		buf.WriteString(sent)
	}

	if buf.Len() > 0 {
		text := strings.TrimSpace(buf.String())
		if len(strings.Fields(text)) < cfg.MinChunkSize && len(chunks) > 0 {
			chunks[len(chunks)-1].Text += " " + text
		} else if len(strings.Fields(text)) > 0 {
			chunks = append(chunks, Chunk{Index: idx, Text: text, Type: "semantic"})
		}
	}

	return chunks
}
