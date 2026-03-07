package search

import (
	"context"
	"log"

	"github.com/localnews/backend/internal/models"
	"golang.org/x/sync/errgroup"
)

func (s *Service) Hybrid(ctx context.Context, p Params) (*Result, error) {
	result := &Result{Mode: string(ModeHybrid)}

	// Run keyword and semantic concurrently
	var kwResult, semResult *Result

	// Use a higher internal limit for merging
	internalParams := p
	internalParams.Limit = p.Limit * 3
	if internalParams.Limit > 100 {
		internalParams.Limit = 100
	}
	internalParams.Offset = 0

	g, gctx := errgroup.WithContext(ctx)

	g.Go(func() error {
		var err error
		kwResult, err = s.Keyword(gctx, internalParams)
		return err
	})

	g.Go(func() error {
		var err error
		semResult, err = s.Semantic(gctx, internalParams)
		if err != nil {
			// Semantic failure is non-fatal in hybrid mode — fall back to keyword only
			log.Printf("hybrid: semantic search failed, falling back to keyword: %v", err)
			semResult = &Result{}
			return nil
		}
		return nil
	})

	if err := g.Wait(); err != nil {
		return nil, err
	}

	// Merge submissions via RRF
	if p.Type == "" || p.Type == "submissions" {
		kwIDs := submissionIDs(kwResult.Submissions)
		semIDs := submissionIDs(semResult.Submissions)
		mergedIDs := MergeRRF(kwIDs, semIDs)

		// Build lookup from both result sets
		subMap := make(map[string]models.Submission)
		for _, s := range kwResult.Submissions {
			subMap[s.ID.String()] = s
		}
		for _, s := range semResult.Submissions {
			subMap[s.ID.String()] = s
		}

		// Apply offset/limit to merged results
		start := p.Offset
		if start > len(mergedIDs) {
			start = len(mergedIDs)
		}
		end := start + p.Limit
		if end > len(mergedIDs) {
			end = len(mergedIDs)
		}

		for _, id := range mergedIDs[start:end] {
			if sub, ok := subMap[id]; ok {
				result.Submissions = append(result.Submissions, sub)
			}
		}
	}

	// Merge profiles via RRF
	if p.Type == "" || p.Type == "profiles" {
		kwIDs := profileIDs(kwResult.Profiles)
		semIDs := profileIDs(semResult.Profiles)
		mergedIDs := MergeRRF(kwIDs, semIDs)

		profMap := make(map[string]models.Profile)
		for _, pr := range kwResult.Profiles {
			profMap[pr.ID.String()] = pr
		}
		for _, pr := range semResult.Profiles {
			profMap[pr.ID.String()] = pr
		}

		start := p.Offset
		if start > len(mergedIDs) {
			start = len(mergedIDs)
		}
		end := start + p.Limit
		if end > len(mergedIDs) {
			end = len(mergedIDs)
		}

		for _, id := range mergedIDs[start:end] {
			if pr, ok := profMap[id]; ok {
				result.Profiles = append(result.Profiles, pr)
			}
		}
	}

	return result, nil
}

func submissionIDs(subs []models.Submission) []string {
	ids := make([]string, len(subs))
	for i, s := range subs {
		ids[i] = s.ID.String()
	}
	return ids
}

func profileIDs(profs []models.Profile) []string {
	ids := make([]string, len(profs))
	for i, p := range profs {
		ids[i] = p.ID.String()
	}
	return ids
}
