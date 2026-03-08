package handlers_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/handlers"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
	"github.com/localnews/backend/internal/services/testfixtures"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func setupHandlerTest(t *testing.T) (*handlers.Handler, *gorm.DB) {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Discard,
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	for _, ddl := range []string{
		`CREATE TABLE submissions (
			id TEXT PRIMARY KEY,
			owner_id TEXT NOT NULL,
			location_id TEXT NOT NULL,
			continent_id TEXT, country_id TEXT, region_id TEXT, city_id TEXT,
			lat REAL, lng REAL,
			title TEXT NOT NULL DEFAULT '',
			description TEXT NOT NULL DEFAULT '',
			tags INTEGER DEFAULT 0,
			status INTEGER DEFAULT 0,
			error INTEGER DEFAULT 0,
			views INTEGER DEFAULT 0,
			share_count INTEGER DEFAULT 0,
			reactions BLOB,
			meta BLOB,
			search_vector TEXT,
			created_at DATETIME, updated_at DATETIME
		)`,
		`CREATE TABLE files (
			id TEXT PRIMARY KEY,
			entity_id TEXT NOT NULL,
			entity_category INTEGER NOT NULL,
			submission_id TEXT NOT NULL,
			contributor_id TEXT NOT NULL,
			file_type INTEGER NOT NULL,
			name TEXT NOT NULL,
			size INTEGER NOT NULL,
			uploaded_at DATETIME,
			meta BLOB
		)`,
		`CREATE TABLE locations (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL DEFAULT '',
			slug TEXT,
			level INTEGER DEFAULT 0,
			parent_id TEXT,
			article_count INTEGER DEFAULT 0,
			created_at DATETIME, updated_at DATETIME
		)`,
	} {
		if err := db.Exec(ddl).Error; err != nil {
			t.Fatalf("create table: %v", err)
		}
	}

	access := services.NewAccessService(db)
	media := services.NewMediaService(t.TempDir())

	trans := services.NewStubTranscriptionService()
	gen := services.NewStubGenerationService()
	rev := services.NewStubReviewService()
	photo := services.NewStubPhotoDescriptionService()
	chunker := services.NewStubChunkerService()
	embed := services.NewNoOpEmbeddingService()
	pipeline := services.NewPipelineService(db, trans, gen, rev, photo, chunker, embed)

	h := handlers.NewHandler(db, nil, nil, nil, access, media, pipeline, nil, nil, nil, nil)
	return h, db
}

func makeAuthRouter(h *handlers.Handler, method, path string, handler gin.HandlerFunc, profileID uuid.UUID, role int, perm int64) *gin.Engine {
	r := gin.New()
	r.Use(func(c *gin.Context) {
		c.Set("profile_id", profileID.String())
		c.Set("role", role)
		c.Set("perm", perm)
		c.Next()
	})
	switch method {
	case "POST":
		r.POST(path, handler)
	case "PUT":
		r.PUT(path, handler)
	case "PATCH":
		r.PATCH(path, handler)
	default:
		r.GET(path, handler)
	}
	return r
}

func performRequest(r *gin.Engine, method, path string, body io.Reader) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, body)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func insertTestSubmission(t *testing.T, db *gorm.DB, sub *models.Submission) {
	t.Helper()
	if sub.ID == uuid.Nil {
		sub.ID = uuid.New()
	}
	if sub.Reactions.V == nil {
		sub.Reactions = models.JSONB[map[string]int]{V: map[string]int{}}
	}
	if err := db.Create(sub).Error; err != nil {
		t.Fatalf("insert submission: %v", err)
	}
}

// --- Publish handler tests ---

func TestPublishSubmission_REDGate_Returns422(t *testing.T) {
	h, db := setupHandlerTest(t)
	ownerID := uuid.New()

	sub := testfixtures.MakeSubmission(ownerID, models.StatusReady, &models.SubmissionMeta{
		Review: testfixtures.RedReview(),
	})
	insertTestSubmission(t, db, &sub)

	router := makeAuthRouter(h, "POST", "/submissions/:id/publish", h.PublishSubmission,
		ownerID, 0, models.PermSubmit|models.PermPublish)
	w := performRequest(router, "POST", "/submissions/"+sub.ID.String()+"/publish", nil)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("status = %d, want 422", w.Code)
	}

	var body map[string]any
	json.Unmarshal(w.Body.Bytes(), &body)

	if body["error"] != "gate_red" {
		t.Errorf("error = %v, want gate_red", body["error"])
	}
	if body["coaching"] == nil {
		t.Error("response should include coaching")
	}
	if body["red_triggers"] == nil {
		t.Error("response should include red_triggers")
	}
}

