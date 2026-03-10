package sources

import (
	"context"
	"fmt"
)

// Taloussanomat (via IS) as business news source — Kauppalehti has no public RSS.
const taloussanomatFeedURL = "https://www.is.fi/rss/taloussanomat.xml"

type Kauppalehti struct{}

func NewKauppalehti() *Kauppalehti { return &Kauppalehti{} }

func (s *Kauppalehti) Name() string { return "kauppalehti" }

func (s *Kauppalehti) Fetch(ctx context.Context, n int) ([]RawItem, error) {
	rssItems, err := FetchRSS(ctx, taloussanomatFeedURL, n)
	if err != nil {
		return nil, fmt.Errorf("kauppalehti: %w", err)
	}

	items := make([]RawItem, 0, len(rssItems))
	for _, r := range rssItems {
		if r.Title == "" {
			continue
		}
		items = append(items, RawItem{
			SourceName:  "kauppalehti",
			OriginalURL: r.Link,
			Title:       r.Title,
			Summary:     r.Description,
			FullText:    r.Description,
			Language:    "fi",
		})
	}
	return items, nil
}
