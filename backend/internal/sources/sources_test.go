package sources

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"testing"
	"time"

	"google.golang.org/genai"
)

// --- Unit tests (no network) ---

func TestParseRSS(t *testing.T) {
	rssXML := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <item>
      <title>Espoon kaupunginvaltuusto kokoontui</title>
      <link>https://example.com/article1</link>
      <description>Kaupunginvaltuuston kokous pidettiin maanantaina.</description>
      <pubDate>Mon, 10 Mar 2026 10:00:00 +0200</pubDate>
    </item>
    <item>
      <title>Uusi koulu avataan Tapiolassa</title>
      <link>https://example.com/article2</link>
      <description>Tapiolan uusi koulu avaa ovensa syksyllä.</description>
      <pubDate>Mon, 10 Mar 2026 11:00:00 +0200</pubDate>
    </item>
    <item>
      <title>Kolmas artikkeli</title>
      <link>https://example.com/article3</link>
      <description>Kolmannen artikkelin kuvaus.</description>
    </item>
  </channel>
</rss>`)

	t.Run("parse all items", func(t *testing.T) {
		items, err := ParseRSS(rssXML, 10)
		if err != nil {
			t.Fatalf("ParseRSS failed: %v", err)
		}
		if len(items) != 3 {
			t.Fatalf("expected 3 items, got %d", len(items))
		}
	})

	t.Run("limit items", func(t *testing.T) {
		items, err := ParseRSS(rssXML, 2)
		if err != nil {
			t.Fatalf("ParseRSS failed: %v", err)
		}
		if len(items) != 2 {
			t.Fatalf("expected 2 items, got %d", len(items))
		}
	})

	t.Run("item fields populated", func(t *testing.T) {
		items, err := ParseRSS(rssXML, 10)
		if err != nil {
			t.Fatalf("ParseRSS failed: %v", err)
		}
		// Find item by title (order is randomized)
		found := false
		for _, item := range items {
			if item.Title == "Espoon kaupunginvaltuusto kokoontui" {
				found = true
				if item.Link != "https://example.com/article1" {
					t.Errorf("expected link https://example.com/article1, got %s", item.Link)
				}
				if item.Description == "" {
					t.Error("expected non-empty description")
				}
				break
			}
		}
		if !found {
			t.Error("expected to find 'Espoon kaupunginvaltuusto kokoontui' in items")
		}
	})

	t.Run("empty feed", func(t *testing.T) {
		emptyRSS := []byte(`<?xml version="1.0"?><rss version="2.0"><channel></channel></rss>`)
		_, err := ParseRSS(emptyRSS, 5)
		if err == nil {
			t.Error("expected error for empty feed")
		}
	})

	t.Run("invalid XML", func(t *testing.T) {
		_, err := ParseRSS([]byte("not xml"), 5)
		if err == nil {
			t.Error("expected error for invalid XML")
		}
	})
}

func TestValidCategory(t *testing.T) {
	valid := []string{"council", "schools", "business", "events", "sports", "community", "culture", "safety", "health", "environment"}
	for _, cat := range valid {
		if !ValidCategory(cat) {
			t.Errorf("expected %q to be valid", cat)
		}
	}

	invalid := []string{"", "unknown", "tech", "politics", "COMMUNITY"}
	for _, cat := range invalid {
		if ValidCategory(cat) {
			t.Errorf("expected %q to be invalid", cat)
		}
	}
}

func TestRawItemFields(t *testing.T) {
	item := RawItem{
		SourceName:  "yle",
		OriginalURL: "https://yle.fi/article/1",
		Title:       "Test Article",
		Summary:     "This is a summary",
		FullText:    "This is the full text",
		Language:    "fi",
	}

	if item.SourceName == "" {
		t.Error("SourceName should not be empty")
	}
	if item.Title == "" {
		t.Error("Title should not be empty")
	}
	if item.Summary == "" {
		t.Error("Summary should not be empty")
	}
	if item.Language != "fi" {
		t.Errorf("expected Language 'fi', got %q", item.Language)
	}
}

func TestSourceNames(t *testing.T) {
	srcs := []Source{
		NewWikipedia(),
		NewYLE(),
		NewIltaSanomat(),
		NewIltalehti(),
		NewKauppalehti(),
		NewSeiska(),
		NewPuskaradio("/tmp/nonexistent"),
	}

	names := map[string]bool{}
	for _, src := range srcs {
		name := src.Name()
		if name == "" {
			t.Error("source name should not be empty")
		}
		if names[name] {
			t.Errorf("duplicate source name: %s", name)
		}
		names[name] = true
	}

	expected := []string{"wikipedia", "yle", "iltasanomat", "iltalehti", "kauppalehti", "seiska", "puskaradio"}
	for _, e := range expected {
		if !names[e] {
			t.Errorf("missing expected source: %s", e)
		}
	}
}

// --- Puskaradio tests (no network, uses temp files) ---

func TestPuskaradioFetch(t *testing.T) {
	// Create temp dir with sample scraped data
	dir := t.TempDir()
	groupDir := dir + "/turku_puskaradio"
	os.MkdirAll(groupDir, 0755)

	data := `{
		"group_url": "https://www.facebook.com/groups/turkupuskaradio",
		"group_name": "Puskaradio Turku",
		"post_count": 3,
		"posts": [
			{
				"text": "Onko kukaan huomannut että Leppävaaran aseman parkkipaikka on taas täynnä jo aamuyhdeksältä? Tämä on ollut ongelma jo kuukausia.",
				"images": ["https://scontent.example.com/img1.jpg"],
				"author": "Matti Meikäläinen",
				"timestamp": "2 t"
			},
			{
				"text": "Lyhyt",
				"images": [],
				"author": "Test",
				"timestamp": "1 h"
			},
			{
				"text": "Tapiolan uimahallin remontti etenee hienosti! Kävin katsomassa ja uudet tilat näyttävät todella upeilta. Erityisesti lasten allasosasto on nyt paljon isompi kuin ennen.",
				"images": [],
				"author": "Liisa Korhonen",
				"timestamp": "5 t"
			}
		]
	}`
	os.WriteFile(groupDir+"/posts.json", []byte(data), 0644)

	src := NewPuskaradio(dir)
	items, err := src.Fetch(context.Background(), 10)
	if err != nil {
		t.Fatalf("Puskaradio fetch failed: %v", err)
	}

	// Should skip the short post ("Lyhyt" < 50 chars)
	if len(items) != 2 {
		t.Fatalf("expected 2 items (short post filtered), got %d", len(items))
	}

	for _, item := range items {
		if item.SourceName != "puskaradio" {
			t.Errorf("expected SourceName 'puskaradio', got %q", item.SourceName)
		}
		if item.Language != "fi" {
			t.Errorf("expected Language 'fi', got %q", item.Language)
		}
		if item.Title == "" {
			t.Error("item should have a title")
		}
		if item.FullText == "" {
			t.Error("item should have FullText")
		}
	}
}

func TestPuskaradioNoFiles(t *testing.T) {
	dir := t.TempDir()
	src := NewPuskaradio(dir)
	_, err := src.Fetch(context.Background(), 5)
	if err == nil {
		t.Error("expected error when no posts.json files exist")
	}
}

func TestPuskaradioLimit(t *testing.T) {
	dir := t.TempDir()
	groupDir := dir + "/test_group"
	os.MkdirAll(groupDir, 0755)

	// Create 5 posts
	posts := make([]map[string]any, 5)
	for i := range posts {
		posts[i] = map[string]any{
			"text":   fmt.Sprintf("Tämä on testiviesti numero %d ja se on riittävän pitkä ylittääkseen viisikymmentä merkkiä.", i+1),
			"images": []string{},
			"author": "Testaaja",
		}
	}
	data, _ := json.Marshal(map[string]any{
		"group_url":  "https://facebook.com/groups/test",
		"group_name": "Test Group",
		"post_count": 5,
		"posts":      posts,
	})
	os.WriteFile(groupDir+"/posts.json", data, 0644)

	src := NewPuskaradio(dir)
	items, err := src.Fetch(context.Background(), 2)
	if err != nil {
		t.Fatalf("fetch failed: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items (limited), got %d", len(items))
	}
}

func TestExtractTitle(t *testing.T) {
	tests := []struct {
		input string
		want  string // just check non-empty and reasonable length
	}{
		{"Tämä on lyhyt viesti.", "Tämä on lyhyt viesti."},
		{"Leppävaaran aseman parkkipaikka on taas täynnä. Tämä on ollut ongelma kuukausia.", "Leppävaaran aseman parkkipaikka on taas täynnä."},
		{"Lyhyt", "Lyhyt"},
	}
	for _, tt := range tests {
		got := extractTitle(tt.input)
		if got == "" {
			t.Errorf("extractTitle(%q) returned empty", tt.input)
		}
		if len(got) > 110 {
			t.Errorf("extractTitle produced too long title: %d chars", len(got))
		}
	}
}

// --- Integration tests (require network) ---

func skipIfShort(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}
}

func TestWikipediaFetchLive(t *testing.T) {
	skipIfShort(t)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	src := NewWikipedia()
	items, err := src.Fetch(ctx, 1)
	if err != nil {
		t.Fatalf("Wikipedia fetch failed: %v", err)
	}
	if len(items) == 0 {
		t.Fatal("expected at least 1 item from Wikipedia")
	}

	item := items[0]
	if item.Title == "" {
		t.Error("Wikipedia item should have a title")
	}
	if item.Summary == "" {
		t.Error("Wikipedia item should have a summary")
	}
	if item.SourceName != "wikipedia" {
		t.Errorf("expected SourceName 'wikipedia', got %q", item.SourceName)
	}
	if item.Language != "fi" {
		t.Errorf("expected Language 'fi', got %q", item.Language)
	}
	t.Logf("Wikipedia item: %q (%d chars)", item.Title, len(item.Summary))
}

func TestYLEFetchLive(t *testing.T) {
	skipIfShort(t)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	src := NewYLE()
	items, err := src.Fetch(ctx, 3)
	if err != nil {
		t.Fatalf("YLE fetch failed: %v", err)
	}
	if len(items) == 0 {
		t.Fatal("expected at least 1 item from YLE")
	}

	for _, item := range items {
		if item.Title == "" {
			t.Error("YLE item should have a title")
		}
		if item.SourceName != "yle" {
			t.Errorf("expected SourceName 'yle', got %q", item.SourceName)
		}
	}
	t.Logf("YLE fetched %d items", len(items))
}

func TestISFetchLive(t *testing.T) {
	skipIfShort(t)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	src := NewIltaSanomat()
	items, err := src.Fetch(ctx, 3)
	if err != nil {
		t.Fatalf("IS fetch failed: %v", err)
	}
	if len(items) == 0 {
		t.Fatal("expected at least 1 item from Ilta-Sanomat")
	}
	t.Logf("IS fetched %d items", len(items))
}

func TestILFetchLive(t *testing.T) {
	skipIfShort(t)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	src := NewIltalehti()
	items, err := src.Fetch(ctx, 3)
	if err != nil {
		t.Fatalf("IL fetch failed: %v", err)
	}
	if len(items) == 0 {
		t.Fatal("expected at least 1 item from Iltalehti")
	}
	t.Logf("IL fetched %d items", len(items))
}

func TestKauppalehtiFetchLive(t *testing.T) {
	skipIfShort(t)

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	src := NewKauppalehti()
	items, err := src.Fetch(ctx, 3)
	if err != nil {
		t.Fatalf("Kauppalehti fetch failed: %v", err)
	}
	if len(items) == 0 {
		t.Fatal("expected at least 1 item from Kauppalehti")
	}
	t.Logf("Kauppalehti fetched %d items", len(items))
}

func TestSeiskaFetchLive(t *testing.T) {
	skipIfShort(t)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	src := NewSeiska()
	items, err := src.Fetch(ctx, 3)
	if err != nil {
		t.Logf("Seiska fetch failed (may be expected if all sources are down): %v", err)
		t.Skip("Seiska sources unavailable")
	}
	if len(items) == 0 {
		t.Skip("No items from Seiska sources")
	}
	t.Logf("Seiska fetched %d items", len(items))
}

// --- Rewriter test (requires GEMINI_API_KEY) ---

func TestRewriteWikipedia(t *testing.T) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		t.Skip("GEMINI_API_KEY not set, skipping rewriter test")
	}
	skipIfShort(t)

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// Fetch a real Wikipedia article
	wiki := NewWikipedia()
	items, err := wiki.Fetch(ctx, 1)
	if err != nil {
		t.Fatalf("Wikipedia fetch failed: %v", err)
	}
	if len(items) == 0 {
		t.Fatal("no Wikipedia items")
	}

	t.Logf("Source: %q", items[0].Title)

	// Rewrite it
	gemClient, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		t.Fatalf("gemini client: %v", err)
	}

	rewriter := NewRewriter(gemClient, "gemini-2.5-flash")
	article, err := rewriter.Rewrite(ctx, items[0])
	if err != nil {
		t.Fatalf("Rewrite failed: %v", err)
	}

	if article.Title == "" {
		t.Error("rewritten article should have a title")
	}
	if article.Content == "" {
		t.Error("rewritten article should have content")
	}
	if !ValidCategory(article.Category) {
		t.Errorf("invalid category: %q", article.Category)
	}
	if article.Summary == "" {
		t.Error("rewritten article should have a summary")
	}

	t.Logf("Rewritten: %q [%s]", article.Title, article.Category)
	t.Logf("Summary: %s", article.Summary)
	t.Logf("Content length: %d chars", len(article.Content))
}
