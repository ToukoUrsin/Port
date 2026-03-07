package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
)

func (h *Handler) ListLocations(c *gin.Context) {
	var locations []models.Location
	q := h.db.Where("is_active = ?", true)

	if country := c.Query("country"); country != "" {
		q = q.Where("path LIKE ? OR slug = ?", "%/"+country+"/%", country)
	}
	if level := c.Query("level"); level != "" {
		if lvl, err := strconv.Atoi(level); err == nil {
			q = q.Where("level = ?", lvl)
		}
	}

	q.Order("level ASC, name ASC").Find(&locations)

	// Compute article counts dynamically
	for i := range locations {
		var count int64
		h.db.Model(&models.Submission{}).
			Where("location_id = ? AND status = ?", locations[i].ID, models.StatusPublished).
			Count(&count)
		locations[i].ArticleCount = int(count)
	}

	c.JSON(http.StatusOK, gin.H{"locations": locations})
}

func (h *Handler) GetLocation(c *gin.Context) {
	slug := c.Param("slug")
	key := "locations:" + slug

	var loc models.Location
	if h.cache.Get(c.Request.Context(), key, &loc) {
		c.JSON(http.StatusOK, loc)
		return
	}

	if err := h.db.Where("slug = ?", slug).First(&loc).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	h.cache.Set(c.Request.Context(), key, loc)
	c.JSON(http.StatusOK, loc)
}

func (h *Handler) LocationArticles(c *gin.Context) {
	slug := c.Param("slug")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if limit > 100 {
		limit = 100
	}

	var loc models.Location
	if err := h.db.Where("slug = ?", slug).First(&loc).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "location not found"})
		return
	}

	var articles []models.Submission
	h.db.Where(
		"location_id IN (SELECT id FROM locations WHERE id = ? OR path LIKE ?) AND status = ?",
		loc.ID, loc.Path+"/%", models.StatusPublished,
	).Order("updated_at DESC").Limit(limit).Offset(offset).Find(&articles)

	c.JSON(http.StatusOK, gin.H{"articles": articles})
}

func (h *Handler) CreateLocation(c *gin.Context) {
	actor := services.ActorFromContext(c)
	if !h.access.CanCreateLocation(actor) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req struct {
		Name        string     `json:"name" binding:"required"`
		Slug        string     `json:"slug" binding:"required"`
		Level       int16      `json:"level"`
		ParentID    *uuid.UUID `json:"parent_id"`
		Path        string     `json:"path" binding:"required"`
		Description *string    `json:"description"`
		Lat         *float64   `json:"lat"`
		Lng         *float64   `json:"lng"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	loc := models.Location{
		Name:        req.Name,
		Slug:        req.Slug,
		Level:       req.Level,
		ParentID:    req.ParentID,
		Path:        req.Path,
		Description: req.Description,
		Lat:         req.Lat,
		Lng:         req.Lng,
		IsActive:    true,
	}

	if err := h.db.Create(&loc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create location"})
		return
	}

	c.JSON(http.StatusCreated, loc)
}

func (h *Handler) UpdateLocation(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var loc models.Location
	if err := h.db.First(&loc, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanEditLocation(actor) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req struct {
		Name        *string  `json:"name"`
		Description *string  `json:"description"`
		Lat         *float64 `json:"lat"`
		Lng         *float64 `json:"lng"`
		IsActive    *bool    `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	updates := map[string]any{}
	if req.Name != nil {
		updates["name"] = *req.Name
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Lat != nil {
		updates["lat"] = *req.Lat
	}
	if req.Lng != nil {
		updates["lng"] = *req.Lng
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) > 0 {
		h.db.Model(&loc).Updates(updates)
	}

	// Invalidate cache
	h.cache.Delete(c.Request.Context(), "locations:"+loc.Slug)

	h.db.First(&loc, "id = ?", id)
	c.JSON(http.StatusOK, loc)
}
