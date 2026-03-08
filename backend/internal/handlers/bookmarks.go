package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
	"gorm.io/gorm/clause"
)

func (h *Handler) BookmarkArticle(c *gin.Context) {
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

	actor := services.ActorFromContext(c)

	bm := models.Bookmark{
		ProfileID: actor.ProfileID,
		ArticleID: subID,
	}

	h.db.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "profile_id"}, {Name: "article_id"}},
		DoNothing: true,
	}).Create(&bm)

	h.cache.Delete(c.Request.Context(), "feed:perso:"+actor.ProfileID.String())

	c.JSON(http.StatusOK, gin.H{"bookmarked": true})
}

func (h *Handler) UnbookmarkArticle(c *gin.Context) {
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	actor := services.ActorFromContext(c)

	h.db.Where("profile_id = ? AND article_id = ?", actor.ProfileID, subID).
		Delete(&models.Bookmark{})

	h.cache.Delete(c.Request.Context(), "feed:perso:"+actor.ProfileID.String())

	c.JSON(http.StatusOK, gin.H{"bookmarked": false})
}

func (h *Handler) ListBookmarks(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if limit > 100 {
		limit = 100
	}

	actor := services.ActorFromContext(c)

	var total int64
	h.db.Model(&models.Bookmark{}).
		Where("profile_id = ?", actor.ProfileID).
		Count(&total)

	var articleIDs []uuid.UUID
	h.db.Model(&models.Bookmark{}).
		Where("profile_id = ?", actor.ProfileID).
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Pluck("article_id", &articleIDs)

	if len(articleIDs) == 0 {
		c.JSON(http.StatusOK, gin.H{"articles": []any{}, "total": 0})
		return
	}

	var articles []models.Submission
	h.db.Where("id IN ? AND status = ?", articleIDs, models.StatusPublished).Find(&articles)

	// Preserve bookmark order (most recent first)
	orderMap := make(map[uuid.UUID]int, len(articleIDs))
	for i, id := range articleIDs {
		orderMap[id] = i
	}
	ordered := make([]models.Submission, len(articleIDs))
	for _, a := range articles {
		if idx, ok := orderMap[a.ID]; ok {
			ordered[idx] = a
		}
	}
	// Remove zero-value entries (deleted articles)
	result := make([]models.Submission, 0, len(ordered))
	for _, a := range ordered {
		if a.ID != uuid.Nil {
			result = append(result, a)
		}
	}

	h.fillLocationNames(result)
	h.fillOwnerNames(result)
	c.JSON(http.StatusOK, gin.H{"articles": result, "total": total})
}

func (h *Handler) GetBookmarkStatus(c *gin.Context) {
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	actor := services.ActorFromContext(c)

	var count int64
	h.db.Model(&models.Bookmark{}).
		Where("profile_id = ? AND article_id = ?", actor.ProfileID, subID).
		Count(&count)

	c.JSON(http.StatusOK, gin.H{"bookmarked": count > 0})
}
