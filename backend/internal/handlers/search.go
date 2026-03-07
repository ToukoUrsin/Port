package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/localnews/backend/internal/models"
)

func (h *Handler) Search(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
		return
	}

	searchType := c.Query("type")
	locationID := c.Query("location_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	if limit > 100 {
		limit = 100
	}

	results := map[string]any{}

	if searchType == "" || searchType == "submissions" {
		var submissions []models.Submission
		stmt := h.db.Where("status = ? AND search_vector @@ plainto_tsquery('english', ?)", models.StatusPublished, q).
			Order("ts_rank(search_vector, plainto_tsquery('english', ?)) DESC").
			Limit(limit).Offset(offset)
		if locationID != "" {
			stmt = stmt.Where("location_id = ?", locationID)
		}
		stmt.Find(&submissions)
		results["submissions"] = submissions
	}

	if searchType == "" || searchType == "profiles" {
		var profiles []models.Profile
		h.db.Where("search_vector @@ plainto_tsquery('simple', ?)", q).
			Order("ts_rank(search_vector, plainto_tsquery('simple', ?)) DESC").
			Limit(limit).Offset(offset).
			Find(&profiles)
		results["profiles"] = profiles
	}

	c.JSON(http.StatusOK, results)
}
