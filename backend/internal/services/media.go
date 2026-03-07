package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

var allowedExtensions = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
	".heic": true,
	".mp3":  true,
	".m4a":  true,
	".wav":  true,
	".ogg":  true,
	".aac":  true,
	".webm": true,
}

type MediaService struct {
	storagePath string
}

func NewMediaService(storagePath string) *MediaService {
	return &MediaService{storagePath: storagePath}
}

func (s *MediaService) SaveUploadedFile(file *multipart.FileHeader, submissionID uuid.UUID, maxSizeBytes int64) (string, int64, error) {
	// Validate extension
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if !allowedExtensions[ext] {
		return "", 0, fmt.Errorf("file type %q is not allowed", ext)
	}

	// Validate size
	if file.Size > maxSizeBytes {
		return "", 0, fmt.Errorf("file size %d exceeds limit of %d bytes", file.Size, maxSizeBytes)
	}

	dir := filepath.Join(s.storagePath, submissionID.String())
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", 0, fmt.Errorf("create upload dir: %w", err)
	}

	filename := uuid.New().String() + ext
	destPath := filepath.Join(dir, filename)

	src, err := file.Open()
	if err != nil {
		return "", 0, fmt.Errorf("open uploaded file: %w", err)
	}
	defer src.Close()

	dst, err := os.Create(destPath)
	if err != nil {
		return "", 0, fmt.Errorf("create dest file: %w", err)
	}
	defer dst.Close()

	written, err := io.Copy(dst, src)
	if err != nil {
		return "", 0, fmt.Errorf("copy file: %w", err)
	}

	return destPath, written, nil
}

func (s *MediaService) DeleteFile(path string) error {
	absPath, err := filepath.Abs(path)
	if err != nil {
		return fmt.Errorf("resolve path: %w", err)
	}
	absStorage, err := filepath.Abs(s.storagePath)
	if err != nil {
		return fmt.Errorf("resolve storage path: %w", err)
	}
	if !strings.HasPrefix(absPath, absStorage+string(filepath.Separator)) {
		return fmt.Errorf("path is outside storage directory")
	}
	return os.Remove(absPath)
}

func (s *MediaService) GetFilePath(submissionID uuid.UUID, filename string) string {
	return filepath.Join(s.storagePath, submissionID.String(), filename)
}
