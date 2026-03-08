package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
)

func (h *Handler) CreateFollow(c *gin.Context) {
	actor := services.ActorFromContext(c)

	var req struct {
		TargetID   uuid.UUID `json:"target_id" binding:"required"`
		TargetType int16     `json:"target_type" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	switch req.TargetType {
	case models.FollowLocation:
		if err := h.db.First(&models.Location{}, "id = ?", req.TargetID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "target not found"})
			return
		}
	case models.FollowProfile:
		if err := h.db.First(&models.Profile{}, "id = ?", req.TargetID).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "target not found"})
			return
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid target_type"})
		return
	}

	follow := models.Follow{
		ProfileID:  actor.ProfileID,
		TargetID:   req.TargetID,
		TargetType: req.TargetType,
	}

	if err := h.db.Create(&follow).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "already following"})
		return
	}

	c.JSON(http.StatusCreated, follow)
}

func (h *Handler) GetFollowStatus(c *gin.Context) {
	targetID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	actor := services.ActorFromContext(c)

	var follow models.Follow
	if err := h.db.First(&follow, "profile_id = ? AND target_id = ? AND target_type = ?",
		actor.ProfileID, targetID, models.FollowProfile).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"following": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{"following": true, "follow_id": follow.ID})
}

func (h *Handler) GetFollowCounts(c *gin.Context) {
	profileID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var followers int64
	h.db.Model(&models.Follow{}).Where("target_id = ? AND target_type = ?",
		profileID, models.FollowProfile).Count(&followers)

	var following int64
	h.db.Model(&models.Follow{}).Where("profile_id = ? AND target_type = ?",
		profileID, models.FollowProfile).Count(&following)

	c.JSON(http.StatusOK, gin.H{
		"followers": followers,
		"following": following,
	})
}

type followListItem struct {
	ID          uuid.UUID `json:"id"`
	ProfileName string    `json:"profile_name"`
	CreatedAt   string    `json:"followed_at"`
}

func (h *Handler) GetFollowers(c *gin.Context) {
	profileID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var follows []models.Follow
	h.db.Where("target_id = ? AND target_type = ?", profileID, models.FollowProfile).
		Order("created_at DESC").Find(&follows)

	if len(follows) == 0 {
		c.JSON(http.StatusOK, gin.H{"users": []followListItem{}, "total": 0})
		return
	}

	ids := make([]uuid.UUID, len(follows))
	for i, f := range follows {
		ids[i] = f.ProfileID
	}

	var profiles []models.Profile
	h.db.Select("id, profile_name").Where("id IN ?", ids).Find(&profiles)

	nameMap := make(map[uuid.UUID]string, len(profiles))
	for _, p := range profiles {
		nameMap[p.ID] = p.ProfileName
	}

	items := make([]followListItem, 0, len(follows))
	for _, f := range follows {
		items = append(items, followListItem{
			ID:          f.ProfileID,
			ProfileName: nameMap[f.ProfileID],
			CreatedAt:   f.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}

	c.JSON(http.StatusOK, gin.H{"users": items, "total": len(items)})
}

func (h *Handler) GetFollowing(c *gin.Context) {
	profileID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var follows []models.Follow
	h.db.Where("profile_id = ? AND target_type = ?", profileID, models.FollowProfile).
		Order("created_at DESC").Find(&follows)

	if len(follows) == 0 {
		c.JSON(http.StatusOK, gin.H{"users": []followListItem{}, "total": 0})
		return
	}

	ids := make([]uuid.UUID, len(follows))
	for i, f := range follows {
		ids[i] = f.TargetID
	}

	var profiles []models.Profile
	h.db.Select("id, profile_name").Where("id IN ?", ids).Find(&profiles)

	nameMap := make(map[uuid.UUID]string, len(profiles))
	for _, p := range profiles {
		nameMap[p.ID] = p.ProfileName
	}

	items := make([]followListItem, 0, len(follows))
	for _, f := range follows {
		items = append(items, followListItem{
			ID:          f.TargetID,
			ProfileName: nameMap[f.TargetID],
			CreatedAt:   f.CreatedAt.Format("2006-01-02T15:04:05Z"),
		})
	}

	c.JSON(http.StatusOK, gin.H{"users": items, "total": len(items)})
}

func (h *Handler) DeleteFollow(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var follow models.Follow
	if err := h.db.First(&follow, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if follow.ProfileID != actor.ProfileID && !actor.IsAdmin() {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	h.db.Delete(&follow)
	c.Status(http.StatusNoContent)
}
