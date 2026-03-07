package models

import (
	"time"

	"github.com/google/uuid"
)

type FileMeta struct {
	MimeType     string `json:"mime_type,omitempty"`
	Width        int    `json:"width,omitempty"`
	Height       int    `json:"height,omitempty"`
	DurationSecs int    `json:"duration_secs,omitempty"`
	Thumbnail    string `json:"thumbnail,omitempty"`
}

type File struct {
	ID             uuid.UUID       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	EntityID       uuid.UUID       `gorm:"type:uuid;not null" json:"entity_id"`
	EntityCategory int16           `gorm:"not null" json:"entity_category"`
	SubmissionID   uuid.UUID       `gorm:"type:uuid;not null;index" json:"submission_id"`
	ContributorID  uuid.UUID       `gorm:"type:uuid;not null" json:"contributor_id"`
	FileType       int16           `gorm:"not null;index" json:"file_type"`
	Name           string          `gorm:"type:varchar(300);not null" json:"name"`
	Size           int64           `gorm:"not null" json:"size"`
	UploadedAt     time.Time       `gorm:"autoCreateTime" json:"uploaded_at"`
	Meta           JSONB[FileMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
}
