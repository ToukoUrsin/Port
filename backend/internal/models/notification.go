package models

import (
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProfileID  uuid.UUID `gorm:"type:uuid;not null;index:idx_notif_profile_read;uniqueIndex:idx_notif_dedup" json:"profile_id"`
	ActorID    uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_notif_dedup" json:"actor_id"`
	Type       int16     `gorm:"not null;uniqueIndex:idx_notif_dedup" json:"type"`
	TargetID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_notif_dedup" json:"target_id"`
	TargetType int16     `gorm:"not null;uniqueIndex:idx_notif_dedup" json:"target_type"`
	ArticleID  uuid.UUID `gorm:"type:uuid;not null" json:"article_id"`
	Read       bool      `gorm:"default:false;index:idx_notif_profile_read" json:"read"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"created_at"`
}
