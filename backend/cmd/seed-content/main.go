package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"github.com/localnews/backend/internal/agents"
	"github.com/localnews/backend/internal/cache"
	"github.com/localnews/backend/internal/config"
	"github.com/localnews/backend/internal/database"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
	"github.com/localnews/backend/internal/sources"
	"google.golang.org/genai"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func main() {
	baseURL := flag.String("base-url", "http://localhost:8000", "Backend API base URL")
	model := flag.String("model", "gemini-2.5-flash", "Gemini model for rewriting")
	perSource := flag.Int("per-source", 3, "Number of articles to fetch per source")
	srcList := flag.String("sources", "wikipedia,yle,seiska,iltasanomat,iltalehti,kauppalehti", "Comma-separated sources (also: puskaradio)")
	fbDataDir := flag.String("fb-data", "../scripts/fb_output", "Path to fb_scraper output dir (for puskaradio source)")
	dryRun := flag.Bool("dry-run", false, "Fetch and rewrite without publishing")
	flag.Parse()

	logger := log.New(os.Stdout, "[seed-content] ", log.LstdFlags)

	_ = godotenv.Load()
	cfg := config.Load()

	if cfg.GeminiAPIKey == "" {
		logger.Fatal("GEMINI_API_KEY is required")
	}

	// Database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		logger.Fatalf("database: %v", err)
	}
	db.Exec("CREATE EXTENSION IF NOT EXISTS vector")
	db.Exec("CREATE EXTENSION IF NOT EXISTS pg_trgm")
	if err := database.AutoMigrate(db); err != nil {
		logger.Fatalf("migrate: %v", err)
	}

	// Redis
	c, err := cache.New(cfg.RedisURL)
	if err != nil {
		logger.Fatalf("redis: %v", err)
	}

	// Auth service for JWT
	authSvc := services.NewAuthService(db, c, cfg.JWTSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL, cfg.SecureCookies)

	// Gemini client
	gemClient, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey:  cfg.GeminiAPIKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		logger.Fatalf("gemini: %v", err)
	}

	// Seed admin profile + generate token
	adminProfile := seedAdminProfile(db, logger)
	adminToken, err := authSvc.GenerateAccessToken(adminProfile)
	if err != nil {
		logger.Fatalf("admin token: %v", err)
	}

	// Seed a few agent profiles for article ownership
	personas := agents.Personas
	for _, p := range personas {
		seedAgentProfile(db, p, logger)
	}

	// Generate a dummy user token (required by APIClient but not used for batch)
	dummyToken := adminToken

	// Build sources
	enabledSources := parseSources(*srcList)
	var srcs []sources.Source
	for _, name := range enabledSources {
		switch name {
		case "wikipedia":
			srcs = append(srcs, sources.NewWikipedia())
		case "yle":
			srcs = append(srcs, sources.NewYLE())
		case "seiska":
			srcs = append(srcs, sources.NewSeiska())
		case "iltasanomat":
			srcs = append(srcs, sources.NewIltaSanomat())
		case "iltalehti":
			srcs = append(srcs, sources.NewIltalehti())
		case "kauppalehti":
			srcs = append(srcs, sources.NewKauppalehti())
		case "puskaradio":
			srcs = append(srcs, sources.NewPuskaradio(*fbDataDir))
		default:
			logger.Printf("Unknown source: %s (skipping)", name)
		}
	}

	if len(srcs) == 0 {
		logger.Fatal("No valid sources specified")
	}

	rewriter := sources.NewRewriter(gemClient, *model)
	client := agents.NewAPIClient(*baseURL, dummyToken, adminToken)
	ctx := context.Background()

	logger.Printf("Fetching %d articles per source from %d sources (model=%s, dry-run=%v)",
		*perSource, len(srcs), *model, *dryRun)

	var totalFetched, totalRewritten, totalPublished int

	for _, src := range srcs {
		logger.Printf("--- Fetching from %s ---", src.Name())

		items, err := src.Fetch(ctx, *perSource)
		if err != nil {
			logger.Printf("ERROR fetching %s: %v", src.Name(), err)
			continue
		}
		totalFetched += len(items)
		logger.Printf("  Fetched %d items from %s", len(items), src.Name())

		for _, item := range items {
			logger.Printf("  Rewriting: %q", truncate(item.Title, 60))

			article, err := rewriter.Rewrite(ctx, item)
			if err != nil {
				logger.Printf("  ERROR rewriting %q: %v", item.Title, err)
				continue
			}
			totalRewritten++

			logger.Printf("  -> %q [%s]", truncate(article.Title, 50), article.Category)

			if *dryRun {
				logger.Printf("  [DRY RUN] Would publish: %q (%s)", article.Title, article.Category)
				fmt.Printf("\n--- %s ---\nTitle: %s\nCategory: %s\nSummary: %s\n\n%s\n\n",
					item.SourceName, article.Title, article.Category, article.Summary,
					truncate(article.Content, 500))
				continue
			}

			// Pick random persona as owner
			persona := personas[rand.Intn(len(personas))]
			result, err := client.CreateArticleBatch(
				article.Title, article.Content, article.Category,
				persona.ID, article.Summary,
			)
			if err != nil {
				logger.Printf("  ERROR publishing: %v", err)
				continue
			}
			totalPublished++
			logger.Printf("  Published by %s (batch: %v)", persona.DisplayName, result["job_id"])

			// Small delay between publishes
			time.Sleep(time.Second)
		}

		// Delay between sources
		time.Sleep(2 * time.Second)
	}

	logger.Printf("=== Done: fetched=%d, rewritten=%d, published=%d ===",
		totalFetched, totalRewritten, totalPublished)
}

func parseSources(list string) []string {
	var result []string
	for _, s := range strings.Split(list, ",") {
		s = strings.TrimSpace(strings.ToLower(s))
		if s != "" {
			result = append(result, s)
		}
	}
	return result
}

func seedAgentProfile(db *gorm.DB, p agents.Persona, logger *log.Logger) {
	locationID := models.EspooLocationID()
	profile := models.Profile{
		ID:          p.ID,
		ProfileName: p.ProfileName,
		Email:       p.Email,
		Role:        models.RoleContributor,
		Permissions: models.DefaultPermissions(models.RoleContributor),
		LocationID:  &locationID,
		Public:      true,
		Meta: models.NewJSONB(models.ProfileMeta{
			Bio:       p.Bio,
			FirstName: strings.Split(p.DisplayName, " ")[0],
			LastName:  strings.SplitN(p.DisplayName, " ", 2)[1],
		}),
	}
	db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoNothing: true,
	}).Create(&profile)
}

func seedAdminProfile(db *gorm.DB, logger *log.Logger) *models.Profile {
	adminID := models.AgentAdminID()
	profile := models.Profile{
		ID:          adminID,
		ProfileName: "agent-admin",
		Email:       "agent-admin@agent.local",
		Role:        models.RoleAdmin,
		Permissions: models.DefaultPermissions(models.RoleAdmin),
		Public:      false,
	}
	db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoNothing: true,
	}).Create(&profile)

	db.First(&profile, "id = ?", adminID)
	logger.Printf("Admin profile: agent-admin (%s)", adminID)
	return &profile
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
