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
