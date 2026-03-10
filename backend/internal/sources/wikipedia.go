package sources

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const wikipediaRandomURL = "https://fi.wikipedia.org/api/rest_v1/page/random/summary"

type Wikipedia struct{}

func NewWikipedia() *Wikipedia { return &Wikipedia{} }

func (w *Wikipedia) Name() string { return "wikipedia" }

func (w *Wikipedia) Fetch(ctx context.Context, n int) ([]RawItem, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	var items []RawItem

	for i := 0; i < n+5; i++ { // fetch extra to compensate for stubs
		if len(items) >= n {
			break
		}
		if i > 0 {
			time.Sleep(500 * time.Millisecond)
		}

		item, err := fetchWikipediaRandom(ctx, client)
		if err != nil {
			continue // skip failures, try next
		}
		if len(item.Summary) < 100 {
			continue // skip stubs
		}
		items = append(items, *item)
	}

	if len(items) == 0 {
		return nil, fmt.Errorf("wikipedia: could not fetch any articles")
	}
	return items, nil
}

type wikiSummary struct {
	Title   string `json:"title"`
	Extract string `json:"extract"`
	Content struct {
		Desktop struct {
			Page string `json:"page"`
		} `json:"desktop"`
	} `json:"content_urls"`
	Thumbnail struct {
		Source string `json:"source"`
	} `json:"thumbnail"`
}

func fetchWikipediaRandom(ctx context.Context, client *http.Client) (*RawItem, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", wikipediaRandomURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "PortNewsBot/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var summary wikiSummary
	if err := json.Unmarshal(body, &summary); err != nil {
		return nil, err
	}

	return &RawItem{
		SourceName:  "wikipedia",
		OriginalURL: summary.Content.Desktop.Page,
		Title:       summary.Title,
		Summary:     summary.Extract,
		FullText:    summary.Extract,
		ImageURL:    summary.Thumbnail.Source,
		Language:    "fi",
	}, nil
}
