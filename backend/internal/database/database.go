package database

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/localnews/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect(databaseURL string) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("connect to database: %w", err)
	}
	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.Location{},
		&models.Profile{},
		&models.RefreshToken{},
		&models.OAuthAccount{},
		&models.Submission{},
		&models.SubmissionContributor{},
		&models.File{},
		&models.Tag{},
		&models.EntityTag{},
		&models.Follow{},
		&models.Reply{},
		&models.Advertiser{},
		&models.Embedding{},
		&models.Reaction{},
		&models.Notification{},
		&models.Bookmark{},
		&models.StatsHourly{},
		&models.StatsDailyPath{},
	)
}

func RunMigrations(db *gorm.DB, migrationsDir string) error {
	// Ensure tracking table
	db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		filename VARCHAR(255) PRIMARY KEY,
		applied_at TIMESTAMP NOT NULL DEFAULT NOW()
	)`)

	// Load applied set
	var applied []struct{ Filename string }
	db.Raw("SELECT filename FROM schema_migrations").Scan(&applied)
	appliedSet := make(map[string]bool, len(applied))
	for _, a := range applied {
		appliedSet[a.Filename] = true
	}

	// Run new migrations only
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		if appliedSet[entry.Name()] {
			continue
		}
		path := filepath.Join(migrationsDir, entry.Name())
		sql, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", entry.Name(), err)
		}
		if err := db.Exec(string(sql)).Error; err != nil {
			return fmt.Errorf("run migration %s: %w", entry.Name(), err)
		}
		db.Exec("INSERT INTO schema_migrations (filename) VALUES (?)", entry.Name())
		log.Printf("applied migration: %s", entry.Name())
	}
	return nil
}
