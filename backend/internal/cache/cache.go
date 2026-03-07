package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const DefaultTTL = 30 * time.Minute

type Cache struct {
	client *redis.Client
	ttl    time.Duration
}

func New(redisURL string) (*Cache, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}
	client := redis.NewClient(opt)
	if err := client.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}
	return &Cache{client: client, ttl: DefaultTTL}, nil
}

// Get retrieves a cached value. Returns false on miss.
func (c *Cache) Get(ctx context.Context, key string, dest any) bool {
	val, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		return false
	}
	return json.Unmarshal(val, dest) == nil
}

// Set stores a value with the default TTL.
func (c *Cache) Set(ctx context.Context, key string, value any) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.client.Set(ctx, key, data, c.ttl).Err()
}

// SetWithTTL stores a value with a custom TTL.
func (c *Cache) SetWithTTL(ctx context.Context, key string, value any, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.client.Set(ctx, key, data, ttl).Err()
}

// Delete removes one or more exact keys.
func (c *Cache) Delete(ctx context.Context, keys ...string) error {
	return c.client.Del(ctx, keys...).Err()
}

// DeletePattern removes all keys matching a glob pattern.
func (c *Cache) DeletePattern(ctx context.Context, pattern string) error {
	iter := c.client.Scan(ctx, 0, pattern, 0).Iterator()
	for iter.Next(ctx) {
		c.client.Del(ctx, iter.Val())
	}
	return iter.Err()
}

// --- Auth-specific cache methods ---

type CachedProfile struct {
	Role        int    `json:"role"`
	Perm        int64  `json:"perm"`
	Email       string `json:"email"`
	DisplayName string `json:"display_name"`
}

type CachedRefresh struct {
	ProfileID string `json:"profile_id"`
	ExpiresAt int64  `json:"expires_at"`
}

func (c *Cache) GetProfile(ctx context.Context, profileID string) (*CachedProfile, error) {
	var p CachedProfile
	if c.Get(ctx, "profile:"+profileID, &p) {
		return &p, nil
	}
	return nil, fmt.Errorf("cache miss")
}

func (c *Cache) SetProfile(ctx context.Context, profileID string, profile *CachedProfile, ttl time.Duration) error {
	return c.SetWithTTL(ctx, "profile:"+profileID, profile, ttl)
}

func (c *Cache) DelProfile(ctx context.Context, profileID string) error {
	return c.Delete(ctx, "profile:"+profileID)
}

func (c *Cache) MarkRevoked(ctx context.Context, tokenHash string, ttl time.Duration) error {
	return c.SetWithTTL(ctx, "revoked:"+tokenHash, "1", ttl)
}

func (c *Cache) IsRevoked(ctx context.Context, tokenHash string) (bool, error) {
	var v string
	return c.Get(ctx, "revoked:"+tokenHash, &v), nil
}

func (c *Cache) GetRefreshToken(ctx context.Context, tokenHash string) (*CachedRefresh, error) {
	var r CachedRefresh
	if c.Get(ctx, "refresh:"+tokenHash, &r) {
		return &r, nil
	}
	return nil, fmt.Errorf("cache miss")
}

func (c *Cache) SetRefreshToken(ctx context.Context, tokenHash string, data *CachedRefresh, ttl time.Duration) error {
	return c.SetWithTTL(ctx, "refresh:"+tokenHash, data, ttl)
}

func (c *Cache) DelRefreshToken(ctx context.Context, tokenHash string) error {
	return c.Delete(ctx, "refresh:"+tokenHash)
}
