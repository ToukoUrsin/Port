//go:build cgo && linux && amd64

package services

import (
	"context"
	"fmt"
	"math"
	"sort"

	ort "github.com/yalue/onnxruntime_go"
)

// ONNXRerankerService uses an ONNX cross-encoder model (e.g. ms-marco-MiniLM-L6-v2)
// to rerank search candidates by relevance to a query.
type ONNXRerankerService struct {
	session   *ort.DynamicAdvancedSession
	tokenizer *WordPieceTokenizer
	maxSeqLen int
}

func NewONNXRerankerService(modelPath, vocabPath, onnxLibPath string) (*ONNXRerankerService, error) {
	if onnxLibPath != "" {
		ort.SetSharedLibraryPath(onnxLibPath)
	}
	if err := ort.InitializeEnvironment(); err != nil {
		return nil, fmt.Errorf("init onnx environment: %w", err)
	}

	const maxSeqLen = 128

	tokenizer, err := NewWordPieceTokenizer(vocabPath, maxSeqLen)
	if err != nil {
		return nil, fmt.Errorf("load tokenizer: %w", err)
	}

	inputNames := []string{"input_ids", "attention_mask", "token_type_ids"}
	outputNames := []string{"logits"}

	session, err := ort.NewDynamicAdvancedSession(
		modelPath,
		inputNames, outputNames,
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("create onnx session: %w", err)
	}

	return &ONNXRerankerService{
		session:   session,
		tokenizer: tokenizer,
		maxSeqLen: maxSeqLen,
	}, nil
}

func (r *ONNXRerankerService) Rerank(ctx context.Context, query string, candidates []RankedResult, topK int) ([]RankedResult, error) {
	if len(candidates) == 0 {
		return nil, nil
	}
	if topK <= 0 || topK > len(candidates) {
		topK = len(candidates)
	}

	batchSize := len(candidates)
	seqLen := int64(r.maxSeqLen)

	// Build batched tensors
	allInputIDs := make([]int64, batchSize*r.maxSeqLen)
	allAttMask := make([]int64, batchSize*r.maxSeqLen)
	allTypeIDs := make([]int64, batchSize*r.maxSeqLen)

	for i, cand := range candidates {
		ids, mask, types := r.tokenizer.EncodePair(query, cand.Text)
		offset := i * r.maxSeqLen
		copy(allInputIDs[offset:offset+r.maxSeqLen], ids)
		copy(allAttMask[offset:offset+r.maxSeqLen], mask)
		copy(allTypeIDs[offset:offset+r.maxSeqLen], types)
	}

	inputShape := ort.Shape{int64(batchSize), seqLen}
	outputShape := ort.Shape{int64(batchSize), 1}

	inputIDsTensor, err := ort.NewTensor(inputShape, allInputIDs)
	if err != nil {
		return nil, fmt.Errorf("create input_ids tensor: %w", err)
	}
	defer inputIDsTensor.Destroy()

	attMaskTensor, err := ort.NewTensor(inputShape, allAttMask)
	if err != nil {
		return nil, fmt.Errorf("create attention_mask tensor: %w", err)
	}
	defer attMaskTensor.Destroy()

	typeIDsTensor, err := ort.NewTensor(inputShape, allTypeIDs)
	if err != nil {
		return nil, fmt.Errorf("create token_type_ids tensor: %w", err)
	}
	defer typeIDsTensor.Destroy()

	outputTensor, err := ort.NewEmptyTensor[float32](outputShape)
	if err != nil {
		return nil, fmt.Errorf("create output tensor: %w", err)
	}
	defer outputTensor.Destroy()

	err = r.session.Run(
		[]ort.Value{inputIDsTensor, attMaskTensor, typeIDsTensor},
		[]ort.Value{outputTensor},
	)
	if err != nil {
		return nil, fmt.Errorf("onnx inference: %w", err)
	}

	scores := outputTensor.GetData()

	type scored struct {
		idx   int
		score float64
	}
	ranked := make([]scored, batchSize)
	for i := range candidates {
		ranked[i] = scored{idx: i, score: sigmoid(float64(scores[i]))}
	}
	sort.Slice(ranked, func(a, b int) bool {
		return ranked[a].score > ranked[b].score
	})

	results := make([]RankedResult, topK)
	for i := 0; i < topK; i++ {
		c := candidates[ranked[i].idx]
		c.Score = ranked[i].score
		results[i] = c
	}
	return results, nil
}

func (r *ONNXRerankerService) Close() {
	if r.session != nil {
		r.session.Destroy()
	}
	_ = ort.DestroyEnvironment()
}

func sigmoid(x float64) float64 {
	return 1.0 / (1.0 + math.Exp(-x))
}
