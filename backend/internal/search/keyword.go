package search

import (
	"context"

	"github.com/localnews/backend/internal/models"
)

func (s *Service) Keyword(ctx context.Context, p Params) (*Result, error) {
	result := &Result{Mode: string(ModeKeyword)}

	if p.Type == "" || p.Type == "submissions" {
		var submissions []models.Submission
		stmt := s.db.WithContext(ctx).
			Where("status = ? AND title % ?", models.StatusPublished, p.Query).
			Order("similarity(title, ?) DESC").
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
			Where("profile_name % ?", p.Query).
			Order("similarity(profile_name, ?) DESC").
			Limit(p.Limit).Offset(p.Offset).
			Find(&profiles).Error; err != nil {
			return nil, err
		}
		result.Profiles = profiles
	}

	return result, nil
}
