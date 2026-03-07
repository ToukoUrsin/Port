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
