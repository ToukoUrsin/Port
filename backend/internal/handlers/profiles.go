package handlers

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
)

func (h *Handler) GetMyProfile(c *gin.Context) {
	profileID, _ := c.Get("profile_id")
	id, _ := uuid.Parse(profileID.(string))

	var profile models.Profile
	if err := h.db.First(&profile, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func (h *Handler) GetProfile(c *gin.Context) {
	param := c.Param("id")

	var profile models.Profile
	if id, err := uuid.Parse(param); err == nil {
		if err := h.db.First(&profile, "id = ?", id).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
	} else {
		if err := h.db.First(&profile, "profile_name = ?", param).Error; err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
	}

	// Check if we have auth context (optional auth)
	profileIDRaw, hasAuth := c.Get("profile_id")
	if hasAuth {
		idStr, _ := profileIDRaw.(string)
		pid, _ := uuid.Parse(idStr)
		role, _ := c.Get("role")
		perm, _ := c.Get("perm")
		roleVal, _ := role.(int)
		permVal, _ := perm.(int64)
		actor := services.Actor{ProfileID: pid, Role: roleVal, Perm: permVal}
		if !h.access.CanViewProfile(actor, &profile) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
	} else {
		if !profile.Public {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}
	}

	c.JSON(http.StatusOK, profile)
}

func (h *Handler) UpdateProfile(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var profile models.Profile
	if err := h.db.First(&profile, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanViewProfile(actor, &profile) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.access.CanEditProfile(actor, &profile) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req struct {
		ProfileName *string             `json:"profile_name"`
		Public      *bool               `json:"public"`
		Meta        *models.ProfileMeta `json:"meta"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	updates := map[string]any{}
	if req.ProfileName != nil {
		updates["profile_name"] = *req.ProfileName
	}
	if req.Public != nil {
		updates["public"] = *req.Public
	}
	if req.Meta != nil {
		updates["meta"] = models.JSONB[models.ProfileMeta]{V: *req.Meta}
	}

	if len(updates) > 0 {
		if err := h.db.Model(&profile).Updates(updates).Error; err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				c.JSON(http.StatusConflict, gin.H{"error": "profile_name already taken"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "update failed"})
			return
		}
	}

	h.cache.DelProfile(c.Request.Context(), id.String())

	h.db.First(&profile, "id = ?", id)
	c.JSON(http.StatusOK, profile)
}

func (h *Handler) CheckProfileName(c *gin.Context) {
	name := strings.TrimSpace(c.Query("name"))
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}

	var count int64
	h.db.Model(&models.Profile{}).Where("profile_name = ?", name).Count(&count)
	c.JSON(http.StatusOK, gin.H{"available": count == 0})
}

func (h *Handler) ChangeUserRole(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req struct {
		Role int `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.Role < int(models.RoleContributor) || req.Role > int(models.RoleAdmin) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "role must be between 0 and 2"})
		return
	}

	var target models.Profile
	if err := h.db.First(&target, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanChangeRole(actor, &target, req.Role) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	h.db.Model(&target).Update("role", req.Role)
	h.cache.DelProfile(c.Request.Context(), target.ID.String())

	c.JSON(http.StatusOK, gin.H{"role": req.Role})
}
