package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"sync"
	"time"

	"github.com/localnews/backend/internal/cache"
	"github.com/localnews/backend/internal/middleware"
	"github.com/localnews/backend/internal/models"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
	db          *gorm.DB
	cache       *cache.Cache
	mu          sync.RWMutex
	subscribers map[string]chan RequestEvent
	peakRPM     int
	peakMu      sync.Mutex
}

func NewStatsService(db *gorm.DB, c *cache.Cache) *StatsService {
	return &StatsService{
		db:          db,
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

	// HyperLogLog for unique IPs per hour
	hourKey := fmt.Sprintf("stats:ips:%s", now.Format("2006-01-02T15"))
	pipe.PFAdd(ctx, hourKey, mwEvent.IP)
	pipe.Expire(ctx, hourKey, 25*time.Hour)

	// Location counts per day (skip unknown/local)
	if mwEvent.CityName != "" && mwEvent.CityName != "Unknown" && mwEvent.CityName != "Local" {
		dateStr := now.Format("2006-01-02")
		locKey := fmt.Sprintf("stats:locations:%s", dateStr)
		geoKey := fmt.Sprintf("stats:locgeo:%s", dateStr)
		pipe.HIncrBy(ctx, locKey, mwEvent.CityName, 1)
		pipe.Expire(ctx, locKey, 48*time.Hour)
		coordJSON, _ := json.Marshal(map[string]float64{"lat": mwEvent.Lat, "lng": mwEvent.Lng})
		pipe.HSet(ctx, geoKey, mwEvent.CityName, string(coordJSON))
		pipe.Expire(ctx, geoKey, 48*time.Hour)
	}

	pipe.Exec(ctx)

	// Track peak RPM in memory
	currentRPM, _ := rdb.ZCount(ctx, "stats:rpm", fmt.Sprintf("%d", now.Add(-60*time.Second).Unix()), "+inf").Result()
	s.peakMu.Lock()
	if int(currentRPM) > s.peakRPM {
		s.peakRPM = int(currentRPM)
	}
	s.peakMu.Unlock()

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
	// If display name wasn't provided, try to get it from the cached profile
	if displayName == "" {
		if cp, err := s.cache.GetProfile(ctx, profileID); err == nil {
			displayName = cp.DisplayName
		}
	}
	if displayName == "" {
		displayName = profileID[:8]
	}
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

// FlushToPostgres snapshots current Redis counters into PostgreSQL.
func (s *StatsService) FlushToPostgres(ctx context.Context) {
	snap := s.GetSnapshot(ctx)
	now := time.Now()
	hour := now.Truncate(time.Hour)

	// Grab and reset peak RPM
	s.peakMu.Lock()
	peak := s.peakRPM
	s.peakRPM = 0
	s.peakMu.Unlock()

	// Use current RPM if higher than tracked peak (covers edge case)
	if snap.RequestsPerMinute > peak {
		peak = snap.RequestsPerMinute
	}

	// Convert top paths to DTO
	topPaths := make([]models.PathCountDTO, len(snap.TopPaths))
	for i, p := range snap.TopPaths {
		topPaths[i] = models.PathCountDTO{Path: p.Path, Count: p.Count}
	}

	// Read unique IPs from HyperLogLog
	rdb := s.cache.Client()
	ipKey := fmt.Sprintf("stats:ips:%s", hour.Format("2006-01-02T15"))
	uniqueIPs, _ := rdb.PFCount(ctx, ipKey).Result()

	// Upsert hourly row
	hourly := models.StatsHourly{
		Hour:         hour,
		RequestCount: snap.RequestsToday,
		PeakRPM:      peak,
		UniqueUsers:  snap.ActiveUserCount,
		UniqueIPs:    int(uniqueIPs),
		TopPaths:     models.JSONB[[]models.PathCountDTO]{V: topPaths},
	}
	s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "hour"}},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"request_count": gorm.Expr("GREATEST(stats_hourlies.request_count, ?)", snap.RequestsToday),
			"peak_rpm":      gorm.Expr("GREATEST(stats_hourlies.peak_rpm, ?)", peak),
			"unique_users":  gorm.Expr("GREATEST(stats_hourlies.unique_users, ?)", snap.ActiveUserCount),
			"unique_ips":    gorm.Expr("GREATEST(stats_hourlies.unique_ips, ?)", int(uniqueIPs)),
			"top_paths":     hourly.TopPaths,
		}),
	}).Create(&hourly)

	// Upsert daily path counts
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	for _, p := range snap.TopPaths {
		dp := models.StatsDailyPath{
			Date:  today,
			Path:  p.Path,
			Count: p.Count,
		}
		s.db.WithContext(ctx).Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "date"}, {Name: "path"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"count": gorm.Expr("GREATEST(stats_daily_paths.count, ?)", p.Count),
			}),
		}).Create(&dp)
	}

	// Upsert location daily counts
	dateStr := now.Format("2006-01-02")
	locKey := fmt.Sprintf("stats:locations:%s", dateStr)
	geoKey := fmt.Sprintf("stats:locgeo:%s", dateStr)
	locMap, _ := rdb.HGetAll(ctx, locKey).Result()
	geoMap, _ := rdb.HGetAll(ctx, geoKey).Result()
	for city, countStr := range locMap {
		count, err := strconv.ParseInt(countStr, 10, 64)
		if err != nil {
			continue
		}
		var lat, lng float64
		if geoJSON, ok := geoMap[city]; ok {
			var coords map[string]float64
			if json.Unmarshal([]byte(geoJSON), &coords) == nil {
				lat = coords["lat"]
				lng = coords["lng"]
			}
		}
		locRow := models.StatsLocationDaily{
			Date:         today,
			CityName:     city,
			Lat:          lat,
			Lng:          lng,
			RequestCount: count,
		}
		s.db.WithContext(ctx).Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "date"}, {Name: "city_name"}},
			DoUpdates: clause.Assignments(map[string]interface{}{
				"request_count": gorm.Expr("GREATEST(stats_location_dailies.request_count, ?)", count),
				"lat":           lat,
				"lng":           lng,
			}),
		}).Create(&locRow)
	}

	log.Printf("Stats flushed to PostgreSQL (hour=%s, paths=%d, locations=%d)", hour.Format("2006-01-02T15:00"), len(snap.TopPaths), len(locMap))
}

// StartPeriodicFlush runs FlushToPostgres every hour and prunes old data.
func (s *StatsService) StartPeriodicFlush(ctx context.Context) {
	// Immediate flush on startup
	s.FlushToPostgres(ctx)

	go func() {
		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.FlushToPostgres(ctx)

				// Prune rows older than 90 days
				cutoff := time.Now().Add(-90 * 24 * time.Hour)
				s.db.Where("hour < ?", cutoff).Delete(&models.StatsHourly{})
				s.db.Where("date < ?", cutoff).Delete(&models.StatsDailyPath{})
				s.db.Where("date < ?", cutoff).Delete(&models.StatsLocationDaily{})
			}
		}
	}()
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
