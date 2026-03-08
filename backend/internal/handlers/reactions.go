package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// --- Article reactions (like / dislike) ---

func (h *Handler) ReactArticle(c *gin.Context) {
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

	var req struct {
		Kind int16 `json:"kind" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.Kind != models.ReactionLike && req.Kind != models.ReactionDislike {
		c.JSON(http.StatusBadRequest, gin.H{"error": "kind must be 1 (like) or -1 (dislike)"})
		return
	}

	actor := services.ActorFromContext(c)

	reaction := models.Reaction{
		ProfileID:  actor.ProfileID,
		TargetID:   subID,
		TargetType: models.ReactionTargetSubmission,
		Kind:       req.Kind,
	}

	h.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "profile_id"}, {Name: "target_id"}, {Name: "target_type"}},
		DoUpdates: clause.AssignmentColumns([]string{"kind"}),
	}).Create(&reaction)

	h.updateSubmissionReactions(subID)
	h.cache.Delete(c.Request.Context(), "articles:"+subID.String())

	// Notify article owner
	notifType := models.NotifLike
	if req.Kind == models.ReactionDislike {
		notifType = models.NotifDislike
	}
	h.createNotification(sub.OwnerID, actor.ProfileID, notifType, subID, models.ReactionTargetSubmission, subID)

	counts := h.getReactionCounts(subID, models.ReactionTargetSubmission)
	counts["user_reaction"] = int(req.Kind)
	c.JSON(http.StatusOK, counts)
}

func (h *Handler) UnreactArticle(c *gin.Context) {
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	actor := services.ActorFromContext(c)

	h.db.Where("profile_id = ? AND target_id = ? AND target_type = ?",
		actor.ProfileID, subID, models.ReactionTargetSubmission).
		Delete(&models.Reaction{})

	h.updateSubmissionReactions(subID)
	h.cache.Delete(c.Request.Context(), "articles:"+subID.String())

	counts := h.getReactionCounts(subID, models.ReactionTargetSubmission)
	counts["user_reaction"] = 0
	c.JSON(http.StatusOK, counts)
}

func (h *Handler) GetArticleReactions(c *gin.Context) {
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	counts := h.getReactionCounts(subID, models.ReactionTargetSubmission)

	profileIDRaw, hasAuth := c.Get("profile_id")
	if hasAuth {
		idStr, _ := profileIDRaw.(string)
		pid, _ := uuid.Parse(idStr)
		var reaction models.Reaction
		if h.db.First(&reaction, "profile_id = ? AND target_id = ? AND target_type = ?",
			pid, subID, models.ReactionTargetSubmission).Error == nil {
			counts["user_reaction"] = int(reaction.Kind)
		} else {
			counts["user_reaction"] = 0
		}
	}

	c.JSON(http.StatusOK, counts)
}

// --- Reply reactions (like / dislike) ---

func (h *Handler) ReactReply(c *gin.Context) {
	replyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var reply models.Reply
	if err := h.db.First(&reply, "id = ? AND status = ?", replyID, models.ReplyVisible).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	var req struct {
		Kind int16 `json:"kind"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || (req.Kind != models.ReactionLike && req.Kind != models.ReactionDislike) {
		// Default to like for backward compat (old frontend sends no kind)
		req.Kind = models.ReactionLike
	}

	actor := services.ActorFromContext(c)

	reaction := models.Reaction{
		ProfileID:  actor.ProfileID,
		TargetID:   replyID,
		TargetType: models.ReactionTargetReply,
		Kind:       req.Kind,
	}

	h.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "profile_id"}, {Name: "target_id"}, {Name: "target_type"}},
		DoUpdates: clause.AssignmentColumns([]string{"kind"}),
	}).Create(&reaction)

	h.updateReplyReactions(replyID)

	// Notify comment author
	notifType := models.NotifLike
	if req.Kind == models.ReactionDislike {
		notifType = models.NotifDislike
	}
	h.createNotification(reply.ProfileID, actor.ProfileID, notifType, replyID, models.ReactionTargetReply, reply.SubmissionID)

	counts := h.getReactionCounts(replyID, models.ReactionTargetReply)
	counts["user_reaction"] = int(req.Kind)
	c.JSON(http.StatusOK, counts)
}

