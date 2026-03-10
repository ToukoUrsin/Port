package sources

import (
	"context"
	"encoding/xml"
	"fmt"
	"io"
	"math/rand"
	"net/http"
	"time"
)

// RawItem represents a piece of source material fetched from an external source.
type RawItem struct {
	SourceName  string // "wikipedia", "yle", "seiska", "iltasanomat", "iltalehti", "kauppalehti"
	OriginalURL string
	Title       string
	Summary     string
	FullText    string
	ImageURL    string
	Language    string // "fi"
}

// Source fetches raw content from an external provider.
type Source interface {
	Name() string
	Fetch(ctx context.Context, n int) ([]RawItem, error)
}

// RSS parsing helpers shared by YLE, IS, IL, Kauppalehti, Seiska

type rssResponse struct {
	Channel struct {
		Items []RSSItem `xml:"item"`
	} `xml:"channel"`
}

type RSSItem struct {
	Title       string `xml:"title"`
	Link        string `xml:"link"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
}

// FetchRSS fetches and parses an RSS feed, returning up to n random items.
func FetchRSS(ctx context.Context, feedURL string, n int) ([]RSSItem, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", feedURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("User-Agent", "PortNewsBot/1.0")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch %s: %w", feedURL, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("fetch %s: HTTP %d", feedURL, resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	return ParseRSS(body, n)
}

// ParseRSS parses RSS XML bytes and returns up to n random items.
func ParseRSS(data []byte, n int) ([]RSSItem, error) {
	var feed rssResponse
	if err := xml.Unmarshal(data, &feed); err != nil {
		return nil, fmt.Errorf("parse RSS: %w", err)
	}

	items := feed.Channel.Items
	if len(items) == 0 {
		return nil, fmt.Errorf("RSS feed has no items")
	}

	// Shuffle and pick n
	rand.Shuffle(len(items), func(i, j int) {
		items[i], items[j] = items[j], items[i]
	})
	if n > len(items) {
		n = len(items)
	}
	return items[:n], nil
}
