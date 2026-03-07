package models

import (
	"time"

	"github.com/google/uuid"
)

type ReplyMeta struct {
	Reactions  map[string]int `json:"reactions,omitempty"`
	EditedAt   *time.Time     `json:"edited_at,omitempty"`
	EditedBody string         `json:"edited_body,omitempty"`
}

type Reply struct {
	ID           uuid.UUID        `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	SubmissionID uuid.UUID        `gorm:"type:uuid;not null;index" json:"submission_id"`
	ProfileID    uuid.UUID        `gorm:"type:uuid;not null;index" json:"profile_id"`
	ParentID     *uuid.UUID       `gorm:"type:uuid;index" json:"parent_id,omitempty"`
	Body         string           `gorm:"type:text;not null" json:"body"`
	Status       int16            `gorm:"default:0" json:"status"`
	Meta         JSONB[ReplyMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
	ProfileName  string           `gorm:"-" json:"profile_name,omitempty"`
	CreatedAt    time.Time        `gorm:"autoCreateTime" json:"created_at"`
}
