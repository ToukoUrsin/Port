package main

import (
	"log"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/localnews/backend/internal/cache"
	"github.com/localnews/backend/internal/config"
	"github.com/localnews/backend/internal/database"
	"github.com/localnews/backend/internal/handlers"
	"github.com/localnews/backend/internal/middleware"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
)

func main() {
	_ = godotenv.Load()
	cfg := config.Load()

	// Database
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	// Create extensions before GORM auto-migrate (needed for vector type)
	db.Exec("CREATE EXTENSION IF NOT EXISTS vector")
	db.Exec("CREATE EXTENSION IF NOT EXISTS pg_trgm")

	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	if err := database.RunMigrations(db, "migrations"); err != nil {
		log.Printf("seed migrations: %v (may be normal if already applied)", err)
	}

	// Redis cache
	c, err := cache.New(cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}

	// Services
	authSvc := services.NewAuthService(db, c, cfg.JWTSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL)
	accessSvc := services.NewAccessService(db)
	mediaSvc := services.NewMediaService(cfg.MediaStoragePath)

	// Pipeline stubs
	transcription := services.NewStubTranscriptionService()
	generation := services.NewStubGenerationService()
	review := services.NewStubReviewService()
	photoDesc := services.NewStubPhotoDescriptionService()
	chunker := services.NewStubChunkerService()
	embedding := services.NewNoOpEmbeddingService()
	pipelineSvc := services.NewPipelineService(db, transcription, generation, review, photoDesc, chunker, embedding)

	// Handler
	h := handlers.NewHandler(db, c, authSvc, accessSvc, mediaSvc, pipelineSvc)

	// Router
	r := gin.Default()
	middleware.SetupCORS(r, cfg.AllowedOrigins)

	jwtSecret := []byte(cfg.JWTSecret)

	// --- Public routes ---
	public := r.Group("/api")
	{
		public.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// Auth
		public.POST("/auth/register", h.Register)
		public.POST("/auth/login", h.Login)
		public.POST("/auth/refresh", h.Refresh)

		// Public reads
		public.GET("/articles", h.ListArticles)
		public.GET("/articles/:id", h.GetArticle)
		public.GET("/search", h.Search)
		public.GET("/locations", h.ListLocations)
		public.GET("/locations/:slug", h.GetLocation)
		public.GET("/locations/:slug/articles", h.LocationArticles)
		public.GET("/articles/:id/replies", h.ListReplies)
	}

	// --- Optional auth routes (public but enhanced with auth context) ---
	optAuth := r.Group("/api", middleware.OptionalAuth(jwtSecret))
	{
		optAuth.GET("/profiles/:id", h.GetProfile)
	}

	// --- Authenticated routes ---
	authed := r.Group("/api", middleware.Auth(jwtSecret))
	{
		authed.POST("/auth/logout", h.Logout)

		// Submissions
		authed.POST("/submissions", h.CreateSubmission)
		authed.GET("/submissions", h.ListSubmissions)
		authed.GET("/submissions/:id", h.GetSubmission)
		authed.PUT("/submissions/:id", h.UpdateSubmission)
		authed.DELETE("/submissions/:id", h.DeleteSubmission)
		authed.GET("/submissions/:id/stream", h.StreamPipeline)

		// Publish + refine + appeal
		authed.POST("/submissions/:id/publish", h.PublishSubmission)
		authed.POST("/submissions/:id/refine", h.RefineSubmission)
		authed.POST("/submissions/:id/appeal", h.AppealSubmission)

		// Profiles
		authed.GET("/profiles/me", h.GetMyProfile)
		authed.PUT("/profiles/:id", h.UpdateProfile)

		// Replies
		authed.POST("/submissions/:id/replies", h.CreateReply)
		authed.PUT("/replies/:id", h.UpdateReply)
		authed.DELETE("/replies/:id", h.DeleteReply)

		// Follows
		authed.POST("/follows", h.CreateFollow)
		authed.DELETE("/follows/:id", h.DeleteFollow)
	}

	// --- Editor+ routes (articles editing) ---
	editor := r.Group("/api", middleware.Auth(jwtSecret), middleware.RequireRole(1))
	{
		editor.PUT("/articles/:id", h.UpdateArticle)
	}

	// --- Admin routes ---
	admin := r.Group("/api", middleware.Auth(jwtSecret), middleware.RequireRole(2))
	{
		admin.PUT("/profiles/:id/role", h.ChangeUserRole)
		admin.POST("/locations", h.CreateLocation)
		admin.PUT("/locations/:id", h.UpdateLocation)
	}

	// --- Moderation routes ---
	mod := r.Group("/api", middleware.Auth(jwtSecret), middleware.RequirePerm(models.PermModerate))
	{
		mod.PUT("/replies/:id/moderate", h.ModerateReply)
	}

	log.Printf("Starting server on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server: %v", err)
	}
}
