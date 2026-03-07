package handlers

import (
	"github.com/localnews/backend/internal/cache"
	"github.com/localnews/backend/internal/config"
	"github.com/localnews/backend/internal/search"
	"github.com/localnews/backend/internal/services"
	"gorm.io/gorm"
)

type Handler struct {
	db       *gorm.DB
	cache    *cache.Cache
	cfg      *config.Config
	auth     *services.AuthService
	access   *services.AccessService
	media    *services.MediaService
	pipeline *services.PipelineService
	search   *search.Service
	batch    *services.BatchService
	stats    *services.StatsService
}

func NewHandler(
	db *gorm.DB,
	cache *cache.Cache,
	cfg *config.Config,
	auth *services.AuthService,
	access *services.AccessService,
	media *services.MediaService,
	pipeline *services.PipelineService,
	search *search.Service,
	batch *services.BatchService,
	stats *services.StatsService,
) *Handler {
	return &Handler{
		db:       db,
		cache:    cache,
		cfg:      cfg,
		auth:     auth,
		access:   access,
		media:    media,
		pipeline: pipeline,
		search:   search,
		batch:    batch,
		stats:    stats,
	}
}
