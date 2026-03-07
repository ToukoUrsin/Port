package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/localnews/backend/internal/cache"
	"github.com/localnews/backend/internal/middleware"
	"github.com/redis/go-redis/v9"
)

type RequestEvent struct {
	Timestamp  time.Time `json:"timestamp"`
	Method     string    `json:"method"`
	Path       string    `json:"path"`
	IP         string    `json:"ip,omitempty"`
	ProfileID  string    `json:"profile_id,omitempty"`
	StatusCode int       `json:"status_code"`
	Lat        float64   `json:"lat"`
	Lng        float64   `json:"lng"`
	CityName   string    `json:"city_name"`
}

type ActiveUserInfo struct {
	ProfileID   string `json:"profile_id"`
	DisplayName string `json:"display_name"`
	LastSeenAgo string `json:"last_seen_ago"`
}

type PathCount struct {
	Path  string `json:"path"`
	Count int64  `json:"count"`
}

type StatsSnapshot struct {
	RequestsPerMinute int              `json:"requests_per_minute"`
	RequestsToday     int              `json:"requests_today"`
	ActiveUserCount   int              `json:"active_user_count"`
	ActiveUsers       []ActiveUserInfo `json:"active_users"`
	TopPaths          []PathCount      `json:"top_paths"`
}

type StatsService struct {
	cache       *cache.Cache
	mu          sync.RWMutex
	subscribers map[string]chan RequestEvent
}

func NewStatsService(c *cache.Cache) *StatsService {
	return &StatsService{
		cache:       c,
		subscribers: make(map[string]chan RequestEvent),
	}
}

// RecordRequest satisfies middleware.StatsRecorder interface.
func (s *StatsService) RecordRequest(ctx context.Context, mwEvent middleware.StatsRequestEvent) {
	rdb := s.cache.Client()

	now := time.Now()
	pipe := rdb.Pipeline()

	// RPM: sorted set with score = unix timestamp, trim old entries
	pipe.ZAdd(ctx, "stats:rpm", redis.Z{Score: float64(now.Unix()), Member: fmt.Sprintf("%d-%s", now.UnixNano(), mwEvent.Path)})
	pipe.ZRemRangeByScore(ctx, "stats:rpm", "0", fmt.Sprintf("%d", now.Add(-60*time.Second).Unix()))

	// Daily counter
	dayKey := fmt.Sprintf("stats:today:%s", now.Format("2006-01-02"))
	pipe.Incr(ctx, dayKey)
	pipe.Expire(ctx, dayKey, 48*time.Hour)

	// Top paths
	pipe.HIncrBy(ctx, "stats:paths", mwEvent.Path, 1)

	pipe.Exec(ctx)

	// Convert to internal event for SSE fan-out
	event := RequestEvent{
		Timestamp:  mwEvent.Timestamp,
		Method:     mwEvent.Method,
		Path:       mwEvent.Path,
		IP:         mwEvent.IP,
		ProfileID:  mwEvent.ProfileID,
		StatusCode: mwEvent.StatusCode,
		Lat:        mwEvent.Lat,
		Lng:        mwEvent.Lng,
		CityName:   mwEvent.CityName,
	}

	s.mu.RLock()
	for _, ch := range s.subscribers {
		select {
		case ch <- event:
		default:
		}
	}
	s.mu.RUnlock()
}

func (s *StatsService) TrackActiveUser(ctx context.Context, profileID, displayName string) {
	rdb := s.cache.Client()
	key := "stats:active:" + profileID
	rdb.Set(ctx, key, displayName, 5*time.Minute)
}

func (s *StatsService) Subscribe(id string) chan RequestEvent {
	ch := make(chan RequestEvent, 50)
	s.mu.Lock()
	s.subscribers[id] = ch
	s.mu.Unlock()
	return ch
}

func (s *StatsService) Unsubscribe(id string) {
	s.mu.Lock()
	if ch, ok := s.subscribers[id]; ok {
		close(ch)
		delete(s.subscribers, id)
	}
	s.mu.Unlock()
}

func (s *StatsService) GetSnapshot(ctx context.Context) *StatsSnapshot {
	rdb := s.cache.Client()
	now := time.Now()

	// RPM
	rpm, _ := rdb.ZCount(ctx, "stats:rpm", fmt.Sprintf("%d", now.Add(-60*time.Second).Unix()), "+inf").Result()

	// Today
	dayKey := fmt.Sprintf("stats:today:%s", now.Format("2006-01-02"))
	today, _ := rdb.Get(ctx, dayKey).Int()

	// Active users
	var activeUsers []ActiveUserInfo
	iter := rdb.Scan(ctx, 0, "stats:active:*", 100).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		profileID := key[len("stats:active:"):]
		displayName, err := rdb.Get(ctx, key).Result()
		if err != nil {
			continue
		}
		ttl, _ := rdb.TTL(ctx, key).Result()
		ago := 5*time.Minute - ttl
		if ago < 0 {
			ago = 0
		}
		agoStr := "just now"
		if ago >= time.Minute {
			agoStr = fmt.Sprintf("%dm ago", int(ago.Minutes()))
		} else if ago >= 10*time.Second {
			agoStr = fmt.Sprintf("%ds ago", int(ago.Seconds()))
		}
		activeUsers = append(activeUsers, ActiveUserInfo{
			ProfileID:   profileID,
			DisplayName: displayName,
			LastSeenAgo: agoStr,
		})
	}

	// Top paths
	pathMap, _ := rdb.HGetAll(ctx, "stats:paths").Result()
	var topPaths []PathCount
	for p, countStr := range pathMap {
		count, err := parseInt64(countStr)
		if err != nil {
			continue
		}
		topPaths = append(topPaths, PathCount{Path: p, Count: count})
	}
	// Sort descending, keep top 10
	for i := 0; i < len(topPaths); i++ {
		for j := i + 1; j < len(topPaths); j++ {
			if topPaths[j].Count > topPaths[i].Count {
				topPaths[i], topPaths[j] = topPaths[j], topPaths[i]
			}
		}
	}
	if len(topPaths) > 10 {
		topPaths = topPaths[:10]
	}

	return &StatsSnapshot{
		RequestsPerMinute: int(rpm),
		RequestsToday:     today,
		ActiveUserCount:   len(activeUsers),
		ActiveUsers:       activeUsers,
		TopPaths:          topPaths,
	}
}

func parseInt64(s string) (int64, error) {
	var n int64
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("not a number")
		}
		n = n*10 + int64(c-'0')
	}
	return n, nil
}
