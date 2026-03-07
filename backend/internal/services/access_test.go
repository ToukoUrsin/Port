package services_test

import (
	"testing"

	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
	"github.com/localnews/backend/internal/services/testfixtures"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func setupAccessTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Discard,
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&models.Submission{}, &models.SubmissionContributor{}); err != nil {
		t.Fatalf("automigrate: %v", err)
	}
	return db
}

func TestCanRefineSubmission(t *testing.T) {
	db := setupAccessTestDB(t)
	access := services.NewAccessService(db)

	ownerID := uuid.New()
	otherID := uuid.New()
	editorID := uuid.New()

	tests := []struct {
		name   string
		actor  services.Actor
		sub    models.Submission
		expect bool
	}{
		{
			"owner + Ready",
			testfixtures.MakeActor(ownerID, 0, models.PermSubmit),
			testfixtures.MakeSubmission(ownerID, models.StatusReady, nil),
			true,
		},
		{
			"non-owner",
			testfixtures.MakeActor(otherID, 0, models.PermSubmit),
			testfixtures.MakeSubmission(ownerID, models.StatusReady, nil),
			false,
		},
		{
			"owner + Draft",
			testfixtures.MakeActor(ownerID, 0, models.PermSubmit),
			testfixtures.MakeSubmission(ownerID, models.StatusDraft, nil),
			false,
		},
		{
			"owner + Published",
			testfixtures.MakeActor(ownerID, 0, models.PermSubmit),
			testfixtures.MakeSubmission(ownerID, models.StatusPublished, nil),
			false,
		},
		{
			"owner + Refining",
			testfixtures.MakeActor(ownerID, 0, models.PermSubmit),
			testfixtures.MakeSubmission(ownerID, models.StatusRefining, nil),
			false,
		},
		{
			"editor not owner",
			testfixtures.MakeActor(editorID, 1, models.PermSubmit|models.PermPublish),
			testfixtures.MakeSubmission(ownerID, models.StatusReady, nil),
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := access.CanRefineSubmission(tt.actor, &tt.sub)
			if got != tt.expect {
				t.Errorf("CanRefineSubmission() = %v, want %v", got, tt.expect)
			}
		})
	}
}

func TestCanAppealSubmission(t *testing.T) {
	db := setupAccessTestDB(t)
	access := services.NewAccessService(db)

	ownerID := uuid.New()
	otherID := uuid.New()

	redMeta := &models.SubmissionMeta{Review: testfixtures.RedReview()}
	greenMeta := &models.SubmissionMeta{Review: testfixtures.GreenReview()}
	yellowMeta := &models.SubmissionMeta{Review: testfixtures.YellowReview()}

	tests := []struct {
		name   string
		actor  services.Actor
		sub    models.Submission
		expect bool
	}{
		{
			"owner + Ready + RED",
			testfixtures.MakeActor(ownerID, 0, models.PermSubmit),
			testfixtures.MakeSubmission(ownerID, models.StatusReady, redMeta),
			true,
		},
		{
			"non-owner",
			testfixtures.MakeActor(otherID, 0, models.PermSubmit),
			testfixtures.MakeSubmission(ownerID, models.StatusReady, redMeta),
			false,
		},
		{
			"GREEN gate",
			testfixtures.MakeActor(ownerID, 0, models.PermSubmit),
			testfixtures.MakeSubmission(ownerID, models.StatusReady, greenMeta),
			false,
		},
		{
			"YELLOW gate",
			testfixtures.MakeActor(ownerID, 0, models.PermSubmit),
			testfixtures.MakeSubmission(ownerID, models.StatusReady, yellowMeta),
			false,
		},
		{
			"wrong status",
			testfixtures.MakeActor(ownerID, 0, models.PermSubmit),
			testfixtures.MakeSubmission(ownerID, models.StatusDraft, redMeta),
			false,
		},
		{
			"nil review",
			testfixtures.MakeActor(ownerID, 0, models.PermSubmit),
			testfixtures.MakeSubmission(ownerID, models.StatusReady, nil),
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := access.CanAppealSubmission(tt.actor, &tt.sub)
			if got != tt.expect {
				t.Errorf("CanAppealSubmission() = %v, want %v", got, tt.expect)
			}
		})
	}
}

func TestCanPublishSubmission(t *testing.T) {
	db := setupAccessTestDB(t)
	access := services.NewAccessService(db)

	ownerID := uuid.New()
	editorID := uuid.New()
	noPermID := uuid.New()

	tests := []struct {
		name   string
		actor  services.Actor
		sub    models.Submission
		expect bool
	}{
		{
			"owner + PermPublish + Ready",
			testfixtures.MakeActor(ownerID, 0, models.PermSubmit|models.PermPublish),
			testfixtures.MakeSubmission(ownerID, models.StatusReady, nil),
			true,
		},
		{
			"no PermPublish",
			testfixtures.MakeActor(noPermID, 0, models.PermSubmit),
			testfixtures.MakeSubmission(noPermID, models.StatusReady, nil),
			false,
		},
		{
			"editor + perm",
			testfixtures.MakeActor(editorID, 1, models.PermSubmit|models.PermPublish),
			testfixtures.MakeSubmission(ownerID, models.StatusReady, nil),
			true,
		},
		{
			"wrong status",
			testfixtures.MakeActor(ownerID, 0, models.PermSubmit|models.PermPublish),
			testfixtures.MakeSubmission(ownerID, models.StatusDraft, nil),
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := access.CanPublishSubmission(tt.actor, &tt.sub)
			if got != tt.expect {
				t.Errorf("CanPublishSubmission() = %v, want %v", got, tt.expect)
			}
		})
	}
}
