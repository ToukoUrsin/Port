package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/localnews/backend/internal/models"
)

type registerRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	DisplayName string `json:"display_name"`
}

func (h *Handler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	// Check email uniqueness
	var existing models.Profile
	if err := h.db.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "email already taken"})
		return
	}

	hash, err := h.auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal error"})
		return
	}

	profileName := req.DisplayName
	if profileName == "" {
		profileName = strings.Split(req.Email, "@")[0]
	}

	// Check profile name uniqueness, append random suffix if taken
	var nameCheck models.Profile
	if h.db.Where("profile_name = ?", profileName).First(&nameCheck).Error == nil {
		profileName = profileName + "-" + strings.Split(req.Email, "@")[0]
	}

	profile := models.Profile{
		ProfileName:  profileName,
		Email:        req.Email,
		PasswordHash: hash,
		Role:         models.RoleContributor,
		Permissions:  models.DefaultPermissions(models.RoleContributor),
	}

	if err := h.db.Create(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create profile"})
		return
	}

	accessToken, err := h.auth.GenerateAccessToken(&profile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	refreshToken, _, err := h.auth.GenerateRefreshToken(profile.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	h.auth.SetRefreshCookie(c, refreshToken)
	h.auth.CacheProfile(&profile)

	c.JSON(http.StatusCreated, gin.H{
		"access_token": accessToken,
		"profile":      profile,
	})
}

type loginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	var profile models.Profile
	if err := h.db.Where("email = ?", req.Email).First(&profile).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	if err := h.auth.CheckPassword(profile.PasswordHash, req.Password); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	accessToken, err := h.auth.GenerateAccessToken(&profile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	refreshToken, _, err := h.auth.GenerateRefreshToken(profile.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate refresh token"})
		return
	}

	h.auth.SetRefreshCookie(c, refreshToken)
	h.auth.CacheProfile(&profile)

	c.JSON(http.StatusOK, gin.H{
		"access_token": accessToken,
		"profile":      profile,
	})
}

func (h *Handler) Refresh(c *gin.Context) {
	tokenStr, err := h.auth.GetRefreshCookie(c.Request)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing refresh token"})
		return
	}

	profile, newRefresh, err := h.auth.RotateRefreshToken(tokenStr)
	if err != nil {
		h.auth.ClearRefreshCookie(c)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}

	accessToken, err := h.auth.GenerateAccessToken(profile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate token"})
		return
	}

	h.auth.SetRefreshCookie(c, newRefresh)
	h.auth.CacheProfile(profile)

	c.JSON(http.StatusOK, gin.H{
		"access_token": accessToken,
	})
}

func (h *Handler) Logout(c *gin.Context) {
	tokenStr, err := h.auth.GetRefreshCookie(c.Request)
	if err == nil {
		h.auth.RevokeRefreshToken(tokenStr)
	}
	h.auth.ClearRefreshCookie(c)

	profileID, exists := c.Get("profile_id")
	if exists {
		h.cache.DelProfile(c.Request.Context(), profileID.(string))
	}

	c.Status(http.StatusNoContent)
}
