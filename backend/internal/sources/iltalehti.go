package sources

import (
	"context"
	"fmt"
)

const iltalehtiFeedURL = "https://www.iltalehti.fi/rss/uutiset.xml"

type Iltalehti struct{}

func NewIltalehti() *Iltalehti { return &Iltalehti{} }

func (s *Iltalehti) Name() string { return "iltalehti" }

func (s *Iltalehti) Fetch(ctx context.Context, n int) ([]RawItem, error) {
	rssItems, err := FetchRSS(ctx, iltalehtiFeedURL, n)
	if err != nil {
		return nil, fmt.Errorf("iltalehti: %w", err)
	}

	items := make([]RawItem, 0, len(rssItems))
	for _, r := range rssItems {
		if r.Title == "" {
			continue
		}
		items = append(items, RawItem{
			SourceName:  "iltalehti",
			OriginalURL: r.Link,
			Title:       r.Title,
			Summary:     r.Description,
			FullText:    r.Description,
			Language:    "fi",
		})
	}
	return items, nil
}
