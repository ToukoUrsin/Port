package models

import (
	"time"

	"github.com/google/uuid"
)

type LocationMeta struct {
	AreaKm2    float64  `json:"area_km2,omitempty"`
	Timezone   string   `json:"timezone,omitempty"`
	About      string   `json:"about,omitempty"`
	Highlights []string `json:"highlights,omitempty"`
	Population int      `json:"population,omitempty"`
	PostalCode string   `json:"postal_code,omitempty"`
	CoverImage string   `json:"cover_image,omitempty"`
	Icon       string   `json:"icon,omitempty"`
}

type Location struct {
	ID               uuid.UUID           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name             string              `gorm:"type:varchar(200);not null" json:"name"`
	Slug             string              `gorm:"type:varchar(100);uniqueIndex;not null" json:"slug"`
	Level            int16               `gorm:"not null" json:"level"`
	ParentID         *uuid.UUID          `gorm:"type:uuid" json:"parent_id,omitempty"`
	Path             string              `gorm:"type:text;not null" json:"path"`
	Description      *string             `gorm:"type:text" json:"description,omitempty"`
	IsActive         bool                `gorm:"default:true" json:"is_active"`
	Lat              *float64            `json:"lat,omitempty"`
	Lng              *float64            `json:"lng,omitempty"`
	ArticleCount     int                 `gorm:"default:0" json:"article_count"`
	SubmissionCount  int                 `gorm:"default:0" json:"submission_count"`
	ContributorCount int                 `gorm:"default:0" json:"contributor_count"`
	FollowerCount    int                 `gorm:"default:0" json:"follower_count"`
	LastActivityAt   *time.Time          `json:"last_activity_at,omitempty"`
	TrendingScore    float32             `gorm:"default:0" json:"trending_score"`
	Meta             JSONB[LocationMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
	Timestamps
}