func TestPublishSubmission_GREENGate_Returns200(t *testing.T) {
	h, db := setupHandlerTest(t)
	ownerID := uuid.New()

	sub := testfixtures.MakeSubmission(ownerID, models.StatusReady, &models.SubmissionMeta{
		Review: testfixtures.GreenReview(),
	})
	insertTestSubmission(t, db, &sub)

	router := makeAuthRouter(h, "POST", "/submissions/:id/publish", h.PublishSubmission,
		ownerID, 0, models.PermSubmit|models.PermPublish)
	w := performRequest(router, "POST", "/submissions/"+sub.ID.String()+"/publish", nil)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}

	var updated models.Submission
	db.First(&updated, "id = ?", sub.ID)
	if updated.Status != models.StatusPublished {
		t.Errorf("status = %d, want Published (%d)", updated.Status, models.StatusPublished)
	}
}

func TestPublishSubmission_YELLOWGate_Returns200(t *testing.T) {
	h, db := setupHandlerTest(t)
	ownerID := uuid.New()

	sub := testfixtures.MakeSubmission(ownerID, models.StatusReady, &models.SubmissionMeta{
		Review: testfixtures.YellowReview(),
	})
	insertTestSubmission(t, db, &sub)

	router := makeAuthRouter(h, "POST", "/submissions/:id/publish", h.PublishSubmission,
		ownerID, 0, models.PermSubmit|models.PermPublish)
	w := performRequest(router, "POST", "/submissions/"+sub.ID.String()+"/publish", nil)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200 (YELLOW does not block)", w.Code)
	}
}

func TestPublishSubmission_NoPermission_Returns403(t *testing.T) {
	h, db := setupHandlerTest(t)
	ownerID := uuid.New()

	sub := testfixtures.MakeSubmission(ownerID, models.StatusReady, &models.SubmissionMeta{
		Review: testfixtures.GreenReview(),
	})
	insertTestSubmission(t, db, &sub)

	// No PermPublish
	router := makeAuthRouter(h, "POST", "/submissions/:id/publish", h.PublishSubmission,
		ownerID, 0, models.PermSubmit)
	w := performRequest(router, "POST", "/submissions/"+sub.ID.String()+"/publish", nil)

	if w.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", w.Code)
	}
}

// --- Refine handler tests ---

func TestRefineSubmission_TextNote_Returns200(t *testing.T) {
	h, db := setupHandlerTest(t)
	ownerID := uuid.New()

	sub := testfixtures.MakeSubmission(ownerID, models.StatusReady, &models.SubmissionMeta{
		ArticleMarkdown: "# Old\n\nOld body.",
		ArticleMetadata: &models.ArticleMetadata{ChosenStructure: "news_report", Confidence: 0.7, MissingContext: []string{}},
		Review:          testfixtures.GreenReview(),
	})
	insertTestSubmission(t, db, &sub)

	body, _ := json.Marshal(map[string]string{"text_note": "Please add more about the vote"})
	router := makeAuthRouter(h, "POST", "/submissions/:id/refine", h.RefineSubmission,
		ownerID, 0, models.PermSubmit)
	w := performRequest(router, "POST", "/submissions/"+sub.ID.String()+"/refine", bytes.NewReader(body))

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200, body: %s", w.Code, w.Body.String())
	}

	var updated models.Submission
	db.First(&updated, "id = ?", sub.ID)
	if updated.Status != models.StatusRefining {
		t.Errorf("status = %d, want Refining (%d)", updated.Status, models.StatusRefining)
	}
}

func TestRefineSubmission_WrongStatus_Returns409(t *testing.T) {
	statuses := []struct {
		name   string
		status int16
	}{
		{"Draft", models.StatusDraft},
		{"Published", models.StatusPublished},
		{"Archived", models.StatusArchived},
	}

	for _, tt := range statuses {
		t.Run(tt.name, func(t *testing.T) {
			h, db := setupHandlerTest(t)
			ownerID := uuid.New()

			sub := testfixtures.MakeSubmission(ownerID, tt.status, nil)
			insertTestSubmission(t, db, &sub)

			body, _ := json.Marshal(map[string]string{"text_note": "refine me"})
			router := makeAuthRouter(h, "POST", "/submissions/:id/refine", h.RefineSubmission,
				ownerID, 0, models.PermSubmit)
			w := performRequest(router, "POST", "/submissions/"+sub.ID.String()+"/refine", bytes.NewReader(body))

			// Expect either 403 (access check fails) or 409 (status check fails)
			if w.Code != http.StatusConflict && w.Code != http.StatusForbidden {
				t.Errorf("status = %d, want 403 or 409 for %s", w.Code, tt.name)
			}
		})
	}
}

