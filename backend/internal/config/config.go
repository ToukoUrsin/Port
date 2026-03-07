package config

import (
	"os"
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
	GeminiAPIKey     string
	ElevenLabsAPIKey string
	MediaStoragePath string
	GoogleClientID   string
	GoogleSecret     string
	GoogleRedirect   string
}

func Load() *Config {
	cfg := &Config{
		DatabaseURL:      env("DATABASE_URL", "postgresql://user:pass@localhost:5432/localnews"),
		RedisURL:         env("REDIS_URL", "redis://localhost:6379/0"),
		Port:             env("PORT", "8000"),
		AllowedOrigins:   env("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174"),
		JWTSecret:        env("JWT_SECRET", "dev-secret-change-me-in-production-min32bytes"),
		GeminiAPIKey:     env("GEMINI_API_KEY", ""),
		ElevenLabsAPIKey: env("ELEVENLABS_API_KEY", ""),
		MediaStoragePath: env("MEDIA_STORAGE_PATH", "./uploads"),
		GoogleClientID:   env("GOOGLE_CLIENT_ID", ""),
		GoogleSecret:     env("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirect:   env("GOOGLE_REDIRECT_URL", "http://localhost:8000/api/auth/google/callback"),
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

func parseDuration(s string, fallback time.Duration) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		return fallback
	}
	return d
}
