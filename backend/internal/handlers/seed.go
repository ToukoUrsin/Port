package handlers

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
)

func (h *Handler) SeedLocations(c *gin.Context) {
	var req struct {
		Locations []struct {
			ID          string              `json:"id"`
			Name        string              `json:"name" binding:"required"`
			Slug        string              `json:"slug" binding:"required"`
			Level       int16               `json:"level"`
			ParentID    *string             `json:"parent_id"`
			Lat         *float64            `json:"lat"`
			Lng         *float64            `json:"lng"`
			Description *string             `json:"description"`
			Meta        models.LocationMeta `json:"meta"`
		} `json:"locations" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created := 0
	skipped := 0
	for _, loc := range req.Locations {
		locID, err := uuid.Parse(loc.ID)
		if err != nil {
			locID = uuid.New()
		}

		// Skip if slug already exists
		var existing models.Location
		if h.db.Where("slug = ?", loc.Slug).First(&existing).Error == nil {
			skipped++
			continue
		}

		var parentID *uuid.UUID
		if loc.ParentID != nil {
			pid, err := uuid.Parse(*loc.ParentID)
			if err == nil {
				parentID = &pid
			}
		}

		// Build path from parent
		path := loc.Slug
		if parentID != nil {
			var parent models.Location
			if h.db.First(&parent, "id = ?", *parentID).Error == nil {
				path = parent.Path + "/" + loc.Slug
			}
		}

		newLoc := models.Location{
			ID:       locID,
			Name:     loc.Name,
			Slug:     loc.Slug,
			Level:    loc.Level,
			ParentID: parentID,
			Path:     path,
			Lat:      loc.Lat,
			Lng:      loc.Lng,
			IsActive: true,
			Meta:     models.JSONB[models.LocationMeta]{V: loc.Meta},
		}
		if loc.Description != nil {
			newLoc.Description = loc.Description
		}

		if err := h.db.Create(&newLoc).Error; err != nil {
			log.Printf("seed: location %s failed: %v", loc.Slug, err)
			continue
		}
		created++
	}

	c.JSON(http.StatusOK, gin.H{"created": created, "skipped": skipped})
}

func (h *Handler) SeedProfiles(c *gin.Context) {
	var req struct {
		Profiles []struct {
			ID          string `json:"id" binding:"required"`
			ProfileName string `json:"profile_name" binding:"required"`
			Email       string `json:"email" binding:"required"`
		} `json:"profiles" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	created := 0
	for _, p := range req.Profiles {
		profileID, err := uuid.Parse(p.ID)
		if err != nil {
			continue
		}

		var existing models.Profile
		if h.db.First(&existing, "id = ?", profileID).Error == nil {
			continue
		}

		profile := models.Profile{
			ID:          profileID,
			ProfileName: p.ProfileName,
			Email:       p.Email,
			Role:        0,
			Public:      true,
		}
		if err := h.db.Create(&profile).Error; err != nil {
			log.Printf("seed: profile %s failed: %v", p.ProfileName, err)
			continue
		}
		created++
	}

	c.JSON(http.StatusOK, gin.H{"created": created})
}

func (h *Handler) AdminUploadMedia(c *gin.Context) {
	subID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid submission id"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing file"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	if !allowed[ext] {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("file type %q not allowed", ext)})
		return
	}

	maxSize := int64(25) * 1024 * 1024
	path, size, err := h.media.SaveUploadedFile(file, subID, maxSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Compress image
	newPath, _, compErr := h.media.CompressImage(path)
	if compErr != nil {
		log.Printf("compression failed for %s: %v", path, compErr)
		newPath = path
	}
	if info, statErr := os.Stat(newPath); statErr == nil {
		size = info.Size()
	}

	filename := filepath.Base(newPath)
	url := fmt.Sprintf("/api/media/%s/%s", subID, filename)
	c.JSON(http.StatusOK, gin.H{"url": url, "size": size})
}
