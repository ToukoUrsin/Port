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
	db         *gorm.DB
	cache      *cache.Cache
	jwtSecret  []byte
	accessTTL  time.Duration
	refreshTTL time.Duration
}

func NewAuthService(db *gorm.DB, cache *cache.Cache, jwtSecret string, accessTTL, refreshTTL time.Duration) *AuthService {
	return &AuthService{
		db:         db,
		cache:      cache,
		jwtSecret:  []byte(jwtSecret),
		accessTTL:  accessTTL,
		refreshTTL: refreshTTL,
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
	for _, t := range tokens {
		s.db.Model(&t).Update("revoked", true)
		hashHex := hex.EncodeToString(t.TokenHash)
		s.cache.DelRefreshToken(context.Background(), hashHex)
		remaining := time.Until(t.ExpiresAt)
		if remaining > 0 {
			s.cache.MarkRevoked(context.Background(), hashHex, remaining)
		}
	}
	s.cache.DelProfile(context.Background(), profileID.String())
}

func (s *AuthService) SetRefreshCookie(c *gin.Context, tokenStr string) {
	c.SetCookie("refresh", tokenStr, int(s.refreshTTL.Seconds()), "/api/auth", "", false, true)
}

func (s *AuthService) ClearRefreshCookie(c *gin.Context) {
	c.SetCookie("refresh", "", -1, "/api/auth", "", false, true)
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

func (s *AuthService) CacheProfile(profile *models.Profile) {
	s.cache.SetProfile(context.Background(), profile.ID.String(), &cache.CachedProfile{
		Role:        int(profile.Role),
		Perm:        profile.Permissions,
		Email:       profile.Email,
		DisplayName: profile.ProfileName,
	}, 15*time.Minute)
}
