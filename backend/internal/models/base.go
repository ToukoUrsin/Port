package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

type Timestamps struct {
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// JSONB[T] -- typed wrapper for PostgreSQL JSONB columns.
// Implements sql.Scanner, driver.Valuer, and JSON marshal/unmarshal.
type JSONB[T any] struct{ V T }

func (j JSONB[T]) Value() (driver.Value, error) {
	return json.Marshal(j.V)
}

func (j *JSONB[T]) Scan(src any) error {
	if src == nil {
		return nil
	}
	b, ok := src.([]byte)
	if !ok {
		return fmt.Errorf("expected []byte, got %T", src)
	}
	return json.Unmarshal(b, &j.V)
}

func (j JSONB[T]) MarshalJSON() ([]byte, error) {
	return json.Marshal(j.V)
}

func (j *JSONB[T]) UnmarshalJSON(data []byte) error {
	return json.Unmarshal(data, &j.V)
}

// NewJSONB creates a JSONB wrapper with the given value.
func NewJSONB[T any](v T) JSONB[T] {
	return JSONB[T]{V: v}
}

// Well-known IDs for agent system.
func KirkkonummiLocationID() uuid.UUID {
	return uuid.MustParse("a0000000-0000-0000-0000-000000000004")
}

func AgentAdminID() uuid.UUID {
	return uuid.MustParse("b0000000-0000-0000-0000-000000000099")
}
