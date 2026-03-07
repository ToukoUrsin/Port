package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	jwt.RegisteredClaims
	Role int   `json:"role"`
	Perm int64 `json:"perm"`
}

func Auth(jwtSecret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(401, gin.H{"error": "missing token"})
			return
		}
		tokenStr := header[7:]

		claims, err := validateAccessToken(tokenStr, jwtSecret)
		if err != nil {
			c.AbortWithStatusJSON(401, gin.H{"error": "invalid token"})
			return
		}

		c.Set("profile_id", claims.Subject)
		c.Set("role", claims.Role)
		c.Set("perm", claims.Perm)
		c.Next()
	}
}

func OptionalAuth(jwtSecret []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.Next()
			return
		}
		tokenStr := header[7:]

		claims, err := validateAccessToken(tokenStr, jwtSecret)
		if err != nil {
			c.Next()
			return
		}

		c.Set("profile_id", claims.Subject)
		c.Set("role", claims.Role)
		c.Set("perm", claims.Perm)
		c.Next()
	}
}

func RequireRole(minRole int) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get("role")
		if role.(int) < minRole {
			c.AbortWithStatusJSON(403, gin.H{"error": "insufficient permissions"})
			return
		}
		c.Next()
	}
}

func RequirePerm(flag int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		perm, _ := c.Get("perm")
		if perm.(int64)&flag == 0 {
			c.AbortWithStatusJSON(403, gin.H{"error": "insufficient permissions"})
			return
		}
		c.Next()
	}
}

func validateAccessToken(tokenStr string, secret []byte) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (any, error) {
		return secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}
	return claims, nil
}
