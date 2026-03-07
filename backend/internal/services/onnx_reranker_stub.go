//go:build !(cgo && linux && amd64)

package services

import (
	"context"
	"fmt"
)

type ONNXRerankerService struct{}

func NewONNXRerankerService(modelPath, vocabPath, onnxLibPath string) (*ONNXRerankerService, error) {
	return nil, fmt.Errorf("ONNX reranker not available on this platform (requires cgo + linux/amd64)")
}

func (r *ONNXRerankerService) Rerank(ctx context.Context, query string, candidates []RankedResult, topK int) ([]RankedResult, error) {
	return nil, fmt.Errorf("ONNX reranker not available on this platform")
}

func (r *ONNXRerankerService) Close() {}
