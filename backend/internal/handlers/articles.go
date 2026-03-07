package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
)

func (h *Handler) ListArticles(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	locationID := c.Query("location_id")
	locationIDs := c.Query("location_ids")

	if limit > 100 {
		limit = 100
	}

	query := h.db.Model(&models.Submission{}).Where("status = ?", models.StatusPublished)

	if locationIDs != "" {
		ids := strings.Split(locationIDs, ",")
		query = query.Where(
			"location_id IN (SELECT l2.id FROM locations l1 JOIN locations l2 ON l2.id = l1.id OR l2.path LIKE l1.path || '/%' WHERE l1.id IN ?)",
			ids,
		)
	} else if locationID != "" {
		query = query.Where(
			"location_id IN (SELECT l2.id FROM locations l1 JOIN locations l2 ON l2.id = l1.id OR l2.path LIKE l1.path || '/%' WHERE l1.id = ?)",
			locationID,
		)
	}

	// Filter by country: match locations whose path contains this country segment
	country := c.Query("country")
	if country != "" {
		query = query.Where(
			"location_id IN (SELECT id FROM locations WHERE path LIKE ? OR path LIKE ? OR slug = ?)",
			"%/"+country+"/%", "%/"+country, country,
		)
	}

	category := c.Query("category")
	if category != "" {
		query = query.Where("meta->>'category' = ?", category)
	}

	ownerID := c.Query("owner_id")
	if ownerID != "" {
		query = query.Where("owner_id = ?", ownerID)
	}

	var total int64
	query.Count(&total)

	var articles []models.Submission
	query.Order("updated_at DESC").Limit(limit).Offset(offset).Find(&articles)

	c.JSON(http.StatusOK, gin.H{"articles": articles, "total": total})
}

func (h *Handler) GetArticle(c *gin.Context) {
	idStr := c.Param("id")
	key := "articles:" + idStr

	// Cache hit
	var article models.Submission
	if h.cache.Get(c.Request.Context(), key, &article) {
		c.JSON(http.StatusOK, article)
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.db.First(&article, "id = ? AND status = ?", id, models.StatusPublished).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	h.cache.Set(c.Request.Context(), key, article)
	c.JSON(http.StatusOK, article)
}

func (h *Handler) SimilarArticles(c *gin.Context) {
	idStr := c.Param("id")
	key := "similar:" + idStr

	// Cache hit
	var cached []models.Submission
	if h.cache.Get(c.Request.Context(), key, &cached) {
		c.JSON(http.StatusOK, gin.H{"articles": cached})
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Verify article exists and is published
	var article models.Submission
	if err := h.db.First(&article, "id = ? AND status = ?", id, models.StatusPublished).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	// Determine the country path from the article's location so similar
	// articles are restricted to the same country/language.
	var countryPath string
	var loc models.Location
	if h.db.First(&loc, "id = ?", article.LocationID).Error == nil {
		parts := strings.SplitN(loc.Path, "/", 3) // e.g. "europe/finland/uusimaa/helsinki"
		if len(parts) >= 2 {
			countryPath = parts[0] + "/" + parts[1] // "europe/finland"
		}
	}

	similar, err := h.search.SimilarArticles(c.Request.Context(), id, 5, countryPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
		return
	}
	if similar == nil {
		similar = []models.Submission{}
	}

	h.cache.Set(c.Request.Context(), key, similar)
	c.JSON(http.StatusOK, gin.H{"articles": similar})
}

func (h *Handler) UpdateArticle(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ? AND status = ?", id, models.StatusPublished).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanEditSubmission(actor, &sub) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	updates := map[string]any{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}

	if len(updates) > 0 {
		h.db.Model(&sub).Updates(updates)
	}

	// Invalidate cache
	h.cache.Delete(c.Request.Context(), "articles:"+id.String())
	h.cache.DeletePattern(c.Request.Context(), "articles:list:"+sub.LocationID.String()+":*")

	h.db.First(&sub, "id = ?", id)
	c.JSON(http.StatusOK, sub)
}
