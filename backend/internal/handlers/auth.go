package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/localnews/backend/internal/models"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
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

func (h *Handler) googleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     h.cfg.GoogleClientID,
		ClientSecret: h.cfg.GoogleSecret,
		RedirectURL:  h.cfg.GoogleRedirect,
		Scopes:       []string{"openid", "email", "profile"},
		Endpoint:     google.Endpoint,
	}
}

func (h *Handler) AuthConfig(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"google_enabled": h.cfg.GoogleClientID != "",
	})
}

func (h *Handler) GoogleRedirect(c *gin.Context) {
	if h.cfg.GoogleClientID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Google OAuth not configured"})
		return
	}

	stateBytes := make([]byte, 16)
	if _, err := rand.Read(stateBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate state"})
		return
	}
	state := base64.URLEncoding.EncodeToString(stateBytes)

	c.SetCookie("oauth_state", state, 600, "/api/auth", "", false, true)

	url := h.googleOAuthConfig().AuthCodeURL(state)
	c.Redirect(http.StatusFound, url)
}

type googleUserInfo struct {
	ID      string `json:"id"`
	Email   string `json:"email"`
	Name    string `json:"name"`
	Picture string `json:"picture"`
}

func (h *Handler) GoogleCallback(c *gin.Context) {
	// Validate state
	stateCookie, err := c.Cookie("oauth_state")
	if err != nil || stateCookie == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing state cookie"})
		return
	}
	if c.Query("state") != stateCookie {
		c.JSON(http.StatusBadRequest, gin.H{"error": "state mismatch"})
		return
	}
	// Clear state cookie
	c.SetCookie("oauth_state", "", -1, "/api/auth", "", false, true)

	// Check for error from Google
	if errParam := c.Query("error"); errParam != "" {
		frontendOrigin := strings.Split(h.cfg.AllowedOrigins, ",")[0]
		c.Redirect(http.StatusFound, frontendOrigin+"/login?error=oauth_denied")
		return
	}

	// Exchange code for token
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing code"})
		return
	}

	oauthCfg := h.googleOAuthConfig()
	token, err := oauthCfg.Exchange(c.Request.Context(), code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code exchange failed"})
		return
	}

	// Fetch user info from Google
	client := oauthCfg.Client(c.Request.Context(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch user info"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read user info"})
		return
	}

	var userInfo googleUserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse user info"})
		return
	}

	if userInfo.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no email from Google"})
		return
	}

	// Find or create profile
	profile, _, err := h.auth.FindOrCreateOAuthProfile(
		models.ProviderGoogle,
		userInfo.ID,
		userInfo.Email,
		userInfo.Name,
		userInfo.Picture,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create account"})
		return
	}

	// Generate tokens
	accessToken, err := h.auth.GenerateAccessToken(profile)
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
	h.auth.CacheProfile(profile)

	// Redirect to frontend callback page with access token in fragment
	frontendOrigin := strings.Split(h.cfg.AllowedOrigins, ",")[0]
	redirectURL := fmt.Sprintf("%s/auth/callback#access_token=%s", frontendOrigin, accessToken)
	c.Redirect(http.StatusFound, redirectURL)
}
