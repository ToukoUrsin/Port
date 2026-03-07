package middleware

import (
	"context"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type StatsGeoResult struct {
	Lat      float64
	Lng      float64
	CityName string
}

type StatsGeoResolver interface {
	Resolve(ip string) StatsGeoResult
}

type StatsRequestEvent struct {
	Timestamp  time.Time
	Method     string
	Path       string
	IP         string
	ProfileID  string
	StatusCode int
	Lat        float64
	Lng        float64
	CityName   string
}

type StatsRecorder interface {
	RecordRequest(ctx context.Context, event StatsRequestEvent)
	TrackActiveUser(ctx context.Context, profileID, displayName string)
}

func StatsTracker(recorder StatsRecorder, geo StatsGeoResolver) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		path := c.Request.URL.Path

		// Skip self-tracking and health
		if strings.HasPrefix(path, "/api/admin/stats") || path == "/api/health" || path == "/health" {
			return
		}

		ip := c.ClientIP()
		loc := geo.Resolve(ip)

		profileID, _ := c.Get("profile_id")
		pid, _ := profileID.(string)

		event := StatsRequestEvent{
			Timestamp:  time.Now(),
			Method:     c.Request.Method,
			Path:       path,
			IP:         ip,
			ProfileID:  pid,
			StatusCode: c.Writer.Status(),
			Lat:        loc.Lat,
			Lng:        loc.Lng,
			CityName:   loc.CityName,
		}

		ctx := context.Background()
		go recorder.RecordRequest(ctx, event)

		if pid != "" {
			displayName := ""
			if dn, exists := c.Get("display_name"); exists {
				displayName, _ = dn.(string)
			}
			go recorder.TrackActiveUser(ctx, pid, displayName)
		}
	}
}
