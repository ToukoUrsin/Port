package search

import (
	"context"
	"fmt"

	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
)

func (s *Service) Semantic(ctx context.Context, p Params) (*Result, error) {
	result := &Result{Mode: string(ModeSemantic)}

	queryVec, err := s.embedding.EmbedQuery(ctx, p.Query)
	if err != nil {
		return nil, fmt.Errorf("embed query: %w", err)
	}

	// Determine which entity categories to search
	type entityHit struct {
		EntityID       string  `gorm:"column:entity_id"`
		EntityCategory int16   `gorm:"column:entity_category"`
		ChunkText      string  `gorm:"column:chunk_text"`
		Score          float64 `gorm:"column:score"`
	}

	// Cosine similarity search via pgvector
	var hits []entityHit
	if p.LocationID != "" {
		// Pre-filter submissions by location via JOIN
		if p.Type == "" || p.Type == "submissions" {
			var subHits []entityHit
			if err := s.db.WithContext(ctx).
				Table("embeddings e").
				Select("e.entity_id, e.entity_category, e.chunk_text, 1 - (e.embedding <=> ?) AS score", queryVec).
				Joins("JOIN submissions s ON s.id = e.entity_id").
				Where("e.entity_category = ? AND s.status = ? AND s.location_id = ?", models.EntitySubmission, models.StatusPublished, p.LocationID).
				Order(s.db.Raw("e.embedding <=> ?", queryVec)).
				Limit(p.Limit).
				Find(&subHits).Error; err != nil {
				return nil, fmt.Errorf("vector search submissions: %w", err)
			}
			hits = append(hits, subHits...)
		}
		// Profile embeddings: no location filter
		if p.Type == "" || p.Type == "profiles" {
			var profHits []entityHit
			if err := s.db.WithContext(ctx).
				Table("embeddings").
				Select("entity_id, entity_category, chunk_text, 1 - (embedding <=> ?) AS score", queryVec).
				Where("entity_category = ?", models.EntityProfile).
				Order(s.db.Raw("embedding <=> ?", queryVec)).
				Limit(p.Limit).
				Find(&profHits).Error; err != nil {
				return nil, fmt.Errorf("vector search profiles: %w", err)
			}
			hits = append(hits, profHits...)
		}
	} else {
		// Submissions: JOIN to enforce published-only
		if p.Type == "" || p.Type == "submissions" {
			var subHits []entityHit
			if err := s.db.WithContext(ctx).
				Table("embeddings e").
				Select("e.entity_id, e.entity_category, e.chunk_text, 1 - (e.embedding <=> ?) AS score", queryVec).
				Joins("JOIN submissions s ON s.id = e.entity_id").
				Where("e.entity_category = ? AND s.status = ?", models.EntitySubmission, models.StatusPublished).
				Order(s.db.Raw("e.embedding <=> ?", queryVec)).
				Limit(p.Limit).
				Find(&subHits).Error; err != nil {
				return nil, fmt.Errorf("vector search submissions: %w", err)
			}
			hits = append(hits, subHits...)
		}
		// Profiles: no status filter needed
		if p.Type == "" || p.Type == "profiles" {
			var profHits []entityHit
			if err := s.db.WithContext(ctx).
				Table("embeddings").
				Select("entity_id, entity_category, chunk_text, 1 - (embedding <=> ?) AS score", queryVec).
				Where("entity_category = ?", models.EntityProfile).
				Order(s.db.Raw("embedding <=> ?", queryVec)).
				Limit(p.Limit).
				Find(&profHits).Error; err != nil {
				return nil, fmt.Errorf("vector search profiles: %w", err)
			}
			hits = append(hits, profHits...)
		}
	}

	// Deduplicate by entity_id, keeping the best chunk per entity
	type bestHit struct {
		score     float64
		chunkText string
		category  int16
	}
	seen := make(map[string]bestHit)
	var orderedIDs []string
	for _, h := range hits {
		existing, ok := seen[h.EntityID]
		if !ok || h.Score > existing.score {
			if !ok {
				orderedIDs = append(orderedIDs, h.EntityID)
			}
			seen[h.EntityID] = bestHit{score: h.Score, chunkText: h.ChunkText, category: h.EntityCategory}
		}
	}

	if len(orderedIDs) == 0 {
		return result, nil
	}

	// Build candidates for reranking
	candidates := make([]services.RankedResult, 0, len(orderedIDs))
	for _, id := range orderedIDs {
		h := seen[id]
		candidates = append(candidates, services.RankedResult{
			ID:    id,
			Score: h.score,
			Text:  h.chunkText,
		})
	}

	// Rerank
	limit := p.Limit
	if limit <= 0 {
		limit = 20
	}
	reranked, err := s.reranker.Rerank(ctx, p.Query, candidates, limit)
	if err != nil {
		return nil, fmt.Errorf("rerank: %w", err)
	}

	// Split IDs by category and load full records
	var submissionIDs, profileIDs []string
	for _, r := range reranked {
		h := seen[r.ID]
		switch h.category {
		case models.EntitySubmission:
			submissionIDs = append(submissionIDs, r.ID)
		case models.EntityProfile:
			profileIDs = append(profileIDs, r.ID)
		}
	}

	if len(submissionIDs) > 0 && (p.Type == "" || p.Type == "submissions") {
		var subs []models.Submission
		stmt := s.db.WithContext(ctx).Where("id IN ? AND status = ?", submissionIDs, models.StatusPublished)
		if p.LocationID != "" {
			stmt = stmt.Where("location_id = ?", p.LocationID)
		}
		if err := stmt.Find(&subs).Error; err != nil {
			return nil, fmt.Errorf("load submissions: %w", err)
		}
		// Preserve rerank order
		subMap := make(map[string]models.Submission, len(subs))
		for _, s := range subs {
			subMap[s.ID.String()] = s
		}
		for _, id := range submissionIDs {
			if s, ok := subMap[id]; ok {
				result.Submissions = append(result.Submissions, s)
			}
		}
	}

	if len(profileIDs) > 0 && (p.Type == "" || p.Type == "profiles") {
		var profs []models.Profile
		if err := s.db.WithContext(ctx).Where("id IN ?", profileIDs).Find(&profs).Error; err != nil {
			return nil, fmt.Errorf("load profiles: %w", err)
		}
		profMap := make(map[string]models.Profile, len(profs))
		for _, pr := range profs {
			profMap[pr.ID.String()] = pr
		}
		for _, id := range profileIDs {
			if pr, ok := profMap[id]; ok {
				result.Profiles = append(result.Profiles, pr)
			}
		}
	}

	return result, nil
}
