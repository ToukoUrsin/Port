package sources

import (
	"context"
	"fmt"
)

const iltaSanomatFeedURL = "https://www.is.fi/rss/tuoreimmat.xml"

type IltaSanomat struct{}

func NewIltaSanomat() *IltaSanomat { return &IltaSanomat{} }

func (s *IltaSanomat) Name() string { return "iltasanomat" }

func (s *IltaSanomat) Fetch(ctx context.Context, n int) ([]RawItem, error) {
	rssItems, err := FetchRSS(ctx, iltaSanomatFeedURL, n)
	if err != nil {
		return nil, fmt.Errorf("iltasanomat: %w", err)
	}

	items := make([]RawItem, 0, len(rssItems))
	for _, r := range rssItems {
		if r.Title == "" {
			continue
		}
		items = append(items, RawItem{
			SourceName:  "iltasanomat",
			OriginalURL: r.Link,
			Title:       r.Title,
			Summary:     r.Description,
			FullText:    r.Description,
			Language:    "fi",
		})
	}
	return items, nil
}
