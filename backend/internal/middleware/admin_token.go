package middleware

import (
	"crypto/subtle"
	"strings"

	"github.com/gin-gonic/gin"
)

func AdminToken(token string) gin.HandlerFunc {
	tokenBytes := []byte(token)
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(401, gin.H{"error": "missing token"})
			return
		}
		provided := []byte(strings.TrimPrefix(header, "Bearer "))
		if subtle.ConstantTimeCompare(provided, tokenBytes) != 1 {
			c.AbortWithStatusJSON(401, gin.H{"error": "invalid token"})
			return
		}
		c.Next()
	}
}