func (h *Handler) UnreactReply(c *gin.Context) {
	replyID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	actor := services.ActorFromContext(c)

	h.db.Where("profile_id = ? AND target_id = ? AND target_type = ?",
		actor.ProfileID, replyID, models.ReactionTargetReply).
		Delete(&models.Reaction{})

	h.updateReplyReactions(replyID)

	counts := h.getReactionCounts(replyID, models.ReactionTargetReply)
	counts["user_reaction"] = 0
	c.JSON(http.StatusOK, counts)
}

// GetReplyReactions returns reaction data for all replies of an article.
func (h *Handler) GetReplyReactions(c *gin.Context) {
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var replyIDs []uuid.UUID
	h.db.Model(&models.Reply{}).
		Where("submission_id = ? AND status = ?", subID, models.ReplyVisible).
		Pluck("id", &replyIDs)

	if len(replyIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"reactions": map[string]any{}})
		return
	}

	// Get counts per reply per kind
	type countResult struct {
		TargetID uuid.UUID
		Kind     int16
		Count    int
	}
	var counts []countResult
	h.db.Model(&models.Reaction{}).
		Select("target_id, kind, COUNT(*) as count").
		Where("target_id IN ? AND target_type = ?", replyIDs, models.ReactionTargetReply).
		Group("target_id, kind").
		Scan(&counts)

	result := map[string]map[string]int{}
	for _, cnt := range counts {
		id := cnt.TargetID.String()
		if result[id] == nil {
			result[id] = map[string]int{}
		}
		if cnt.Kind == models.ReactionLike {
			result[id]["likes"] = cnt.Count
		} else if cnt.Kind == models.ReactionDislike {
			result[id]["dislikes"] = cnt.Count
		}
	}

	// Check user's reactions if auth present
	profileIDRaw, hasAuth := c.Get("profile_id")
	if hasAuth {
		idStr, _ := profileIDRaw.(string)
		pid, _ := uuid.Parse(idStr)
		var userReactions []models.Reaction
		h.db.Where("profile_id = ? AND target_id IN ? AND target_type = ?",
			pid, replyIDs, models.ReactionTargetReply).
			Find(&userReactions)
		for _, r := range userReactions {
			id := r.TargetID.String()
			if result[id] == nil {
				result[id] = map[string]int{}
			}
			result[id]["user_reaction"] = int(r.Kind)
		}
	}

	c.JSON(http.StatusOK, gin.H{"reactions": result})
}

// --- Helpers ---

func (h *Handler) getReactionCounts(targetID uuid.UUID, targetType int16) map[string]int {
	type result struct {
		Kind  int16
		Count int
	}
	var results []result
	h.db.Model(&models.Reaction{}).
		Select("kind, COUNT(*) as count").
		Where("target_id = ? AND target_type = ?", targetID, targetType).
		Group("kind").
		Scan(&results)

	counts := map[string]int{"likes": 0, "dislikes": 0}
	for _, r := range results {
		if r.Kind == models.ReactionLike {
			counts["likes"] = r.Count
		} else if r.Kind == models.ReactionDislike {
			counts["dislikes"] = r.Count
		}
	}
	return counts
}

func (h *Handler) updateSubmissionReactions(subID uuid.UUID) {
	counts := h.getReactionCounts(subID, models.ReactionTargetSubmission)
	reactions := map[string]int{"like": counts["likes"], "dislike": counts["dislikes"]}
	h.db.Model(&models.Submission{}).Where("id = ?", subID).
		Update("reactions", models.JSONB[map[string]int]{V: reactions})
}

func (h *Handler) updateReplyReactions(replyID uuid.UUID) {
	counts := h.getReactionCounts(replyID, models.ReactionTargetReply)
	h.db.Model(&models.Reply{}).Where("id = ?", replyID).
		UpdateColumn("meta", gorm.Expr("jsonb_set(COALESCE(meta, '{}'), '{reactions}', ?::jsonb)",
			fmt.Sprintf(`{"like": %d, "dislike": %d}`, counts["likes"], counts["dislikes"])))
}
