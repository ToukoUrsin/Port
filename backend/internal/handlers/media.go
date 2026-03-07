package handlers

import (
	"net/http"
	"path/filepath"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ServeMedia(c *gin.Context) {
	submissionID := c.Param("submissionID")
	filename := c.Param("filename")

	filePath := filepath.Join(h.cfg.MediaStoragePath, submissionID, filename)
	c.File(filePath)

	if c.Writer.Status() == http.StatusNotFound {
		c.JSON(http.StatusNotFound, gin.H{"error": "file not found"})
	}
}
