package models

import (
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProfileID  uuid.UUID `gorm:"type:uuid;not null;index:idx_notif_profile" json:"profile_id"`
	ActorID    uuid.UUID `gorm:"type:uuid;not null" json:"actor_id"`
	Type       int16     `gorm:"not null" json:"type"`
	TargetID   uuid.UUID `gorm:"type:uuid;not null" json:"target_id"`
	TargetType int16     `gorm:"not null" json:"target_type"`
	ArticleID  uuid.UUID `gorm:"type:uuid;not null" json:"article_id"`
	Read       bool      `gorm:"default:false;index:idx_notif_unread" json:"read"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"created_at"`
}
