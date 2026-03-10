package sources

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

const (
	seiskaRSSURL  = "https://www.seiska.fi/rss"
	seiskaHTMLURL = "https://www.seiska.fi"
	yleViihdeURL  = "https://feeds.yle.fi/uutiset/v1/recent.rss?publisherIds=YLE_UUTISET&concepts=18-36066"
)

type Seiska struct{}

func NewSeiska() *Seiska { return &Seiska{} }

func (s *Seiska) Name() string { return "seiska" }

func (s *Seiska) Fetch(ctx context.Context, n int) ([]RawItem, error) {
	// Try RSS first
	items, err := s.fetchRSS(ctx, n)
	if err == nil && len(items) > 0 {
		return items, nil
	}

	// Fallback: scrape headlines from HTML
	items, err = s.fetchHTML(ctx, n)
	if err == nil && len(items) > 0 {
		return items, nil
	}

	// Final fallback: YLE viihde (entertainment)
	items, err = s.fetchYLEViihde(ctx, n)
	if err != nil {
		return nil, fmt.Errorf("seiska: all sources failed: %w", err)
	}
	return items, nil
}

func (s *Seiska) fetchRSS(ctx context.Context, n int) ([]RawItem, error) {
	rssItems, err := FetchRSS(ctx, seiskaRSSURL, n)
	if err != nil {
		return nil, err
	}

	items := make([]RawItem, 0, len(rssItems))
	for _, r := range rssItems {
		if r.Title == "" {
			continue
		}
		items = append(items, RawItem{
			SourceName:  "seiska",
			OriginalURL: r.Link,
			Title:       r.Title,
			Summary:     r.Description,
			FullText:    r.Description,
			Language:    "fi",
		})
	}
	return items, nil
}

var titleRe = regexp.MustCompile(`<h[23][^>]*>\s*<a[^>]+href="([^"]*)"[^>]*>([^<]+)</a>`)

func (s *Seiska) fetchHTML(ctx context.Context, n int) ([]RawItem, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", seiskaHTMLURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; PortNewsBot/1.0)")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	matches := titleRe.FindAllStringSubmatch(string(body), -1)
	if len(matches) == 0 {
		return nil, fmt.Errorf("no headlines found in HTML")
	}

	var items []RawItem
	for _, m := range matches {
		if len(items) >= n {
			break
		}
		link := m[1]
		title := strings.TrimSpace(m[2])
		if title == "" {
			continue
		}
		if !strings.HasPrefix(link, "http") {
			link = seiskaHTMLURL + link
		}
		items = append(items, RawItem{
			SourceName:  "seiska",
			OriginalURL: link,
			Title:       title,
			Summary:     title, // HTML scraping only gets headlines
			FullText:    title,
			Language:    "fi",
		})
	}

	if len(items) == 0 {
		return nil, fmt.Errorf("no usable headlines scraped")
	}
	return items, nil
}

func (s *Seiska) fetchYLEViihde(ctx context.Context, n int) ([]RawItem, error) {
	rssItems, err := FetchRSS(ctx, yleViihdeURL, n)
	if err != nil {
		return nil, err
	}

	items := make([]RawItem, 0, len(rssItems))
	for _, r := range rssItems {
		if r.Title == "" {
			continue
		}
		items = append(items, RawItem{
			SourceName:  "seiska",
			OriginalURL: r.Link,
			Title:       r.Title,
			Summary:     r.Description,
			FullText:    r.Description,
			Language:    "fi",
		})
	}
	return items, nil
}
