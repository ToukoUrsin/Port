package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
	"gorm.io/gorm/clause"
)

type notificationResponse struct {
	models.Notification
	ActorName    string `json:"actor_name"`
	ArticleTitle string `json:"article_title"`
}

func (h *Handler) ListNotifications(c *gin.Context) {
	actor := services.ActorFromContext(c)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))
	if limit > 100 {
		limit = 100
	}

	var notifs []models.Notification
	h.db.Where("profile_id = ?", actor.ProfileID).
		Order("created_at DESC").
		Limit(limit).
		Find(&notifs)

	// Collect actor IDs and article IDs for batch lookups
	actorIDs := make([]uuid.UUID, 0, len(notifs))
	articleIDs := make([]uuid.UUID, 0, len(notifs))
	for _, n := range notifs {
		actorIDs = append(actorIDs, n.ActorID)
		articleIDs = append(articleIDs, n.ArticleID)
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

	c.JSON(http.StatusOK, gin.H{"notifications": result})
}

func (h *Handler) UnreadCount(c *gin.Context) {
	actor := services.ActorFromContext(c)

	var count int64
	h.db.Model(&models.Notification{}).
		Where("profile_id = ? AND read = false", actor.ProfileID).
		Count(&count)

	c.JSON(http.StatusOK, gin.H{"count": count})
}

func (h *Handler) MarkAllRead(c *gin.Context) {
	actor := services.ActorFromContext(c)

	h.db.Model(&models.Notification{}).
		Where("profile_id = ? AND read = false", actor.ProfileID).
		Update("read", true)

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

	c.Status(http.StatusNoContent)
}

// createNotification is a helper used by reaction and reply handlers.
// Safe to call from a goroutine — recovers from panics and logs errors.
func (h *Handler) createNotification(recipientID, actorID uuid.UUID, notifType int16, targetID uuid.UUID, targetType int16, articleID uuid.UUID) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("createNotification panic: %v", r)
		}
	}()

	// Don't notify yourself
	if recipientID == actorID {
		return
	}

	notif := models.Notification{
		ProfileID:  recipientID,
		ActorID:    actorID,
		Type:       notifType,
		TargetID:   targetID,
		TargetType: targetType,
		ArticleID:  articleID,
		CreatedAt:  time.Now(),
	}
	result := h.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "profile_id"}, {Name: "actor_id"}, {Name: "type"},
			{Name: "target_id"}, {Name: "target_type"},
		},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"read":       false,
			"created_at": time.Now(),
		}),
	}).Create(&notif)
	if result.Error != nil {
		log.Printf("createNotification error: %v", result.Error)
	}
}
