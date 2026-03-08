package services

import (
	"fmt"
	"io"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"gorm.io/gorm"
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
	compressor  *ImageCompressor
}

func NewMediaService(storagePath string, targetSizeKB, maxDim int) *MediaService {
	return &MediaService{
		storagePath: storagePath,
		compressor:  NewImageCompressor(targetSizeKB, maxDim),
	}
}

// CompressImage compresses an image file and returns the new path and metadata.
func (s *MediaService) CompressImage(path string) (string, models.FileMeta, error) {
	newPath, w, h, _, err := s.compressor.CompressFile(path)
	if err != nil {
		return path, models.FileMeta{}, err
	}
	meta := models.FileMeta{
		MimeType: "image/jpeg",
		Width:    w,
		Height:   h,
	}
	return newPath, meta, nil
}

// ScanAndCompressUnprocessed finds image files with empty mime_type and compresses them.
// It also walks the uploads directory to compress any oversized images on disk.
func (s *MediaService) ScanAndCompressUnprocessed(db *gorm.DB) {
	// Pass 1: DB-tracked files with missing metadata
	var files []models.File
	db.Where("file_type = 2 AND (meta->>'mime_type' IS NULL OR meta->>'mime_type' = '')").Find(&files)

	compressed := 0
	for _, f := range files {
		ext := strings.ToLower(filepath.Ext(f.Name))
		if ext == ".heic" {
			f.Meta = models.JSONB[models.FileMeta]{V: models.FileMeta{MimeType: "image/heic"}}
			db.Model(&f).Update("meta", f.Meta)
			continue
		}

		newPath, meta, err := s.CompressImage(f.Name)
		if err != nil {
			log.Printf("compress scan: %s: %v", f.Name, err)
			continue
		}

		info, err := os.Stat(newPath)
		if err != nil {
			log.Printf("compress scan: stat %s: %v", newPath, err)
			continue
		}

		db.Model(&f).Updates(map[string]any{
			"name": newPath,
			"size": info.Size(),
			"meta": models.JSONB[models.FileMeta]{V: meta},
		})
		compressed++
	}

	if compressed > 0 {
		log.Printf("compressed %d tracked images on startup", compressed)
	}

	// Pass 2: Walk uploads directory for any oversized images on disk
	s.compressOversizedOnDisk()
}

// compressOversizedOnDisk walks the storage directory and compresses any image
// file exceeding the target size. This catches files not tracked in the DB
// (e.g. images uploaded before the compression pipeline).
func (s *MediaService) compressOversizedOnDisk() {
	compressed := 0
	err := filepath.Walk(s.storagePath, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() {
			return nil
		}
		ext := strings.ToLower(filepath.Ext(path))
		if !isImageExt(ext) || ext == ".heic" {
			return nil
		}
		if info.Size() <= s.compressor.targetBytes {
			return nil
		}

		sizeBefore := info.Size()
		newPath, _, _, sizeAfter, compErr := s.compressor.CompressFile(path)
		if compErr != nil {
			log.Printf("compress disk: %s: %v", path, compErr)
			return nil
		}
		log.Printf("compressed %s: %s → %s (path: %s)",
			filepath.Base(path), formatBytes(sizeBefore), formatBytes(sizeAfter), newPath)
		compressed++
		return nil
	})
	if err != nil {
		log.Printf("compress disk walk error: %v", err)
	}
	if compressed > 0 {
		log.Printf("compressed %d oversized images from disk on startup", compressed)
	}
}

func formatBytes(b int64) string {
	const kb = 1024
	const mb = 1024 * kb
	if b >= mb {
		return fmt.Sprintf("%.1fMB", float64(b)/float64(mb))
	}
	return fmt.Sprintf("%dKB", b/kb)
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
