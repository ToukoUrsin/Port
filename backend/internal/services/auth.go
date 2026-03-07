package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/cache"
	"github.com/localnews/backend/internal/middleware"
	"github.com/localnews/backend/internal/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db            *gorm.DB
	cache         *cache.Cache
	jwtSecret     []byte
	accessTTL     time.Duration
	refreshTTL    time.Duration
	secureCookies bool
}

func NewAuthService(db *gorm.DB, cache *cache.Cache, jwtSecret string, accessTTL, refreshTTL time.Duration, secureCookies bool) *AuthService {
	return &AuthService{
		db:            db,
		cache:         cache,
		jwtSecret:     []byte(jwtSecret),
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
		secureCookies: secureCookies,
	}
}

func (s *AuthService) HashPassword(password string) ([]byte, error) {
	return bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
}

func (s *AuthService) CheckPassword(hash []byte, password string) error {
	return bcrypt.CompareHashAndPassword(hash, []byte(password))
}

func (s *AuthService) GenerateAccessToken(profile *models.Profile) (string, error) {
	now := time.Now()
	claims := middleware.Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   profile.ID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTTL)),
		},
		Role: int(profile.Role),
		Perm: profile.Permissions,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

func (s *AuthService) ValidateAccessToken(tokenStr string) (*middleware.Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &middleware.Claims{}, func(token *jwt.Token) (any, error) {
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*middleware.Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

func (s *AuthService) GenerateRefreshToken(profileID uuid.UUID) (string, *models.RefreshToken, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", nil, err
	}
	tokenStr := base64.URLEncoding.EncodeToString(raw)
	hash := sha256.Sum256([]byte(tokenStr))

	rt := &models.RefreshToken{
		ProfileID: profileID,
		TokenHash: hash[:],
		ExpiresAt: time.Now().Add(s.refreshTTL),
	}
	if err := s.db.Create(rt).Error; err != nil {
		return "", nil, err
	}

	// Cache the refresh token
	hashHex := hex.EncodeToString(hash[:])
	s.cache.SetRefreshToken(context.Background(), hashHex, &cache.CachedRefresh{
		ProfileID: profileID.String(),
		ExpiresAt: rt.ExpiresAt.Unix(),
	}, s.refreshTTL)

	return tokenStr, rt, nil
}

func (s *AuthService) RotateRefreshToken(tokenStr string) (*models.Profile, string, error) {
	hash := sha256.Sum256([]byte(tokenStr))
	hashBytes := hash[:]
	hashHex := hex.EncodeToString(hashBytes)

	// Find existing token (use decode(hex) for reliable bytea comparison)
	var existing models.RefreshToken
	err := s.db.Where("token_hash = decode(?, 'hex')", hashHex).First(&existing).Error
	if err != nil {
		return nil, "", fmt.Errorf("invalid refresh token")
	}

	// Reuse detection: if already revoked, revoke ALL tokens for the profile
	if existing.Revoked {
		s.RevokeAllForProfile(existing.ProfileID)
		return nil, "", fmt.Errorf("refresh token reuse detected")
	}

	// Check expiry
	if time.Now().After(existing.ExpiresAt) {
		return nil, "", fmt.Errorf("refresh token expired")
	}

	// Revoke old token
	s.db.Model(&existing).Update("revoked", true)
	s.cache.DelRefreshToken(context.Background(), hashHex)
	remaining := time.Until(existing.ExpiresAt)
	if remaining > 0 {
		s.cache.MarkRevoked(context.Background(), hashHex, remaining)
	}

	// Load profile
	var profile models.Profile
	if err := s.db.First(&profile, "id = ?", existing.ProfileID).Error; err != nil {
		return nil, "", fmt.Errorf("profile not found")
	}

	// Generate new refresh token
	newTokenStr, _, err := s.GenerateRefreshToken(profile.ID)
	if err != nil {
		return nil, "", err
	}

	return &profile, newTokenStr, nil
}

func (s *AuthService) RevokeRefreshToken(tokenStr string) error {
	hash := sha256.Sum256([]byte(tokenStr))
	hashHex := hex.EncodeToString(hash[:])

	var rt models.RefreshToken
	if err := s.db.Where("token_hash = decode(?, 'hex')", hashHex).First(&rt).Error; err != nil {
		return nil
	}

	s.db.Model(&rt).Update("revoked", true)
	s.cache.DelRefreshToken(context.Background(), hashHex)
	remaining := time.Until(rt.ExpiresAt)
	if remaining > 0 {
		s.cache.MarkRevoked(context.Background(), hashHex, remaining)
	}
	return nil
}

func (s *AuthService) RevokeAllForProfile(profileID uuid.UUID) {
	var tokens []models.RefreshToken
	s.db.Where("profile_id = ? AND revoked = false", profileID).Find(&tokens)

	// Bulk DB update — one query instead of N
	if len(tokens) > 0 {
		s.db.Model(&models.RefreshToken{}).
			Where("profile_id = ? AND revoked = false", profileID).
			Update("revoked", true)
	}

	// Batch cache ops via pipeline
	ctx := context.Background()
	entries := make([]cache.RevokeEntry, 0, len(tokens))
	for _, t := range tokens {
		remaining := time.Until(t.ExpiresAt)
		entries = append(entries, cache.RevokeEntry{
			TokenHash: hex.EncodeToString(t.TokenHash),
			TTL:       remaining,
		})
	}
	s.cache.BatchRevokeTokens(ctx, entries, profileID.String())
}

func (s *AuthService) SetRefreshCookie(c *gin.Context, tokenStr string) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "refresh",
		Value:    tokenStr,
		Path:     "/api/auth",
		MaxAge:   int(s.refreshTTL.Seconds()),
		Secure:   s.secureCookies,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *AuthService) ClearRefreshCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "refresh",
		Value:    "",
		Path:     "/api/auth",
		MaxAge:   -1,
		Secure:   s.secureCookies,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})
}

