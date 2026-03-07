package search

import "sort"

const rrfK = 60

// MergeRRF takes multiple ranked ID lists and returns a single list
// merged by Reciprocal Rank Fusion score: score(d) = sum(1 / (k + rank_i(d))).
func MergeRRF(lists ...[]string) []string {
	scores := make(map[string]float64)

	for _, list := range lists {
		for rank, id := range list {
			scores[id] += 1.0 / float64(rrfK+rank+1) // rank is 0-indexed, +1 for 1-indexed
		}
	}

	type entry struct {
		id    string
		score float64
	}
	entries := make([]entry, 0, len(scores))
	for id, score := range scores {
		entries = append(entries, entry{id, score})
	}
	sort.Slice(entries, func(a, b int) bool {
		return entries[a].score > entries[b].score
	})

	result := make([]string, len(entries))
	for i, e := range entries {
		result[i] = e.id
	}
	return result
}
