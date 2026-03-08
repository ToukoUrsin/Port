package main

import (
	"context"
	"flag"
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
	"google.golang.org/genai"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func main() {
	baseURL := flag.String("base-url", "http://localhost:8000", "Backend API base URL")
	agentNames := flag.String("agents", "", "Comma-separated agent names to run (default: random subset)")
	maxIter := flag.Int("max-iter", 20, "Max tool-call rounds per agent")
	model := flag.String("model", "gemini-2.5-flash", "Gemini model for agents")
	minAgents := flag.Int("min", 5, "Minimum number of random agents to activate")
	maxAgents := flag.Int("max", 10, "Maximum number of random agents to activate")
	flag.Parse()

	logger := log.New(os.Stdout, "[agents] ", log.LstdFlags)

	// Load env + config
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

	// Auth service for JWT generation
	authSvc := services.NewAuthService(db, c, cfg.JWTSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL, cfg.SecureCookies)

	// Gemini client
	gemClient, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey:  cfg.GeminiAPIKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		logger.Fatalf("gemini: %v", err)
	}

	// Select personas: explicit names or random subset
	personas := agents.Personas
	if *agentNames != "" {
		names := strings.Split(*agentNames, ",")
		nameSet := make(map[string]bool)
		for _, n := range names {
			nameSet[strings.TrimSpace(strings.ToLower(n))] = true
		}
		var filtered []agents.Persona
		for _, p := range personas {
			firstName := strings.ToLower(strings.Split(p.DisplayName, " ")[0])
			if nameSet[firstName] || nameSet[p.ProfileName] {
				filtered = append(filtered, p)
			}
		}
		if len(filtered) == 0 {
			logger.Fatalf("No matching agents found for: %s", *agentNames)
		}
		personas = filtered
	} else {
		// Random subset: pick between min and max agents
		count := *minAgents + rand.Intn(*maxAgents-*minAgents+1)
		if count > len(personas) {
			count = len(personas)
		}
		rand.Shuffle(len(personas), func(i, j int) {
			personas[i], personas[j] = personas[j], personas[i]
		})
		personas = personas[:count]
		logger.Printf("Randomly selected %d agents for this session", count)
	}

	// Seed agent profiles + generate tokens
	adminProfile := seedAdminProfile(db, logger)
	adminToken, err := authSvc.GenerateAccessToken(adminProfile)
	if err != nil {
		logger.Fatalf("admin token: %v", err)
	}

	type agentSetup struct {
		persona agents.Persona
		token   string
	}

	var setups []agentSetup
	for _, p := range personas {
		profile := seedAgentProfile(db, p, logger)
		token, err := authSvc.GenerateAccessToken(profile)
		if err != nil {
			logger.Fatalf("token for %s: %v", p.ProfileName, err)
		}
		setups = append(setups, agentSetup{persona: p, token: token})
	}

	logger.Printf("Running %d agent(s) sequentially (model=%s, max-iter=%d)", len(setups), *model, *maxIter)

	// Run agents one at a time
	for _, s := range setups {
		client := agents.NewAPIClient(*baseURL, s.token, adminToken)
		agent := agents.NewAgent(s.persona, client, gemClient, *model, *maxIter, logger)

		logger.Printf("--- Starting %s ---", s.persona.DisplayName)
		start := time.Now()

		if err := agent.Run(context.Background()); err != nil {
			logger.Printf("Agent %s error: %v", s.persona.ProfileName, err)
		}

		logger.Printf("--- %s finished in %s ---", s.persona.DisplayName, time.Since(start).Round(time.Second))
	}

	logger.Println("All agents complete.")
}

func seedAgentProfile(db *gorm.DB, p agents.Persona, logger *log.Logger) *models.Profile {
	locationID := models.KirkkonummiLocationID()
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

	// Re-fetch to get all fields populated
	db.First(&profile, "id = ?", p.ID)
	logger.Printf("Seeded profile: %s (%s)", p.DisplayName, p.ID)
	return &profile
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
	logger.Printf("Seeded admin profile: agent-admin (%s)", adminID)
	return &profile
}
