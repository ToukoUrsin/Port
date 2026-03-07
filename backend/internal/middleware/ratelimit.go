package middleware

import (
	"context"
	"fmt"
	"log"
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/localnews/backend/internal/config"
	"github.com/redis/go-redis/v9"
)

// Tier defines a rate limit bucket with a name, max requests, and time window.
type Tier struct {
	Name   string
	Max    int
	Window time.Duration
}

// RateLimiter is a Redis-backed sliding window rate limiter.
type RateLimiter struct {
	client     *redis.Client
	script     *redis.Script
	enabled    bool
	jwtSecret  []byte
	editorMult float64
	adminMult  float64
	routes     map[string]Tier // "METHOD /path" -> tier
	methodAll  map[string]Tier // "METHOD" -> tier (catch-all for PUT/DELETE)
	defaultTier Tier
	sseTier     Tier
	sseRoute    string
}

// Lua script for sliding window log rate limiting.
// Keys[1] = rate limit key
// ARGV[1] = window start (microseconds)
// ARGV[2] = now (microseconds)
// ARGV[3] = max allowed
// ARGV[4] = member (unique entry)
// ARGV[5] = window duration (seconds, for EXPIRE)
// Returns: [allowed (0/1), current_count, reset_timestamp_micros]
var slidingWindowLua = `
local key = KEYS[1]
local window_start = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local max_allowed = tonumber(ARGV[3])
local member = ARGV[4]
local window_secs = tonumber(ARGV[5])

redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
local count = redis.call('ZCARD', key)

if count < max_allowed then
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, window_secs + 1)
    return {1, count + 1, now + (window_secs * 1000000)}
end

return {0, count, now + (window_secs * 1000000)}
`

// NewRateLimiter creates a rate limiter from config and a Redis client.
func NewRateLimiter(client *redis.Client, cfg *config.Config) *RateLimiter {
	authTier := Tier{Name: "auth", Max: cfg.RateLimitAuthMax, Window: cfg.RateLimitAuthWindow}
	searchTier := Tier{Name: "search", Max: cfg.RateLimitSearchMax, Window: cfg.RateLimitSearchWindow}
	writeTier := Tier{Name: "write", Max: cfg.RateLimitWriteMax, Window: cfg.RateLimitWriteWindow}
	readTier := Tier{Name: "read", Max: cfg.RateLimitReadMax, Window: cfg.RateLimitReadWindow}
	sseTier := Tier{Name: "sse", Max: cfg.RateLimitSSEMax, Window: 0}

	routes := map[string]Tier{
		"POST /api/auth/register":        authTier,
		"POST /api/auth/login":           authTier,
		"POST /api/auth/refresh":         readTier,
		"GET /api/auth/google":           authTier,
		"GET /api/auth/google/callback":  authTier,
		"PUT /api/auth/password":         authTier,
		"GET /api/articles/:id/similar":  searchTier,
		"GET /api/search":                searchTier,
		"GET /api/search/sessions/:id":   searchTier,
		"POST /api/submissions":          writeTier,
		"POST /api/submissions/:id/replies":  writeTier,
		"POST /api/submissions/:id/publish":  writeTier,
		"POST /api/submissions/:id/refine":   writeTier,
		"POST /api/submissions/:id/appeal":   writeTier,
		"POST /api/follows":              writeTier,
		"POST /api/locations":            writeTier,
	}

	methodAll := map[string]Tier{
		"PUT":    writeTier,
		"DELETE": writeTier,
	}

	return &RateLimiter{
		client:      client,
		script:      redis.NewScript(slidingWindowLua),
		enabled:     cfg.RateLimitEnabled,
		jwtSecret:   []byte(cfg.JWTSecret),
		editorMult:  cfg.RateLimitEditorMult,
		adminMult:   cfg.RateLimitAdminMult,
		routes:      routes,
		methodAll:   methodAll,
		defaultTier: readTier,
		sseTier:     sseTier,
		sseRoute:    "GET /api/submissions/:id/stream",
	}
}

