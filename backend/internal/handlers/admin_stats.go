package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/middleware"
)

func (h *Handler) GetAdminStats(c *gin.Context) {
	snapshot := h.stats.GetSnapshot(c.Request.Context())
	c.JSON(http.StatusOK, snapshot)
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
