package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	DatabaseURL      string
	RedisURL         string
	Port             string
	AllowedOrigins   string
	JWTSecret        string
	JWTAccessTTL     time.Duration
	JWTRefreshTTL    time.Duration
	ElevenLabsAPIKey string
	MediaStoragePath string
	GoogleClientID   string
	GoogleSecret     string
	GoogleRedirect   string

	// Gemini (embedding + generation + review)
	GeminiAPIKey        string
	GenerationModel     string
	EmbeddingModel      string
	EmbeddingDimensions int

	// ONNX reranker
	RerankerModelPath string
	RerankerVocabPath string
	ONNXLibPath       string

	// Security
	SecureCookies  bool
	TrustedProxies []string

	// Rate limiting
	RateLimitEnabled      bool
	RateLimitAuthMax      int
	RateLimitAuthWindow   time.Duration
	RateLimitSearchMax    int
	RateLimitSearchWindow time.Duration
	RateLimitWriteMax     int
	RateLimitWriteWindow  time.Duration
	RateLimitReadMax      int
	RateLimitReadWindow   time.Duration
	RateLimitSSEMax       int
	RateLimitEditorMult   float64
	RateLimitAdminMult    float64
}

func Load() *Config {
	cfg := &Config{
		DatabaseURL:      env("DATABASE_URL", "postgresql://user:pass@localhost:5432/localnews"),
		RedisURL:         env("REDIS_URL", "redis://localhost:6379/0"),
		Port:             env("PORT", "8000"),
		AllowedOrigins:   env("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174"),
		JWTSecret:        env("JWT_SECRET", "dev-secret-change-me-in-production-min32bytes"),
		ElevenLabsAPIKey: env("ELEVENLABS_API_KEY", ""),
		MediaStoragePath: env("MEDIA_STORAGE_PATH", "./uploads"),
		GoogleClientID:   env("GOOGLE_CLIENT_ID", ""),
		GoogleSecret:     env("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirect:   env("GOOGLE_REDIRECT_URL", "http://localhost:8000/api/auth/google/callback"),

		GeminiAPIKey:        env("GEMINI_API_KEY", ""),
		GenerationModel:     env("GENERATION_MODEL", "gemini-2.5-pro"),
		EmbeddingModel:      env("EMBEDDING_MODEL", "gemini-embedding-001"),
		EmbeddingDimensions: envInt("EMBEDDING_DIMENSIONS", 768),

		RerankerModelPath: env("RERANKER_MODEL_PATH", ""),
		RerankerVocabPath: env("RERANKER_VOCAB_PATH", ""),
		ONNXLibPath:       env("ONNX_LIB_PATH", ""),
	}

	cfg.JWTAccessTTL = parseDuration(env("JWT_ACCESS_TTL", "15m"), 15*time.Minute)
	cfg.JWTRefreshTTL = parseDuration(env("JWT_REFRESH_TTL", "720h"), 720*time.Hour)

	// Security: default Secure cookies to true unless origins are all localhost
	cfg.SecureCookies = envBool("SECURE_COOKIES", !allLocalhost(cfg.AllowedOrigins))
	if tp := env("TRUSTED_PROXIES", ""); tp != "" {
		for _, p := range strings.Split(tp, ",") {
			if p = strings.TrimSpace(p); p != "" {
				cfg.TrustedProxies = append(cfg.TrustedProxies, p)
			}
		}
	}

	// Rate limiting
	cfg.RateLimitEnabled = envBool("RATE_LIMIT_ENABLED", true)
	cfg.RateLimitAuthMax = envInt("RATE_LIMIT_AUTH_MAX", 10)
	cfg.RateLimitAuthWindow = parseDuration(env("RATE_LIMIT_AUTH_WINDOW", "1m"), time.Minute)
	cfg.RateLimitSearchMax = envInt("RATE_LIMIT_SEARCH_MAX", 35)
	cfg.RateLimitSearchWindow = parseDuration(env("RATE_LIMIT_SEARCH_WINDOW", "1m"), time.Minute)
	cfg.RateLimitWriteMax = envInt("RATE_LIMIT_WRITE_MAX", 20)
	cfg.RateLimitWriteWindow = parseDuration(env("RATE_LIMIT_WRITE_WINDOW", "1m"), time.Minute)
	cfg.RateLimitReadMax = envInt("RATE_LIMIT_READ_MAX", 60)
	cfg.RateLimitReadWindow = parseDuration(env("RATE_LIMIT_READ_WINDOW", "1m"), time.Minute)
	cfg.RateLimitSSEMax = envInt("RATE_LIMIT_SSE_MAX", 3)
	cfg.RateLimitEditorMult = envFloat("RATE_LIMIT_EDITOR_MULT", 2.0)
	cfg.RateLimitAdminMult = envFloat("RATE_LIMIT_ADMIN_MULT", 5.0)

	return cfg
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}

func envBool(key string, fallback bool) bool {
	if v := os.Getenv(key); v != "" {
		return v == "true" || v == "1" || v == "yes"
	}
	return fallback
}

func envFloat(key string, fallback float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return fallback
}

func parseDuration(s string, fallback time.Duration) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return fallback
	}
	return d
}

func allLocalhost(origins string) bool {
	for _, o := range strings.Split(origins, ",") {
		o = strings.TrimSpace(o)
		if !strings.Contains(o, "localhost") && !strings.Contains(o, "127.0.0.1") {
			return false
		}
	}
	return true
}
