package models

import (
	"time"
)

// StatsHourly stores one row per calendar hour with aggregated request metrics.
type StatsHourly struct {
	ID           string                `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Hour         time.Time             `gorm:"uniqueIndex;not null" json:"hour"`
	RequestCount int                   `json:"request_count"`
	PeakRPM      int                   `json:"peak_rpm"`
	UniqueUsers  int                   `json:"unique_users"`
	TopPaths     JSONB[[]PathCountDTO] `gorm:"type:jsonb;default:'[]'" json:"top_paths"`
	CreatedAt    time.Time             `gorm:"autoCreateTime" json:"created_at"`
}

// PathCountDTO is the JSON shape stored in StatsHourly.TopPaths.
type PathCountDTO struct {
	Path  string `json:"path"`
	Count int64  `json:"count"`
}

// StatsDailyPath stores per-path daily request counts for trend analysis.
type StatsDailyPath struct {
	ID    string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Date  time.Time `gorm:"type:date;not null;uniqueIndex:idx_daily_path_date_path" json:"date"`
	Path  string    `gorm:"type:varchar(500);not null;uniqueIndex:idx_daily_path_date_path" json:"path"`
	Count int64     `json:"count"`
}
