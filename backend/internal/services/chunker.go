package services

import (
	"strings"

	"github.com/localnews/backend/internal/models"
)

type Chunk struct {
	Index int
	Text  string
	Type  string
}

type ChunkConfig struct {
	MaxTokens   int
	OverlapSent int
}

type ChunkerService interface {
	ChunkBlocks(blocks []models.Block, cfg ChunkConfig) []Chunk
	ChunkMarkdown(markdown string, cfg ChunkConfig) []Chunk
}

type StubChunkerService struct{}

func NewStubChunkerService() *StubChunkerService {
	return &StubChunkerService{}
}

func (s *StubChunkerService) ChunkBlocks(blocks []models.Block, cfg ChunkConfig) []Chunk {
	if cfg.MaxTokens == 0 {
		cfg.MaxTokens = 300
	}

	var chunks []Chunk
	var current strings.Builder
	currentType := "text"
	idx := 0

	for _, block := range blocks {
		switch block.Type {
		case "image", "audio", "video":
			// Skip media blocks, include caption if present
			if block.Caption != "" {
				current.WriteString(block.Caption)
				current.WriteString(" ")
			}
			continue
		case "quote":
			// Flush current
			if current.Len() > 0 {
				chunks = append(chunks, Chunk{Index: idx, Text: strings.TrimSpace(current.String()), Type: currentType})
				idx++
				current.Reset()
			}
			text := block.Content
			if block.Author != "" {
				text += " -- " + block.Author
			}
			chunks = append(chunks, Chunk{Index: idx, Text: text, Type: "quote"})
			idx++
			continue
		case "heading":
			// Flush current
			if current.Len() > 0 {
				chunks = append(chunks, Chunk{Index: idx, Text: strings.TrimSpace(current.String()), Type: currentType})
				idx++
				current.Reset()
			}
			currentType = "heading+body"
			current.WriteString(block.Content)
			current.WriteString(" ")
			continue
		}

		// Text block
		current.WriteString(block.Content)
		current.WriteString(" ")

		// Simple word count approximation for max tokens
		words := len(strings.Fields(current.String()))
		if words > cfg.MaxTokens {
			chunks = append(chunks, Chunk{Index: idx, Text: strings.TrimSpace(current.String()), Type: currentType})
			idx++
			current.Reset()
			currentType = "text"
		}
	}

	if current.Len() > 0 {
		text := strings.TrimSpace(current.String())
		if len(strings.Fields(text)) >= 5 { // min chunk size
			chunks = append(chunks, Chunk{Index: idx, Text: text, Type: currentType})
		} else if len(chunks) > 0 {
			// Merge with previous chunk
			chunks[len(chunks)-1].Text += " " + text
		}
	}

	return chunks
}

func (s *StubChunkerService) ChunkMarkdown(markdown string, cfg ChunkConfig) []Chunk {
	if cfg.MaxTokens == 0 {
		cfg.MaxTokens = 300
	}

	lines := strings.Split(markdown, "\n")

	// Parse into sections split by headings
	type section struct {
		heading string
		body    []string // paragraphs
	}
	var sections []section
	cur := section{}

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Skip image lines
		if strings.HasPrefix(trimmed, "![") {
			continue
		}
		// Strip blockquote prefix
		if strings.HasPrefix(trimmed, "> ") {
			trimmed = strings.TrimPrefix(trimmed, "> ")
		}

		if strings.HasPrefix(trimmed, "#") {
			// Flush previous section
			if cur.heading != "" || len(cur.body) > 0 {
				sections = append(sections, cur)
			}
			// Start new section — strip heading markers
			heading := strings.TrimSpace(strings.TrimLeft(trimmed, "#"))
			cur = section{heading: heading}
			continue
		}

		if trimmed == "" {
			// Blank line = paragraph boundary — append separator
			if len(cur.body) > 0 && cur.body[len(cur.body)-1] != "" {
				cur.body = append(cur.body, "")
			}
			continue
		}

		cur.body = append(cur.body, trimmed)
	}
	if cur.heading != "" || len(cur.body) > 0 {
		sections = append(sections, cur)
	}

	// Build chunks from sections
	var chunks []Chunk
	idx := 0

	for _, sec := range sections {
		// Collect non-empty paragraphs
		var paragraphs []string
		var para strings.Builder
		for _, line := range sec.body {
			if line == "" {
				if para.Len() > 0 {
					paragraphs = append(paragraphs, para.String())
					para.Reset()
				}
				continue
			}
			if para.Len() > 0 {
				para.WriteString(" ")
			}
			para.WriteString(line)
		}
		if para.Len() > 0 {
			paragraphs = append(paragraphs, para.String())
		}

		// Build chunk text with heading prefix for context
		prefix := ""
		if sec.heading != "" {
			prefix = sec.heading + ": "
		}

		text := prefix + strings.Join(paragraphs, " ")
		words := len(strings.Fields(text))

		if words <= cfg.MaxTokens {
			if words >= 5 {
				chunks = append(chunks, Chunk{Index: idx, Text: text, Type: "section"})
				idx++
			} else if len(chunks) > 0 {
				chunks[len(chunks)-1].Text += " " + text
			}
			continue
		}

		// Section too large — split at paragraph boundaries
		var buf strings.Builder
		buf.WriteString(prefix)
		for _, p := range paragraphs {
			candidate := buf.String() + p
			if len(strings.Fields(candidate)) > cfg.MaxTokens && buf.Len() > len(prefix) {
				chunkText := strings.TrimSpace(buf.String())
				if len(strings.Fields(chunkText)) >= 5 {
					chunks = append(chunks, Chunk{Index: idx, Text: chunkText, Type: "section"})
					idx++
				} else if len(chunks) > 0 {
					chunks[len(chunks)-1].Text += " " + chunkText
				}
				buf.Reset()
				buf.WriteString(prefix)
			}
			buf.WriteString(p)
			buf.WriteString(" ")
		}
		if buf.Len() > len(prefix) {
			chunkText := strings.TrimSpace(buf.String())
			if len(strings.Fields(chunkText)) >= 5 {
				chunks = append(chunks, Chunk{Index: idx, Text: chunkText, Type: "section"})
				idx++
			} else if len(chunks) > 0 {
				chunks[len(chunks)-1].Text += " " + chunkText
			}
		}
	}

	return chunks
}
