package handlers

import (
	"github.com/localnews/backend/internal/cache"
	"github.com/localnews/backend/internal/services"
	"gorm.io/gorm"
)

type Handler struct {
	db       *gorm.DB
	cache    *cache.Cache
	auth     *services.AuthService
	access   *services.AccessService
	media    *services.MediaService
	pipeline *services.PipelineService
}

func NewHandler(
	db *gorm.DB,
	cache *cache.Cache,
	auth *services.AuthService,
	access *services.AccessService,
	media *services.MediaService,
	pipeline *services.PipelineService,
) *Handler {
	return &Handler{
		db:       db,
		cache:    cache,
		auth:     auth,
		access:   access,
		media:    media,
		pipeline: pipeline,
	}
}
