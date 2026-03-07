package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/localnews/backend/internal/services"
)

func (h *Handler) CreateBatch(c *gin.Context) {
	var req struct {
		Articles []services.BatchArticleInput `json:"articles" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if len(req.Articles) == 0 || len(req.Articles) > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "articles must contain 1-100 items"})
		return
	}

	for i, a := range req.Articles {
		if a.Title == "" || a.Content == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "article at index " + itoa(i) + " missing title or content"})
			return
		}
		if a.LocationID.String() == "00000000-0000-0000-0000-000000000000" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "article at index " + itoa(i) + " missing location_id"})
			return
		}
		if a.OwnerID.String() == "00000000-0000-0000-0000-000000000000" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "article at index " + itoa(i) + " missing owner_id"})
			return
		}
	}

	job := h.batch.Submit(req.Articles)
	c.JSON(http.StatusAccepted, gin.H{
		"job_id": job.ID,
		"total":  job.Total,
		"status": job.Status,
	})
}

func (h *Handler) GetBatchStatus(c *gin.Context) {
	job := h.batch.GetJob(c.Param("id"))
	if job == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "job not found"})
		return
	}
	c.JSON(http.StatusOK, job)
}

func itoa(i int) string {
	return fmt.Sprintf("%d", i)
}
