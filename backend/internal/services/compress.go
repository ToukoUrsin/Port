package services

import (
	"bytes"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"log"
	"os"
	"path/filepath"
	"strings"

	"golang.org/x/image/draw"
	"golang.org/x/image/webp"
)

type ImageCompressor struct {
	targetBytes  int64
	maxDimension int
}

func NewImageCompressor(targetSizeKB, maxDimension int) *ImageCompressor {
	return &ImageCompressor{
		targetBytes:  int64(targetSizeKB) * 1024,
		maxDimension: maxDimension,
	}
}

// CompressFile compresses an image file to JPEG under the target size.
// Returns the (possibly new) path, dimensions, final size, or an error.
func (ic *ImageCompressor) CompressFile(path string) (string, int, int, int64, error) {
	ext := strings.ToLower(filepath.Ext(path))

	// Skip HEIC — Go can't decode it
	if ext == ".heic" {
		return path, 0, 0, 0, fmt.Errorf("heic not supported")
	}

	if !isImageExt(ext) {
		return path, 0, 0, 0, fmt.Errorf("not an image file: %s", ext)
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return path, 0, 0, 0, fmt.Errorf("read file: %w", err)
	}

	// Decode image
	var img image.Image
	switch ext {
	case ".jpg", ".jpeg":
		img, err = jpeg.Decode(bytes.NewReader(data))
	case ".png":
		img, err = png.Decode(bytes.NewReader(data))
	case ".webp":
		img, err = webp.Decode(bytes.NewReader(data))
	default:
		return path, 0, 0, 0, fmt.Errorf("unsupported format: %s", ext)
	}
	if err != nil {
		return path, 0, 0, 0, fmt.Errorf("decode %s: %w", ext, err)
	}

	bounds := img.Bounds()
	w, h := bounds.Dx(), bounds.Dy()

	// Resize if longest edge exceeds max dimension
	if w > ic.maxDimension || h > ic.maxDimension {
		ratio := float64(ic.maxDimension) / float64(max(w, h))
		newW := int(float64(w) * ratio)
		newH := int(float64(h) * ratio)
		dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
		draw.CatmullRom.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
		img = dst
		w, h = newW, newH
	}

	// Composite PNG alpha onto white background
	if ext == ".png" {
		bg := image.NewRGBA(image.Rect(0, 0, w, h))
		draw.Draw(bg, bg.Bounds(), &image.Uniform{color.White}, image.Point{}, draw.Src)
		draw.Draw(bg, bg.Bounds(), img, img.Bounds().Min, draw.Over)
		img = bg
	}

	// If already JPEG and under target, just return dimensions
	if (ext == ".jpg" || ext == ".jpeg") && int64(len(data)) <= ic.targetBytes {
		return path, w, h, int64(len(data)), nil
	}

	// Iterative JPEG quality reduction
	var buf bytes.Buffer
	for quality := 90; quality >= 30; quality -= 5 {
		buf.Reset()
		if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: quality}); err != nil {
			return path, 0, 0, 0, fmt.Errorf("encode jpeg q=%d: %w", quality, err)
		}
		if int64(buf.Len()) <= ic.targetBytes {
			break
		}
	}

	// Determine output path
	newPath := path
	if ext != ".jpg" && ext != ".jpeg" {
		newPath = strings.TrimSuffix(path, ext) + ".jpg"
	}

	if err := os.WriteFile(newPath, buf.Bytes(), 0o644); err != nil {
		return path, 0, 0, 0, fmt.Errorf("write compressed: %w", err)
	}

	// Delete original if format changed
	if newPath != path {
		if err := os.Remove(path); err != nil {
			log.Printf("compress: failed to remove original %s: %v", path, err)
		}
	}

	return newPath, w, h, int64(buf.Len()), nil
}

func isImageExt(ext string) bool {
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp", ".heic":
		return true
	}
	return false
}
