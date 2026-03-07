// ElevenLabs speech-to-text transcription service.
//
// Plan: N/A
//
// Changes:
// - 2026-03-07: Initial implementation
package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
)

type ElevenLabsTranscriptionService struct {
	apiKey    string
	mediaPath string
}

func NewElevenLabsTranscriptionService(apiKey, mediaPath string) *ElevenLabsTranscriptionService {
	return &ElevenLabsTranscriptionService{apiKey: apiKey, mediaPath: mediaPath}
}

func (s *ElevenLabsTranscriptionService) Transcribe(ctx context.Context, audioPath string) (string, error) {
	fullPath := audioPath
	if !filepath.IsAbs(audioPath) {
		fullPath = filepath.Join(s.mediaPath, audioPath)
	}

	audioFile, err := os.Open(fullPath)
	if err != nil {
		return "", fmt.Errorf("open audio file: %w", err)
	}
	defer audioFile.Close()

	// Build multipart form
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	part, err := writer.CreateFormFile("file", filepath.Base(fullPath))
	if err != nil {
		return "", fmt.Errorf("create form file: %w", err)
	}
	if _, err := io.Copy(part, audioFile); err != nil {
		return "", fmt.Errorf("copy audio data: %w", err)
	}

	_ = writer.WriteField("model_id", "scribe_v1")
	writer.Close()

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.elevenlabs.io/v1/speech-to-text", &body)
	if err != nil {
		return "", fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("xi-api-key", s.apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("elevenlabs request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("elevenlabs STT error %d: %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	return result.Text, nil
}