func (s *AuthService) GetRefreshCookie(r *http.Request) (string, error) {
	cookie, err := r.Cookie("refresh")
	if err != nil {
		return "", err
	}
	// Gin URL-encodes cookie values; Go's net/http does not auto-decode them
	decoded, err := url.QueryUnescape(cookie.Value)
	if err != nil {
		return cookie.Value, nil
	}
	return decoded, nil
}

func (s *AuthService) FindOrCreateOAuthProfile(provider int16, providerUID, email, name, avatar string) (*models.Profile, bool, error) {
	// 1. Look up existing OAuth link
	var oauth models.OAuthAccount
	if err := s.db.Where("provider = ? AND provider_uid = ?", provider, providerUID).First(&oauth).Error; err == nil {
		var profile models.Profile
		if err := s.db.First(&profile, "id = ?", oauth.ProfileID).Error; err != nil {
			return nil, false, fmt.Errorf("linked profile not found: %w", err)
		}
		return &profile, false, nil
	}

	// 2. Look up existing profile by email → link OAuth account
	var existing models.Profile
	if err := s.db.Where("email = ?", email).First(&existing).Error; err == nil {
		oauthAcct := models.OAuthAccount{
			ProfileID:   existing.ID,
			Provider:    provider,
			ProviderUID: providerUID,
			Meta: models.JSONB[models.OAuthAccountMeta]{
				V: models.OAuthAccountMeta{
					DisplayName: name,
					AvatarURL:   avatar,
				},
			},
		}
		if err := s.db.Create(&oauthAcct).Error; err != nil {
			return nil, false, fmt.Errorf("failed to link oauth: %w", err)
		}
		return &existing, false, nil
	}

	// 3. Create new profile + OAuth account
	profileName := name
	if profileName == "" {
		parts := strings.SplitN(email, "@", 2)
		profileName = parts[0]
	}
	// Replace spaces with hyphens, lowercase
	profileName = strings.ToLower(strings.ReplaceAll(profileName, " ", "-"))

	// Ensure unique profile_name
	baseName := profileName
	var nameCheck models.Profile
	for i := 0; ; i++ {
		candidate := baseName
		if i > 0 {
			candidate = fmt.Sprintf("%s-%d", baseName, i)
		}
		if s.db.Where("profile_name = ?", candidate).First(&nameCheck).Error != nil {
			profileName = candidate
			break
		}
	}

	profile := models.Profile{
		ProfileName: profileName,
		Email:       email,
		Role:        models.RoleContributor,
		Permissions: models.DefaultPermissions(models.RoleContributor),
		Meta: models.JSONB[models.ProfileMeta]{
			V: models.ProfileMeta{
				Avatar: avatar,
			},
		},
	}

	if err := s.db.Create(&profile).Error; err != nil {
		return nil, false, fmt.Errorf("failed to create profile: %w", err)
	}

	oauthAcct := models.OAuthAccount{
		ProfileID:   profile.ID,
		Provider:    provider,
		ProviderUID: providerUID,
		Meta: models.JSONB[models.OAuthAccountMeta]{
			V: models.OAuthAccountMeta{
				DisplayName: name,
				AvatarURL:   avatar,
			},
		},
	}
	if err := s.db.Create(&oauthAcct).Error; err != nil {
		return nil, true, fmt.Errorf("failed to create oauth account: %w", err)
	}

	return &profile, true, nil
}

func (s *AuthService) CacheProfile(profile *models.Profile) {
	s.cache.SetProfile(context.Background(), profile.ID.String(), &cache.CachedProfile{
		Role:        int(profile.Role),
		Perm:        profile.Permissions,
		Email:       profile.Email,
		DisplayName: profile.ProfileName,
	}, 15*time.Minute)
}
