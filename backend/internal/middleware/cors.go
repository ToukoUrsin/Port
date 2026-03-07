package middleware

import (
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func SetupCORS(r *gin.Engine, allowedOrigins string) {
	origins := strings.Split(allowedOrigins, ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     origins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     allowedHeaders,
		ExposeHeaders:    exposedHeaders,
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
}

var allowedHeaders = []string{
	"Origin",
	"Content-Type",
	"Authorization",
	"Accept",
	"X-Request-ID",
}

var exposedHeaders = []string{
	"X-Request-ID",
}
