package models

import (
	"github.com/google/uuid"
	"github.com/pgvector/pgvector-go"
)

type Embedding struct {
	ID             uuid.UUID       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	EntityID       uuid.UUID       `gorm:"type:uuid;not null;index:idx_embeddings_entity" json:"entity_id"`
	EntityCategory int16           `gorm:"not null;index:idx_embeddings_entity" json:"entity_category"`
	ChunkIndex     int16           `gorm:"not null;default:0" json:"chunk_index"`
	ChunkText      string          `gorm:"type:text;not null" json:"chunk_text"`
	Vector         pgvector.Vector `gorm:"column:embedding;type:vector(768);not null" json:"embedding"`
}
