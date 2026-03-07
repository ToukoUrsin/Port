package services

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

type MediaService struct {
	storagePath string
}

func NewMediaService(storagePath string) *MediaService {
	return &MediaService{storagePath: storagePath}
}

func (s *MediaService) SaveUploadedFile(file *multipart.FileHeader, submissionID uuid.UUID) (string, int64, error) {
	dir := filepath.Join(s.storagePath, submissionID.String())
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", 0, fmt.Errorf("create upload dir: %w", err)
	}

	filename := uuid.New().String() + filepath.Ext(file.Filename)
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
	return os.Remove(path)
}

func (s *MediaService) GetFilePath(submissionID uuid.UUID, filename string) string {
	return filepath.Join(s.storagePath, submissionID.String(), filename)
}