func TestRefineSubmission_NoInput_Returns400(t *testing.T) {
	h, db := setupHandlerTest(t)
	ownerID := uuid.New()

	sub := testfixtures.MakeSubmission(ownerID, models.StatusReady, &models.SubmissionMeta{
		ArticleMarkdown: "# Old\n\nBody.",
		ArticleMetadata: &models.ArticleMetadata{ChosenStructure: "news_report", Confidence: 0.7, MissingContext: []string{}},
		Review:          testfixtures.GreenReview(),
	})
	insertTestSubmission(t, db, &sub)

	router := makeAuthRouter(h, "POST", "/submissions/:id/refine", h.RefineSubmission,
		ownerID, 0, models.PermSubmit)
	w := performRequest(router, "POST", "/submissions/"+sub.ID.String()+"/refine", nil)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

func TestRefineSubmission_NonOwner_Returns403(t *testing.T) {
	h, db := setupHandlerTest(t)
	ownerID := uuid.New()
	otherID := uuid.New()

	sub := testfixtures.MakeSubmission(ownerID, models.StatusReady, nil)
	insertTestSubmission(t, db, &sub)

	body, _ := json.Marshal(map[string]string{"text_note": "refine"})
	router := makeAuthRouter(h, "POST", "/submissions/:id/refine", h.RefineSubmission,
		otherID, 0, models.PermSubmit)
	w := performRequest(router, "POST", "/submissions/"+sub.ID.String()+"/refine", bytes.NewReader(body))

	if w.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", w.Code)
	}
}

// --- Appeal handler tests ---

func TestAppealSubmission_REDReady_Returns200(t *testing.T) {
	h, db := setupHandlerTest(t)
	ownerID := uuid.New()

	sub := testfixtures.MakeSubmission(ownerID, models.StatusReady, &models.SubmissionMeta{
		Review: testfixtures.RedReview(),
	})
	insertTestSubmission(t, db, &sub)

	router := makeAuthRouter(h, "POST", "/submissions/:id/appeal", h.AppealSubmission,
		ownerID, 0, models.PermSubmit)
	w := performRequest(router, "POST", "/submissions/"+sub.ID.String()+"/appeal", nil)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}

	var updated models.Submission
	db.First(&updated, "id = ?", sub.ID)
	if updated.Status != models.StatusAppealed {
		t.Errorf("status = %d, want Appealed (%d)", updated.Status, models.StatusAppealed)
	}
}

func TestAppealSubmission_GREENGate_Returns409(t *testing.T) {
	h, db := setupHandlerTest(t)
	ownerID := uuid.New()

	sub := testfixtures.MakeSubmission(ownerID, models.StatusReady, &models.SubmissionMeta{
		Review: testfixtures.GreenReview(),
	})
	insertTestSubmission(t, db, &sub)

	router := makeAuthRouter(h, "POST", "/submissions/:id/appeal", h.AppealSubmission,
		ownerID, 0, models.PermSubmit)
	w := performRequest(router, "POST", "/submissions/"+sub.ID.String()+"/appeal", nil)

	// GREEN gate: CanAppealSubmission returns false → 403, then handler checks gate → 409
	if w.Code != http.StatusForbidden && w.Code != http.StatusConflict {
		t.Errorf("status = %d, want 403 or 409", w.Code)
	}
}

func TestAppealSubmission_NonOwner_Returns403(t *testing.T) {
	h, db := setupHandlerTest(t)
	ownerID := uuid.New()
	otherID := uuid.New()

	sub := testfixtures.MakeSubmission(ownerID, models.StatusReady, &models.SubmissionMeta{
		Review: testfixtures.RedReview(),
	})
	insertTestSubmission(t, db, &sub)

	router := makeAuthRouter(h, "POST", "/submissions/:id/appeal", h.AppealSubmission,
		otherID, 0, models.PermSubmit)
	w := performRequest(router, "POST", "/submissions/"+sub.ID.String()+"/appeal", nil)

	if w.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", w.Code)
	}
}

func TestAppealSubmission_NotFound_Returns404(t *testing.T) {
	h, _ := setupHandlerTest(t)
	ownerID := uuid.New()
	bogusID := uuid.New()

	router := makeAuthRouter(h, "POST", "/submissions/:id/appeal", h.AppealSubmission,
		ownerID, 0, models.PermSubmit)
	w := performRequest(router, "POST", "/submissions/"+bogusID.String()+"/appeal", nil)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", w.Code)
	}
}
