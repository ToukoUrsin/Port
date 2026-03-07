package services

import "context"

type RankedResult struct {
	ID    string
	Score float64
	Text  string
}

type RerankerService interface {
	Rerank(ctx context.Context, query string, candidates []RankedResult, topK int) ([]RankedResult, error)
}

type PassthroughReranker struct{}

func NewPassthroughReranker() *PassthroughReranker {
	return &PassthroughReranker{}
}

func (r *PassthroughReranker) Rerank(ctx context.Context, query string, candidates []RankedResult, topK int) ([]RankedResult, error) {
	if topK >= len(candidates) {
		return candidates, nil
	}
	return candidates[:topK], nil
}
