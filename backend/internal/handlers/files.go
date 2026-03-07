package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
)

func (h *Handler) ListMyFiles(c *gin.Context) {
	actor := services.ActorFromContext(c)

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if limit > 100 {
		limit = 100
	}

	query := h.db.Model(&models.File{}).Where("contributor_id = ?", actor.ProfileID)

	if ft := c.Query("file_type"); ft != "" {
		if fileType, err := strconv.Atoi(ft); err == nil {
			query = query.Where("file_type = ?", fileType)
		}
	}

	var total int64
	query.Count(&total)

	var files []models.File
	query.Order("uploaded_at DESC").Limit(limit).Offset(offset).Find(&files)

	c.JSON(http.StatusOK, gin.H{"files": files, "total": total})
}
