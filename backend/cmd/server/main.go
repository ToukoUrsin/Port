package main

import (
	"context"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/localnews/backend/internal/cache"
	"github.com/localnews/backend/internal/config"
	"github.com/localnews/backend/internal/database"
	"github.com/localnews/backend/internal/handlers"
	"github.com/localnews/backend/internal/middleware"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/search"
	"github.com/localnews/backend/internal/services"
	"google.golang.org/genai"
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
		log.Fatalf("migrations: %v", err)
	}

	// Redis cache
	c, err := cache.New(cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}

	// Services
	authSvc := services.NewAuthService(db, c, cfg.JWTSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL, cfg.SecureCookies)
	accessSvc := services.NewAccessService(db)
	mediaSvc := services.NewMediaService(cfg.MediaStoragePath)

	// Shared Gemini client — used for embedding, generation, review, and photo description
	var geminiClient *genai.Client
	if cfg.GeminiAPIKey != "" {
		var err error
		geminiClient, err = genai.NewClient(context.Background(), &genai.ClientConfig{
			APIKey:  cfg.GeminiAPIKey,
			Backend: genai.BackendGeminiAPI,
		})
		if err != nil {
			log.Printf("gemini client: %v (falling back to stubs)", err)
		}
	}

	// Embedding service
	var embeddingSvc services.EmbeddingService
	if geminiClient != nil {
		embeddingSvc = services.NewGeminiEmbeddingService(db, geminiClient, cfg.EmbeddingModel, cfg.EmbeddingDimensions)
		log.Printf("Gemini embedding enabled (model=%s, dims=%d)", cfg.EmbeddingModel, cfg.EmbeddingDimensions)
	} else {
		embeddingSvc = services.NewNoOpEmbeddingService()
	}

	// Generation service
	var generation services.GenerationService
	if geminiClient != nil {
		generation = services.NewGeminiGenerationService(geminiClient, cfg.GenerationModel)
		log.Printf("Gemini generation enabled (model=%s)", cfg.GenerationModel)
	} else {
		generation = services.NewStubGenerationService()
	}

	// Review service
	var review services.ReviewService
	if geminiClient != nil {
		review = services.NewGeminiReviewService(geminiClient, cfg.GenerationModel)
		log.Printf("Gemini review enabled (model=%s)", cfg.GenerationModel)
	} else {
		review = services.NewStubReviewService()
	}

	// Photo description service
	var photoDesc services.PhotoDescriptionService
	if geminiClient != nil {
		photoDesc = services.NewGeminiPhotoDescriptionService(geminiClient, cfg.GenerationModel, cfg.MediaStoragePath)
	} else {
		photoDesc = services.NewStubPhotoDescriptionService()
	}

	// Reranker — real ONNX if model path configured, otherwise passthrough
	var rerankerSvc services.RerankerService
	if cfg.RerankerModelPath != "" {
		onnxReranker, err := services.NewONNXRerankerService(cfg.RerankerModelPath, cfg.RerankerVocabPath, cfg.ONNXLibPath)
		if err != nil {
			log.Printf("onnx reranker: %v (falling back to passthrough)", err)
			rerankerSvc = services.NewPassthroughReranker()
		} else {
			rerankerSvc = onnxReranker
			defer onnxReranker.Close()
			log.Printf("ONNX reranker enabled (model=%s)", cfg.RerankerModelPath)
		}
	} else {
		rerankerSvc = services.NewPassthroughReranker()
	}

	// Transcription service
	var transcription services.TranscriptionService
	if cfg.ElevenLabsAPIKey != "" {
		transcription = services.NewElevenLabsTranscriptionService(cfg.ElevenLabsAPIKey, cfg.MediaStoragePath)
		log.Printf("ElevenLabs transcription enabled")
	} else {
		transcription = services.NewStubTranscriptionService()
	}

	// Pipeline
	chunker := services.NewStubChunkerService()
	pipelineSvc := services.NewPipelineService(db, transcription, generation, review, photoDesc, chunker, embeddingSvc)

	// Batch service (admin batch publishing)
	var batchSvc *services.BatchService
	if cfg.AdminAPIToken != "" {
		batchSvc = services.NewBatchService(db, c, chunker, embeddingSvc, cfg.BatchDelay, cfg.BatchWorkers)
		log.Printf("Admin batch API enabled (%d workers, %s delay)", cfg.BatchWorkers, cfg.BatchDelay)
	}

	// Search service
	searchSvc := search.NewService(db, embeddingSvc, rerankerSvc)

	// Stats service
	geoResolver := services.NewDemoGeoResolver()
	statsSvc := services.NewStatsService(c)

	// Handler
	h := handlers.NewHandler(db, c, cfg, authSvc, accessSvc, mediaSvc, pipelineSvc, searchSvc, batchSvc, statsSvc)

	// Router
	r := gin.New()
	r.SetTrustedProxies(cfg.TrustedProxies)
	middleware.SetupCORS(r, cfg.AllowedOrigins) // CORS must be first — before ErrorSanitizer buffers the response
	r.Use(middleware.ErrorSanitizer())
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// Upload size limit
	r.MaxMultipartMemory = int64(cfg.MaxUploadSizeMB) * 1024 * 1024

	// Backwards-compatible redirect for existing article markdown referencing /uploads/
	r.GET("/uploads/:submissionID/:filename", func(c *gin.Context) {
		subID := c.Param("submissionID")
		fname := c.Param("filename")
		c.Redirect(http.StatusMovedPermanently, "/api/media/"+subID+"/"+fname)
	})

	// Rate limiting
	rl := middleware.NewRateLimiter(c.Client(), cfg)
	r.Use(rl.Middleware())

	// Stats tracking (after rate limiter so only allowed requests are tracked)
	r.Use(middleware.StatsTracker(statsSvc, geoResolver))

	jwtSecret := []byte(cfg.JWTSecret)

	// Authenticated media serving
	mediaGroup := r.Group("/api", middleware.OptionalAuth(jwtSecret))
	mediaGroup.GET("/media/:submissionID/:filename", h.ServeMedia)

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
		public.GET("/auth/google", h.GoogleRedirect)
		public.GET("/auth/google/callback", h.GoogleCallback)
		public.GET("/auth/config", h.AuthConfig)

		// Public reads
		public.GET("/profiles/check-name", h.CheckProfileName)
		public.GET("/articles", h.ListArticles)
		public.GET("/articles/:id", h.GetArticle)
		public.GET("/search", h.Search)
		public.GET("/search/sessions/:id", h.SearchSession)
		public.GET("/locations", h.ListLocations)
		public.GET("/locations/:slug", h.GetLocation)
		public.GET("/locations/:slug/articles", h.LocationArticles)
		public.GET("/articles/:id/replies", h.ListReplies)
		public.GET("/articles/:id/similar", h.SimilarArticles)
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
		authed.PUT("/auth/password", h.ChangePassword)

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

		// Flagging
		authed.POST("/articles/:id/flag", h.FlagSubmission)
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
		admin.GET("/admin/stats", h.GetAdminStats)
		admin.GET("/admin/stats/stream", h.StreamAdminStats)
	}

	// --- Moderation routes ---
	mod := r.Group("/api", middleware.Auth(jwtSecret), middleware.RequirePerm(models.PermModerate))
	{
		mod.PUT("/replies/:id/moderate", h.ModerateReply)
	}

	// --- Admin API routes (static token auth) ---
	if cfg.AdminAPIToken != "" {
		adminAPI := r.Group("/api/admin", middleware.AdminToken(cfg.AdminAPIToken))
		{
			adminAPI.POST("/batch", h.CreateBatch)
			adminAPI.GET("/batch/:id", h.GetBatchStatus)
			adminAPI.POST("/seed/locations", h.SeedLocations)
			adminAPI.POST("/seed/profiles", h.SeedProfiles)
		}
	}

	log.Printf("Starting server on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server: %v", err)
	}
}
