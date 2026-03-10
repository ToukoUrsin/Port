package sources

import (
	"context"
	"fmt"
)

const yleFeedURL = "https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_UUTISET"

type YLE struct{}

func NewYLE() *YLE { return &YLE{} }

func (y *YLE) Name() string { return "yle" }

func (y *YLE) Fetch(ctx context.Context, n int) ([]RawItem, error) {
	rssItems, err := FetchRSS(ctx, yleFeedURL, n)
	if err != nil {
		return nil, fmt.Errorf("yle: %w", err)
	}

	items := make([]RawItem, 0, len(rssItems))
	for _, r := range rssItems {
		if r.Title == "" {
			continue
		}
		items = append(items, RawItem{
			SourceName:  "yle",
			OriginalURL: r.Link,
			Title:       r.Title,
			Summary:     r.Description,
			FullText:    r.Description,
			Language:    "fi",
		})
	}
	return items, nil
}
