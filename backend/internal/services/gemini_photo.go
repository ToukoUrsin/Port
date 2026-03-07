// Gemini Vision photo description service.
//
// Plan: 1_what/article_engine/spec/build/PROMPTS_SPEC.md
//
// Changes:
// - 2026-03-07: Initial implementation
package services

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/localnews/backend/internal/services/prompts"
	"google.golang.org/genai"
)

type GeminiPhotoDescriptionService struct {
	client    *genai.Client
	model     string
	mediaPath string
}

func NewGeminiPhotoDescriptionService(client *genai.Client, model string, mediaPath string) *GeminiPhotoDescriptionService {
	if model == "" {
		model = "gemini-2.5-flash"
	}
	return &GeminiPhotoDescriptionService{client: client, model: model, mediaPath: mediaPath}
}

func (s *GeminiPhotoDescriptionService) Describe(ctx context.Context, photoPath string) (string, error) {
	fullPath := photoPath
	if !filepath.IsAbs(photoPath) {
		fullPath = filepath.Join(s.mediaPath, photoPath)
	}

	data, err := os.ReadFile(fullPath)
	if err != nil {
		return "", fmt.Errorf("read photo %s: %w", photoPath, err)
	}

	mimeType := detectMIME(photoPath)

	resp, err := s.client.Models.GenerateContent(ctx, s.model,
		[]*genai.Content{{
			Role: "user",
			Parts: []*genai.Part{
				{InlineData: &genai.Blob{Data: data, MIMEType: mimeType}},
				genai.NewPartFromText(prompts.PhotoVision),
			},
		}},
		nil,
	)
	if err != nil {
		return "", fmt.Errorf("gemini photo describe: %w", err)
	}

	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("gemini photo describe: empty response")
	}

	return strings.TrimSpace(resp.Candidates[0].Content.Parts[0].Text), nil
}

func detectMIME(path string) string {
	ext := strings.ToLower(filepath.Ext(path))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".heic":
		return "image/heic"
	default:
		return "image/jpeg"
	}
}
