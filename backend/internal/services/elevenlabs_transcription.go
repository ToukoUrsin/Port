// ElevenLabs speech-to-text transcription service with speaker diarization.
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
	"strings"
)

type ElevenLabsTranscriptionService struct {
	apiKey    string
	mediaPath string
}

func NewElevenLabsTranscriptionService(apiKey, mediaPath string) *ElevenLabsTranscriptionService {
	return &ElevenLabsTranscriptionService{apiKey: apiKey, mediaPath: mediaPath}
}

// Diarized response structs for ElevenLabs Scribe v1.
type elevenLabsWord struct {
	Text      string `json:"text"`
	SpeakerID string `json:"speaker_id"`
}

type elevenLabsResponse struct {
	Text  string           `json:"text"`
	Words []elevenLabsWord `json:"words"`
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
	_ = writer.WriteField("diarize", "true")
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

	var result elevenLabsResponse
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("parse response: %w", err)
	}

	// If we have word-level speaker data, format as diarized transcript
	if len(result.Words) > 0 && result.Words[0].SpeakerID != "" {
		return formatDiarizedTranscript(result.Words), nil
	}

	return result.Text, nil
}

// formatDiarizedTranscript groups words by speaker turns into labeled lines.
// Single-speaker optimization: strips "Speaker X:" prefix when only one speaker detected.
func formatDiarizedTranscript(words []elevenLabsWord) string {
	if len(words) == 0 {
		return ""
	}

	type turn struct {
		speaker string
		words   []string
	}

	var turns []turn
	speakers := make(map[string]bool)
	currentSpeaker := ""

	for _, w := range words {
		speaker := w.SpeakerID
		if speaker == "" {
			speaker = currentSpeaker
		}
		speakers[speaker] = true

		if speaker != currentSpeaker || len(turns) == 0 {
			turns = append(turns, turn{speaker: speaker})
			currentSpeaker = speaker
		}
		turns[len(turns)-1].words = append(turns[len(turns)-1].words, w.Text)
	}

	// Single speaker — return plain text without labels
	if len(speakers) <= 1 {
		var allWords []string
		for _, t := range turns {
			allWords = append(allWords, t.words...)
		}
		return strings.Join(allWords, " ")
	}

	// Multiple speakers — format with labels
	var lines []string
	for _, t := range turns {
		label := t.speaker
		// Normalize "speaker_0" → "Speaker 1", etc.
		if strings.HasPrefix(label, "speaker_") {
			num := strings.TrimPrefix(label, "speaker_")
			// Convert 0-based to 1-based
			if n := num; len(n) == 1 && n[0] >= '0' && n[0] <= '9' {
				label = fmt.Sprintf("Speaker %c", n[0]+1)
			} else {
				label = "Speaker " + num
			}
		}
		lines = append(lines, fmt.Sprintf("%s: %s", label, strings.Join(t.words, " ")))
	}

	return strings.Join(lines, "\n")
}
