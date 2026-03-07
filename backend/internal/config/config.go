package config

import (
	"os"
	"strconv"
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
		GenerationModel:     env("GENERATION_MODEL", "gemini-3.1-pro"),
		EmbeddingModel:      env("EMBEDDING_MODEL", "gemini-embedding-001"),
		EmbeddingDimensions: envInt("EMBEDDING_DIMENSIONS", 768),

		RerankerModelPath: env("RERANKER_MODEL_PATH", ""),
		RerankerVocabPath: env("RERANKER_VOCAB_PATH", ""),
		ONNXLibPath:       env("ONNX_LIB_PATH", ""),
	}

	cfg.JWTAccessTTL = parseDuration(env("JWT_ACCESS_TTL", "15m"), 15*time.Minute)
	cfg.JWTRefreshTTL = parseDuration(env("JWT_REFRESH_TTL", "720h"), 720*time.Hour)

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

func parseDuration(s string, fallback time.Duration) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return fallback
	}
	return d
}
