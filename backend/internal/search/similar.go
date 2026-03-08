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

	// Use raw SQL for correct ORDER BY with pgvector operator binding.
	// SET LOCAL hnsw.ef_search ensures thorough graph exploration with filters.
	fetchLimit := limit * 3
	type simHit struct {
		EntityID string  `gorm:"column:entity_id"`
		Score    float64 `gorm:"column:score"`
	}
	var hits []simHit
	if err := s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		tx.Exec("SET LOCAL hnsw.ef_search = 400")

		if countryPath != "" {
			return tx.Raw(`
				SELECT e.entity_id, 1 - (e.embedding <=> ?) AS score
				FROM embeddings e
				JOIN submissions s ON s.id = e.entity_id
				JOIN locations l ON l.id = s.location_id
				WHERE e.entity_category = ? AND s.status = ? AND e.entity_id != ?
				  AND (l.path LIKE ? OR l.path = ?)
				ORDER BY e.embedding <=> ?
				LIMIT ?`,
				centroidVec, models.EntitySubmission, models.StatusPublished, articleID,
				countryPath+"/%", countryPath,
				centroidVec, fetchLimit,
			).Scan(&hits).Error
		}
		return tx.Raw(`
			SELECT e.entity_id, 1 - (e.embedding <=> ?) AS score
			FROM embeddings e
			JOIN submissions s ON s.id = e.entity_id
			WHERE e.entity_category = ? AND s.status = ? AND e.entity_id != ?
			ORDER BY e.embedding <=> ?
			LIMIT ?`,
			centroidVec, models.EntitySubmission, models.StatusPublished, articleID,
			centroidVec, fetchLimit,
		).Scan(&hits).Error
	}); err != nil {
		return nil, fmt.Errorf("similar search: %w", err)
	}

	if len(hits) == 0 {
		return nil, nil
	}

	// Deduplicate by entity_id, keeping the best score per article
	seen := make(map[string]float64)
	var orderedIDs []string
	for _, h := range hits {
		existing, ok := seen[h.EntityID]
		if !ok || h.Score > existing {
			if !ok {
				orderedIDs = append(orderedIDs, h.EntityID)
			}
			seen[h.EntityID] = h.Score
		}
	}

	// Sort by score descending and take top N
	sort.Slice(orderedIDs, func(i, j int) bool {
		return seen[orderedIDs[i]] > seen[orderedIDs[j]]
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
