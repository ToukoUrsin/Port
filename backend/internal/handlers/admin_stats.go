package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/middleware"
	"github.com/localnews/backend/internal/models"
)

func (h *Handler) GetAdminStats(c *gin.Context) {
	snapshot := h.stats.GetSnapshot(c.Request.Context())
	c.JSON(http.StatusOK, snapshot)
}

// GetHistoricalStats returns hourly snapshots for the last N days.
func (h *Handler) GetHistoricalStats(c *gin.Context) {
	days := 7
	if d, err := strconv.Atoi(c.Query("days")); err == nil && d > 0 && d <= 90 {
		days = d
	}
	since := time.Now().Add(-time.Duration(days) * 24 * time.Hour)

	var rows []models.StatsHourly
	h.db.Where("hour >= ?", since).Order("hour DESC").Find(&rows)
	c.JSON(http.StatusOK, rows)
}

// GetPathHistory returns daily path counts, optionally filtered by path.
func (h *Handler) GetPathHistory(c *gin.Context) {
	days := 30
	if d, err := strconv.Atoi(c.Query("days")); err == nil && d > 0 && d <= 90 {
		days = d
	}
	since := time.Now().Add(-time.Duration(days) * 24 * time.Hour)

	q := h.db.Where("date >= ?", since)
	if path := c.Query("path"); path != "" {
		q = q.Where("path = ?", path)
	}

	var rows []models.StatsDailyPath
	q.Order("date DESC").Limit(500).Find(&rows)
	c.JSON(http.StatusOK, rows)
}

// GetLocationHistory returns daily location stats for the last N days.
func (h *Handler) GetLocationHistory(c *gin.Context) {
	days := 30
	if d, err := strconv.Atoi(c.Query("days")); err == nil && d > 0 && d <= 90 {
		days = d
	}
	since := time.Now().Add(-time.Duration(days) * 24 * time.Hour)

	var rows []models.StatsLocationDaily
	h.db.Where("date >= ?", since).Order("request_count DESC").Limit(200).Find(&rows)
	c.JSON(http.StatusOK, rows)
}

// GetHistoricalSummary returns aggregated totals over the last N days.
func (h *Handler) GetHistoricalSummary(c *gin.Context) {
	days := 7
	if d, err := strconv.Atoi(c.Query("days")); err == nil && d > 0 && d <= 90 {
		days = d
	}
	since := time.Now().Add(-time.Duration(days) * 24 * time.Hour)

	var hourlyAgg struct {
		TotalRequests int `json:"total_requests"`
		MaxPeakRPM    int `json:"max_peak_rpm"`
		TotalUniqueIPs int `json:"total_unique_ips"`
	}
	h.db.Model(&models.StatsHourly{}).
		Where("hour >= ?", since).
		Select("COALESCE(SUM(request_count), 0) as total_requests, COALESCE(MAX(peak_rpm), 0) as max_peak_rpm, COALESCE(SUM(unique_ips), 0) as total_unique_ips").
		Scan(&hourlyAgg)

	var uniqueLocations int64
	h.db.Model(&models.StatsLocationDaily{}).
		Where("date >= ?", since).
		Distinct("city_name").
		Count(&uniqueLocations)

	c.JSON(http.StatusOK, gin.H{
		"total_requests":   hourlyAgg.TotalRequests,
		"max_peak_rpm":     hourlyAgg.MaxPeakRPM,
		"total_unique_ips": hourlyAgg.TotalUniqueIPs,
		"unique_locations": uniqueLocations,
	})
}

func (h *Handler) StreamAdminStats(c *gin.Context) {
	middleware.EnablePassthrough(c)
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	subID := uuid.New().String()
	events := h.stats.Subscribe(subID)
	defer h.stats.Unsubscribe(subID)

	// Send initial snapshot
	snapshot := h.stats.GetSnapshot(c.Request.Context())
	data, _ := json.Marshal(snapshot)
	fmt.Fprintf(c.Writer, "event: snapshot\ndata: %s\n\n", string(data))
	c.Writer.Flush()

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	c.Stream(func(w io.Writer) bool {
		select {
		case <-c.Request.Context().Done():
			return false
		case event, ok := <-events:
			if !ok {
				return false
			}
			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "event: request\ndata: %s\n\n", string(data))
			c.Writer.Flush()
			return true
		case <-ticker.C:
			snap := h.stats.GetSnapshot(c.Request.Context())
			data, _ := json.Marshal(snap)
			fmt.Fprintf(w, "event: snapshot\ndata: %s\n\n", string(data))
			c.Writer.Flush()
			return true
		}
	})
}
