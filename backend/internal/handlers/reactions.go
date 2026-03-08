package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
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

	counts := h.updateAndGetSubmissionReactions(subID)
	h.recalculateKarma(sub.OwnerID)
	h.cache.Delete(c.Request.Context(), "articles:"+subID.String())

	// Notify article owner (async)
	notifType := models.NotifLike
	if req.Kind == models.ReactionDislike {
		notifType = models.NotifDislike
	}
	go h.createNotification(sub.OwnerID, actor.ProfileID, notifType, subID, models.ReactionTargetSubmission, subID)

	counts["user_reaction"] = int(req.Kind)
	c.JSON(http.StatusOK, counts)
}

func (h *Handler) UnreactArticle(c *gin.Context) {
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Look up article owner for karma update
	var sub models.Submission
	if err := h.db.Select("owner_id").First(&sub, "id = ?", subID).Error; err == nil {
		defer h.recalculateKarma(sub.OwnerID)
	}

	actor := services.ActorFromContext(c)

	h.db.Where("profile_id = ? AND target_id = ? AND target_type = ?",
		actor.ProfileID, subID, models.ReactionTargetSubmission).
		Delete(&models.Reaction{})

	counts := h.updateAndGetSubmissionReactions(subID)
	h.cache.Delete(c.Request.Context(), "articles:"+subID.String())

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

	counts := h.updateAndGetReplyReactions(replyID)

	// Notify comment author (async)
	notifType := models.NotifLike
	if req.Kind == models.ReactionDislike {
		notifType = models.NotifDislike
	}
	go h.createNotification(reply.ProfileID, actor.ProfileID, notifType, replyID, models.ReactionTargetReply, reply.SubmissionID)

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

	counts := h.updateAndGetReplyReactions(replyID)

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

// updateAndGetSubmissionReactions counts reactions and denormalizes into submissions.reactions in a single CTE query.
func (h *Handler) updateAndGetSubmissionReactions(subID uuid.UUID) map[string]int {
	var likes, dislikes int
	err := h.db.Raw(`
		WITH counts AS (
			SELECT COALESCE(SUM(CASE WHEN kind=1 THEN 1 ELSE 0 END),0) AS likes,
			       COALESCE(SUM(CASE WHEN kind=-1 THEN 1 ELSE 0 END),0) AS dislikes
			FROM reactions WHERE target_id = ? AND target_type = ?
		)
		UPDATE submissions SET reactions = jsonb_build_object('like',counts.likes,'dislike',counts.dislikes)
		FROM counts WHERE submissions.id = ?
		RETURNING counts.likes, counts.dislikes`,
		subID, models.ReactionTargetSubmission, subID).Row().Scan(&likes, &dislikes)
	if err != nil {
		log.Printf("updateAndGetSubmissionReactions: %v", err)
		return map[string]int{"likes": 0, "dislikes": 0}
	}
	return map[string]int{"likes": likes, "dislikes": dislikes}
}

// updateAndGetReplyReactions counts reactions and denormalizes into replies.meta.reactions in a single CTE query.
func (h *Handler) updateAndGetReplyReactions(replyID uuid.UUID) map[string]int {
	var likes, dislikes int
	err := h.db.Raw(`
		WITH counts AS (
			SELECT COALESCE(SUM(CASE WHEN kind=1 THEN 1 ELSE 0 END),0) AS likes,
			       COALESCE(SUM(CASE WHEN kind=-1 THEN 1 ELSE 0 END),0) AS dislikes
			FROM reactions WHERE target_id = ? AND target_type = ?
		)
		UPDATE replies SET meta = jsonb_set(COALESCE(meta,'{}'), '{reactions}',
			jsonb_build_object('like',counts.likes,'dislike',counts.dislikes))
		FROM counts WHERE replies.id = ?
		RETURNING counts.likes, counts.dislikes`,
		replyID, models.ReactionTargetReply, replyID).Row().Scan(&likes, &dislikes)
	if err != nil {
		log.Printf("updateAndGetReplyReactions: %v", err)
		return map[string]int{"likes": 0, "dislikes": 0}
	}
	return map[string]int{"likes": likes, "dislikes": dislikes}
}
