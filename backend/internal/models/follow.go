package models

import (
	"time"

	"github.com/google/uuid"
)

type Follow struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProfileID  uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_follows_unique;index" json:"profile_id"`
	TargetID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_follows_unique" json:"target_id"`
	TargetType int16     `gorm:"not null;uniqueIndex:idx_follows_unique" json:"target_type"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"created_at"`
}
