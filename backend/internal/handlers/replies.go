package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
)

func (h *Handler) ListReplies(c *gin.Context) {
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ? AND status = ?", subID, models.StatusPublished).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	var replies []models.Reply
	h.db.Where("submission_id = ? AND status = ?", subID, models.ReplyVisible).
		Order("created_at ASC").Find(&replies)

	h.fillReplyProfileNames(replies)
	c.JSON(http.StatusOK, gin.H{"replies": replies})
}

func (h *Handler) CreateReply(c *gin.Context) {
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ?", subID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "submission not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanCreateReply(actor, &sub) {
		c.JSON(http.StatusForbidden, gin.H{"error": "replies not allowed"})
		return
	}

	var req struct {
		Body     string     `json:"body" binding:"required"`
		ParentID *uuid.UUID `json:"parent_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	reply := models.Reply{
		SubmissionID: subID,
		ProfileID:    actor.ProfileID,
		ParentID:     req.ParentID,
		Body:         req.Body,
		Status:       models.ReplyVisible,
	}

	if err := h.db.Create(&reply).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create reply"})
		return
	}

	replies := []models.Reply{reply}
	h.fillReplyProfileNames(replies)
	c.JSON(http.StatusCreated, replies[0])
}

// fillReplyProfileNames populates the ProfileName field on each reply
// by looking up profile names from the profiles table.
func (h *Handler) fillReplyProfileNames(replies []models.Reply) {
	if len(replies) == 0 {
		return
	}
	seen := make(map[uuid.UUID]bool)
	var ids []uuid.UUID
	for _, r := range replies {
		if !seen[r.ProfileID] {
			seen[r.ProfileID] = true
			ids = append(ids, r.ProfileID)
		}
	}
	var profiles []models.Profile
	h.db.Select("id, profile_name").Where("id IN ?", ids).Find(&profiles)
	nameMap := make(map[uuid.UUID]string, len(profiles))
	for _, p := range profiles {
		nameMap[p.ID] = p.ProfileName
	}
	for i := range replies {
		replies[i].ProfileName = nameMap[replies[i].ProfileID]
	}
}

func (h *Handler) UpdateReply(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var reply models.Reply
	if err := h.db.First(&reply, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ? AND status = ?", reply.SubmissionID, models.StatusPublished).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanEditReply(actor, &reply) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req struct {
		Body string `json:"body" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	h.db.Model(&reply).Update("body", req.Body)

	h.db.First(&reply, "id = ?", id)
	c.JSON(http.StatusOK, reply)
}

func (h *Handler) DeleteReply(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var reply models.Reply
	if err := h.db.First(&reply, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ? AND status = ?", reply.SubmissionID, models.StatusPublished).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanDeleteReply(actor, &reply) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	h.db.Delete(&reply)
	c.Status(http.StatusNoContent)
}

func (h *Handler) ModerateReply(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var reply models.Reply
	if err := h.db.First(&reply, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanModerateReply(actor) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req struct {
		Status int16 `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.Status != models.ReplyVisible && req.Status != models.ReplyHidden {
		c.JSON(http.StatusBadRequest, gin.H{"error": "status must be 0 (visible) or 1 (hidden)"})
		return
	}

	h.db.Model(&reply).Update("status", req.Status)

	h.db.First(&reply, "id = ?", id)
	c.JSON(http.StatusOK, reply)
}
