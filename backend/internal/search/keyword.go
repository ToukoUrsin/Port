package search

import (
	"context"
	"fmt"

	"github.com/localnews/backend/internal/models"
	"gorm.io/gorm/clause"
)

func (s *Service) Keyword(ctx context.Context, p Params) (*Result, error) {
	result := &Result{Mode: string(ModeKeyword)}
	likePattern := fmt.Sprintf("%%%s%%", p.Query)

	if p.Type == "" || p.Type == "submissions" {
		var submissions []models.Submission
		stmt := s.db.WithContext(ctx).
			Where("status = ? AND (title ILIKE ? OR title % ?)", models.StatusPublished, likePattern, p.Query).
			Clauses(clause.OrderBy{Expression: clause.Expr{SQL: "similarity(title, ?) DESC", Vars: []interface{}{p.Query}}}).
			Limit(p.Limit).Offset(p.Offset)
		if p.LocationID != "" {
			stmt = stmt.Where("location_id = ?", p.LocationID)
		}
		if err := stmt.Find(&submissions).Error; err != nil {
			return nil, err
		}
		result.Submissions = submissions
	}

	if p.Type == "" || p.Type == "profiles" {
		var profiles []models.Profile
		if err := s.db.WithContext(ctx).
			Where("public = ? AND (profile_name ILIKE ? OR profile_name % ?)", true, likePattern, p.Query).
			Clauses(clause.OrderBy{Expression: clause.Expr{SQL: "similarity(profile_name, ?) DESC", Vars: []interface{}{p.Query}}}).
			Limit(p.Limit).Offset(p.Offset).
			Find(&profiles).Error; err != nil {
			return nil, err
		}
		result.Profiles = profiles
	}

	return result, nil
}
