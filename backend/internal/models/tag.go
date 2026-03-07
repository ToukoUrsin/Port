package models

import (
	"time"

	"github.com/google/uuid"
)

type Tag struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	Name      string    `gorm:"type:varchar(100);not null" json:"name"`
	Slug      string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"slug"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

type EntityTag struct {
	EntityID       uuid.UUID `gorm:"type:uuid;primaryKey" json:"entity_id"`
	EntityCategory int16     `gorm:"not null;index:idx_entity_tags_entity" json:"entity_category"`
	TagID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"tag_id"`
}
