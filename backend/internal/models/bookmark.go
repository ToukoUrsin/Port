package models

import (
	"time"

	"github.com/google/uuid"
)

type Bookmark struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProfileID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_bookmarks_unique;index" json:"profile_id"`
	ArticleID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_bookmarks_unique;index" json:"article_id"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}
