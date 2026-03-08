package search

import (
	"context"
	"fmt"
	"sort"

	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/pgvector/pgvector-go"
	"gorm.io/gorm"
)

// SimilarArticles returns published articles most similar to the given article
// by computing a centroid of its chunk embeddings and querying pgvector.
// When countryPath is non-empty, results are restricted to that country.
func (s *Service) SimilarArticles(ctx context.Context, articleID uuid.UUID, limit int, countryPath string) ([]models.Submission, error) {
	// Fetch all embeddings for this article
	var embeddings []models.Embedding
	if err := s.db.WithContext(ctx).
		Where("entity_id = ? AND entity_category = ?", articleID, models.EntitySubmission).
		Find(&embeddings).Error; err != nil {
		return nil, fmt.Errorf("fetch embeddings: %w", err)
	}
	if len(embeddings) == 0 {
		return nil, nil
	}

	// Compute centroid vector (average of all chunk vectors)
	dims := len(embeddings[0].Vector.Slice())
	centroid := make([]float32, dims)
	for _, emb := range embeddings {
		for i, v := range emb.Vector.Slice() {
			centroid[i] += v
		}
	}
	n := float32(len(embeddings))
	for i := range centroid {
		centroid[i] /= n
	}
	centroidVec := pgvector.NewVector(centroid)

	// Query for closest submission embeddings, excluding the source article
	type entityHit struct {
		EntityID string  `gorm:"column:entity_id"`
		Score    float64 `gorm:"column:score"`
	}

	// Fetch extra hits to allow dedup (multiple chunks per article).
	// Run inside a transaction to increase HNSW ef_search — filtered queries
	// can cause the graph traversal to miss high-scoring results.
	fetchLimit := limit * 3
	var hits []entityHit
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		tx.Exec("SET LOCAL hnsw.ef_search = 400")

		q := tx.
			Table("embeddings e").
			Select("e.entity_id, 1 - (e.embedding <=> ?) AS score", centroidVec).
			Joins("JOIN submissions s ON s.id = e.entity_id").
			Where("e.entity_category = ? AND s.status = ? AND e.entity_id != ?",
				models.EntitySubmission, models.StatusPublished, articleID)

		if countryPath != "" {
			q = q.Joins("JOIN locations l ON l.id = s.location_id").
				Where("l.path LIKE ? OR l.path = ?", countryPath+"/%", countryPath)
		}

		return q.
			Order(tx.Raw("e.embedding <=> ?", centroidVec)).
			Limit(fetchLimit).
			Find(&hits).Error
	}); err != nil {
		return nil, fmt.Errorf("similar search: %w", err)
	}

	if len(hits) == 0 {
		return nil, nil
	}

	// Deduplicate by entity_id, keeping the best score per article
	type bestHit struct {
		score float64
	}
	seen := make(map[string]bestHit)
	var orderedIDs []string
	for _, h := range hits {
		existing, ok := seen[h.EntityID]
		if !ok || h.Score > existing.score {
			if !ok {
				orderedIDs = append(orderedIDs, h.EntityID)
			}
			seen[h.EntityID] = bestHit{score: h.Score}
		}
	}

	// Sort by score descending and take top N
	sort.Slice(orderedIDs, func(i, j int) bool {
		return seen[orderedIDs[i]].score > seen[orderedIDs[j]].score
	})
	if len(orderedIDs) > limit {
		orderedIDs = orderedIDs[:limit]
	}

	// Load full submission records
	var subs []models.Submission
	if err := s.db.WithContext(ctx).
		Where("id IN ? AND status = ?", orderedIDs, models.StatusPublished).
		Find(&subs).Error; err != nil {
		return nil, fmt.Errorf("load submissions: %w", err)
	}

	// Preserve score order
	subMap := make(map[string]models.Submission, len(subs))
	for _, sub := range subs {
		subMap[sub.ID.String()] = sub
	}
	result := make([]models.Submission, 0, len(orderedIDs))
	for _, id := range orderedIDs {
		if sub, ok := subMap[id]; ok {
			result = append(result, sub)
		}
	}

	return result, nil
}
