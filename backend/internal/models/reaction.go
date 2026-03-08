package models

import (
	"time"

	"github.com/google/uuid"
)

type Reaction struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	ProfileID  uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_reactions_unique" json:"profile_id"`
	TargetID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_reactions_unique;index:idx_reactions_target" json:"target_id"`
	TargetType int16     `gorm:"not null;uniqueIndex:idx_reactions_unique;index:idx_reactions_target" json:"target_type"`
	Kind       int16     `gorm:"not null" json:"kind"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"created_at"`
}