// Middleware returns the Gin middleware handler.
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !rl.enabled {
			c.Next()
			return
		}

		fullPath := c.FullPath()
		if fullPath == "/api/health" || fullPath == "" {
			c.Next()
			return
		}

		// Optionally parse JWT for identity and role
		profileID, role := rl.parseIdentity(c)

		routeKey := c.Request.Method + " " + fullPath

		// SSE concurrency limiter
		if routeKey == rl.sseRoute {
			rl.handleSSE(c, profileID, role)
			return
		}

		// Determine tier
		tier := rl.lookupTier(routeKey, c.Request.Method)

		// Build Redis key
		redisKey := rl.buildKey(tier.Name, profileID, c.ClientIP())

		// Apply role multiplier
		effectiveMax := rl.effectiveLimit(tier.Max, role)

		// Run sliding window check
		now := time.Now().UnixMicro()
		windowStart := now - tier.Window.Microseconds()
		member := fmt.Sprintf("%d:%d", now, rand.Int63())
		windowSecs := int64(math.Ceil(tier.Window.Seconds()))

		result, err := rl.script.Run(
			c.Request.Context(),
			rl.client,
			[]string{redisKey},
			windowStart, now, effectiveMax, member, windowSecs,
		).Int64Slice()

		if err != nil {
			// Fail open on Redis errors
			log.Printf("rate limiter redis error: %v", err)
			c.Next()
			return
		}

		allowed := result[0] == 1
		count := result[1]
		resetMicros := result[2]
		resetTime := time.UnixMicro(resetMicros)

		// Set rate limit headers
		c.Header("X-RateLimit-Limit", strconv.Itoa(effectiveMax))
		c.Header("X-RateLimit-Remaining", strconv.FormatInt(max(0, int64(effectiveMax)-count), 10))
		c.Header("X-RateLimit-Reset", strconv.FormatInt(resetTime.Unix(), 10))

		if !allowed {
			retryAfter := time.Until(resetTime).Seconds()
			if retryAfter < 1 {
				retryAfter = 1
			}
			c.Header("Retry-After", strconv.Itoa(int(math.Ceil(retryAfter))))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}

		c.Next()
	}
}

func (rl *RateLimiter) parseIdentity(c *gin.Context) (profileID string, role int) {
	header := c.GetHeader("Authorization")
	if !strings.HasPrefix(header, "Bearer ") {
		return "", 0
	}
	tokenStr := header[7:]
	claims, err := validateAccessToken(tokenStr, rl.jwtSecret)
	if err != nil {
		return "", 0
	}
	return claims.Subject, claims.Role
}

func (rl *RateLimiter) lookupTier(routeKey, method string) Tier {
	if tier, ok := rl.routes[routeKey]; ok {
		return tier
	}
	if tier, ok := rl.methodAll[method]; ok {
		return tier
	}
	return rl.defaultTier
}

func (rl *RateLimiter) buildKey(tierName, profileID, ip string) string {
	if profileID != "" {
		return "rl:" + tierName + ":u:" + profileID
	}
	return "rl:" + tierName + ":ip:" + ip
}

func (rl *RateLimiter) effectiveLimit(base int, role int) int {
	switch {
	case role >= 2:
		return int(float64(base) * rl.adminMult)
	case role >= 1:
		return int(float64(base) * rl.editorMult)
	default:
		return base
	}
}

// handleSSE implements concurrency-based limiting for SSE streams.
func (rl *RateLimiter) handleSSE(c *gin.Context, profileID string, role int) {
	key := rl.buildKey(rl.sseTier.Name, profileID, c.ClientIP())
	effectiveMax := rl.effectiveLimit(rl.sseTier.Max, role)
	ctx := c.Request.Context()

	count, err := rl.client.Incr(ctx, key).Result()
	if err != nil {
		log.Printf("rate limiter redis error (sse incr): %v", err)
		c.Next()
		return
	}

	// Set safety TTL so keys auto-expire if decrement fails
	rl.client.Expire(ctx, key, 10*time.Minute)

	if count > int64(effectiveMax) {
		rl.client.Decr(ctx, key)
		c.Header("X-RateLimit-Limit", strconv.Itoa(effectiveMax))
		c.Header("X-RateLimit-Remaining", "0")
		c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many concurrent streams"})
		return
	}

	c.Header("X-RateLimit-Limit", strconv.Itoa(effectiveMax))
	c.Header("X-RateLimit-Remaining", strconv.FormatInt(int64(effectiveMax)-count, 10))

	// Decrement when the SSE stream ends
	defer rl.decrementSSE(context.Background(), key)

	c.Next()
}

func (rl *RateLimiter) decrementSSE(ctx context.Context, key string) {
	result, err := rl.client.Decr(ctx, key).Result()
	if err != nil {
		log.Printf("rate limiter redis error (sse decr): %v", err)
		return
	}
	// Clean up if count went to zero or below
	if result <= 0 {
		rl.client.Del(ctx, key)
	}
}
