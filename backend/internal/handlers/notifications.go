package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/middleware"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
)

type notificationResponse struct {
	models.Notification
	ActorName    string `json:"actor_name"`
	ArticleTitle string `json:"article_title"`
}

type listNotificationsResponse struct {
	Notifications []notificationResponse `json:"notifications"`
	NextCursor    string                 `json:"next_cursor,omitempty"`
	HasMore       bool                   `json:"has_more"`
}

func (h *Handler) ListNotifications(c *gin.Context) {
	actor := services.ActorFromContext(c)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if limit > 100 {
		limit = 100
	}

	cursor := c.Query("cursor")
	typeFilter := c.Query("type")

	query := h.db.Where("profile_id = ?", actor.ProfileID)

	if cursor != "" {
		if t, err := time.Parse(time.RFC3339Nano, cursor); err == nil {
			query = query.Where("created_at < ?", t)
		}
	}

	if typeFilter != "" {
		parts := strings.Split(typeFilter, ",")
		var types []int16
		for _, p := range parts {
			if v, err := strconv.ParseInt(strings.TrimSpace(p), 10, 16); err == nil {
				types = append(types, int16(v))
			}
		}
		if len(types) > 0 {
			query = query.Where("type IN ?", types)
		}
	}

	// Fetch one extra to determine has_more
	var notifs []models.Notification
	query.Order("created_at DESC").
		Limit(limit + 1).
		Find(&notifs)

	hasMore := len(notifs) > limit
	if hasMore {
		notifs = notifs[:limit]
	}

	// Collect actor IDs and article IDs for batch lookups
	actorIDs := make([]uuid.UUID, 0, len(notifs))
	articleIDs := make([]uuid.UUID, 0, len(notifs))
	for _, n := range notifs {
		actorIDs = append(actorIDs, n.ActorID)
		if n.ArticleID != uuid.Nil {
			articleIDs = append(articleIDs, n.ArticleID)
		}
	}

	// Batch fetch actor names
	actorNames := map[uuid.UUID]string{}
	if len(actorIDs) > 0 {
		var profiles []models.Profile
		h.db.Select("id, profile_name").Where("id IN ?", actorIDs).Find(&profiles)
		for _, p := range profiles {
			actorNames[p.ID] = p.ProfileName
		}
	}

	// Batch fetch article titles
	articleTitles := map[uuid.UUID]string{}
	if len(articleIDs) > 0 {
		var subs []models.Submission
		h.db.Select("id, title").Where("id IN ?", articleIDs).Find(&subs)
		for _, s := range subs {
			articleTitles[s.ID] = s.Title
		}
	}

	result := make([]notificationResponse, len(notifs))
	for i, n := range notifs {
		result[i] = notificationResponse{
			Notification: n,
			ActorName:    actorNames[n.ActorID],
			ArticleTitle: articleTitles[n.ArticleID],
		}
	}

	resp := listNotificationsResponse{
		Notifications: result,
		HasMore:       hasMore,
	}
	if hasMore && len(notifs) > 0 {
		resp.NextCursor = notifs[len(notifs)-1].CreatedAt.Format(time.RFC3339Nano)
	}

	c.JSON(http.StatusOK, resp)
}

func (h *Handler) UnreadCount(c *gin.Context) {
	actor := services.ActorFromContext(c)
	count := h.notifSvc.GetUnreadCount(h.db, actor.ProfileID)
	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (h *Handler) MarkAllRead(c *gin.Context) {
	actor := services.ActorFromContext(c)

	h.db.Model(&models.Notification{}).
		Where("profile_id = ? AND read = false", actor.ProfileID).
		Update("read", true)

	// Invalidate cache
	h.cache.Delete(c.Request.Context(), "notif:unread:"+actor.ProfileID.String())

	c.Status(http.StatusNoContent)
}

func (h *Handler) MarkNotificationRead(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	actor := services.ActorFromContext(c)

	h.db.Model(&models.Notification{}).
		Where("id = ? AND profile_id = ?", id, actor.ProfileID).
		Update("read", true)

	// Invalidate cache
	h.cache.Delete(c.Request.Context(), "notif:unread:"+actor.ProfileID.String())

	c.Status(http.StatusNoContent)
}

// DeleteNotification hard-deletes a single notification (owner only).
func (h *Handler) DeleteNotification(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	actor := services.ActorFromContext(c)

	result := h.db.Where("id = ? AND profile_id = ?", id, actor.ProfileID).
		Delete(&models.Notification{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	h.cache.Delete(c.Request.Context(), "notif:unread:"+actor.ProfileID.String())
	c.Status(http.StatusNoContent)
}

// DeleteReadNotifications hard-deletes all read notifications for the user.
func (h *Handler) DeleteReadNotifications(c *gin.Context) {
	actor := services.ActorFromContext(c)

	h.db.Where("profile_id = ? AND read = true", actor.ProfileID).
		Delete(&models.Notification{})

	c.Status(http.StatusNoContent)
}

// StreamNotifications sends real-time notification events via SSE.
func (h *Handler) StreamNotifications(c *gin.Context) {
	middleware.EnablePassthrough(c)
	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	actor := services.ActorFromContext(c)
	pid := actor.ProfileID.String()

	ch := h.notifSvc.Subscribe(pid)
	defer h.notifSvc.Unsubscribe(pid, ch)

	// Send initial unread count
	count := h.notifSvc.GetUnreadCount(h.db, actor.ProfileID)
	countData, _ := json.Marshal(gin.H{"count": count})
	fmt.Fprintf(c.Writer, "event: count\ndata: %s\n\n", string(countData))
	c.Writer.Flush()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	c.Stream(func(w io.Writer) bool {
		select {
		case <-c.Request.Context().Done():
			return false
		case event, ok := <-ch:
			if !ok {
				return false
			}
			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "event: notification\ndata: %s\n\n", string(data))
			c.Writer.Flush()
			return true
		case <-ticker.C:
			cnt := h.notifSvc.GetUnreadCount(h.db, actor.ProfileID)
			d, _ := json.Marshal(gin.H{"count": cnt})
			fmt.Fprintf(w, "event: count\ndata: %s\n\n", string(d))
			c.Writer.Flush()
			return true
		}
	})
}
