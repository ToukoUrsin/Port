package sources

import (
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"os"
	"path/filepath"
	"strings"
)

// Puskaradio reads scraped Facebook group posts from the fb_scraper output directory.
// Expected format: scripts/fb_output/<group>/posts.json
type Puskaradio struct {
	dataDir string // path to fb_output directory
}

func NewPuskaradio(dataDir string) *Puskaradio {
	return &Puskaradio{dataDir: dataDir}
}

func (p *Puskaradio) Name() string { return "puskaradio" }

type scraperOutput struct {
	GroupURL  string       `json:"group_url"`
	GroupName string       `json:"group_name"`
	PostCount int          `json:"post_count"`
	Posts     []scraperPost `json:"posts"`
}

type scraperPost struct {
	Text        string   `json:"text"`
	Images      []string `json:"images"`
	Author      string   `json:"author"`
	Timestamp   string   `json:"timestamp"`
	Links       []string `json:"links"`
	LocalImages []string `json:"local_images"`
}

func (p *Puskaradio) Fetch(_ context.Context, n int) ([]RawItem, error) {
	// Find all posts.json files in the data directory
	pattern := filepath.Join(p.dataDir, "*", "posts.json")
	files, err := filepath.Glob(pattern)
	if err != nil {
		return nil, fmt.Errorf("puskaradio: glob %s: %w", pattern, err)
	}
	if len(files) == 0 {
		return nil, fmt.Errorf("puskaradio: no posts.json files found in %s", p.dataDir)
	}

	// Collect all posts from all groups
	var allPosts []postWithGroup
	for _, file := range files {
		data, err := os.ReadFile(file)
		if err != nil {
			continue
		}
		var output scraperOutput
		if err := json.Unmarshal(data, &output); err != nil {
			continue
		}
		for _, post := range output.Posts {
			if strings.TrimSpace(post.Text) == "" || len(post.Text) < 50 {
				continue // skip empty/very short posts
			}
			allPosts = append(allPosts, postWithGroup{
				post:      post,
				groupName: output.GroupName,
				groupURL:  output.GroupURL,
			})
		}
	}

	if len(allPosts) == 0 {
		return nil, fmt.Errorf("puskaradio: no usable posts found in %d files", len(files))
	}

	// Shuffle and pick n
	rand.Shuffle(len(allPosts), func(i, j int) {
		allPosts[i], allPosts[j] = allPosts[j], allPosts[i]
	})
	if n > len(allPosts) {
		n = len(allPosts)
	}

	items := make([]RawItem, 0, n)
	for _, pg := range allPosts[:n] {
		// Use first sentence or first 80 chars as title
		title := extractTitle(pg.post.Text)

		var imageURL string
		if len(pg.post.Images) > 0 {
			imageURL = pg.post.Images[0]
		}

		items = append(items, RawItem{
			SourceName:  "puskaradio",
			OriginalURL: pg.groupURL,
			Title:       title,
			Summary:     truncateText(pg.post.Text, 300),
			FullText:    pg.post.Text,
			ImageURL:    imageURL,
			Language:    "fi",
		})
	}

	return items, nil
}

type postWithGroup struct {
	post      scraperPost
	groupName string
	groupURL  string
}

// extractTitle takes the first sentence or first 80 chars from text.
func extractTitle(text string) string {
	text = strings.TrimSpace(text)
	// Try first sentence (ending with . ! or ?)
	for i, r := range text {
		if i > 10 && (r == '.' || r == '!' || r == '?') {
			if i <= 100 {
				return text[:i+1]
			}
			break
		}
	}
	// Fall back to first 80 chars
	if len(text) > 80 {
		// Break at word boundary
		cut := 80
		for cut > 50 && text[cut] != ' ' {
			cut--
		}
		return text[:cut] + "..."
	}
	return text
}

func truncateText(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
