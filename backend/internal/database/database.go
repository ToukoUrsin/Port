package database

import (
	"fmt"
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
	)
}

func RunMigrations(db *gorm.DB, migrationsDir string) error {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
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
	}
	return nil
}
