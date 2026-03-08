package services

import (
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"gorm.io/gorm"
)

// AdjustArticleCount increments (delta=+1) or decrements (delta=-1)
// article_count on the given location and all its ancestors.
func AdjustArticleCount(db *gorm.DB, locationID uuid.UUID, delta int) {
	currentID := &locationID
	for currentID != nil {
		var loc struct {
			ParentID *uuid.UUID
		}
		if err := db.Model(&models.Location{}).
			Select("parent_id").
			Where("id = ?", *currentID).
			First(&loc).Error; err != nil {
			break
		}
		db.Model(&models.Location{}).
			Where("id = ? AND article_count + ? >= 0", *currentID, delta).
			Update("article_count", gorm.Expr("article_count + ?", delta))
		currentID = loc.ParentID
	}
}
