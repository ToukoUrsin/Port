package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
)

func (h *Handler) CreateSubmission(c *gin.Context) {
	actor := services.ActorFromContext(c)

	locationIDStr := c.PostForm("location_id")
	locationID, err := uuid.Parse(locationIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid location_id"})
		return
	}

	// Verify location exists
	var loc models.Location
	if err := h.db.First(&loc, "id = ?", locationID).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "location not found"})
		return
	}

	notes := c.PostForm("notes")
	title := c.PostForm("title")

	sub := models.Submission{
		OwnerID:     actor.ProfileID,
		LocationID:  locationID,
		Title:       title,
		Description: notes,
		Status:      models.StatusDraft,
	}

	if err := h.db.Create(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create submission"})
		return
	}

	// Save audio file
	audioFile, err := c.FormFile("audio")
	if err == nil {
		path, size, err := h.media.SaveUploadedFile(audioFile, sub.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save audio"})
			return
		}
		file := models.File{
			EntityID:       sub.ID,
			EntityCategory: models.EntitySubmission,
			SubmissionID:   sub.ID,
			ContributorID:  actor.ProfileID,
			FileType:       1, // audio
			Name:           path,
			Size:           size,
		}
		h.db.Create(&file)
	}

	// Save photo files
	form, _ := c.MultipartForm()
	if form != nil {
		photos := form.File["photos[]"]
		for _, photo := range photos {
			path, size, err := h.media.SaveUploadedFile(photo, sub.ID)
			if err != nil {
				continue
			}
			file := models.File{
				EntityID:       sub.ID,
				EntityCategory: models.EntitySubmission,
				SubmissionID:   sub.ID,
				ContributorID:  actor.ProfileID,
				FileType:       2, // photo
				Name:           path,
				Size:           size,
			}
			h.db.Create(&file)
		}
	}

	c.JSON(http.StatusCreated, gin.H{
		"submission_id": sub.ID,
		"status":        "pending",
	})
}

func (h *Handler) StreamPipeline(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanStreamSubmission(actor, &sub) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no")

	events := make(chan services.PipelineEvent, 10)
	go h.pipeline.Run(c.Request.Context(), id, events)

	c.Stream(func(w io.Writer) bool {
		event, ok := <-events
		if !ok {
			return false
		}
		var data []byte
		switch event.Event {
		case "complete":
			data, _ = json.Marshal(event.Data)
		default:
			data, _ = json.Marshal(map[string]string{
				"step":    event.Step,
				"message": event.Message,
			})
		}
		fmt.Fprintf(w, "event: %s\ndata: %s\n\n", event.Event, string(data))
		c.Writer.Flush()
		return true
	})
}

func (h *Handler) GetSubmission(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanViewSubmission(actor, &sub) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	c.JSON(http.StatusOK, sub)
}

func (h *Handler) ListSubmissions(c *gin.Context) {
	actor := services.ActorFromContext(c)

	query := h.db.Model(&models.Submission{})

	if actor.IsEditor() {
		// Editors see all submissions
	} else {
		query = query.Where(
			"owner_id = ? OR id IN (SELECT submission_id FROM submission_contributors WHERE profile_id = ?)",
			actor.ProfileID, actor.ProfileID,
		)
	}

	var submissions []models.Submission
	query.Order("created_at DESC").Find(&submissions)
	c.JSON(http.StatusOK, submissions)
}

func (h *Handler) UpdateSubmission(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanEditSubmission(actor, &sub) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	updates := map[string]any{}
	if req.Title != nil {
		updates["title"] = *req.Title
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}

	if len(updates) > 0 {
		h.db.Model(&sub).Updates(updates)
	}

	h.db.First(&sub, "id = ?", id)
	c.JSON(http.StatusOK, sub)
}

func (h *Handler) DeleteSubmission(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanDeleteSubmission(actor, &sub) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	h.db.Delete(&sub)
	c.Status(http.StatusNoContent)
}

func (h *Handler) PublishSubmission(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanPublishSubmission(actor, &sub) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Gate check: RED gate blocks publishing
	if sub.Meta.V.Review != nil && sub.Meta.V.Review.Gate == "RED" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":        "gate_red",
			"gate":         sub.Meta.V.Review.Gate,
			"coaching":     sub.Meta.V.Review.Coaching,
			"red_triggers": sub.Meta.V.Review.RedTriggers,
		})
		return
	}

	now := time.Now()
	meta := sub.Meta.V
	meta.PublishedAt = &now
	meta.PublishedBy = &actor.ProfileID

	h.db.Model(&sub).Updates(map[string]any{
		"status": models.StatusPublished,
		"meta":   models.JSONB[models.SubmissionMeta]{V: meta},
	})

	// Invalidate caches
	if h.cache != nil {
		h.cache.Delete(c.Request.Context(), "articles:"+id.String())
		h.cache.DeletePattern(c.Request.Context(), "articles:list:"+sub.LocationID.String()+":*")
	}

	// Update location counters
	h.db.Model(&models.Location{}).Where("id = ?", sub.LocationID).
		Update("article_count", h.db.Raw("article_count + 1"))

	h.db.First(&sub, "id = ?", id)
	c.JSON(http.StatusOK, sub)
}

func (h *Handler) RefineSubmission(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanRefineSubmission(actor, &sub) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if sub.Status != models.StatusReady {
		c.JSON(http.StatusConflict, gin.H{"error": "submission not in a refinable state"})
		return
	}

	// Parse input: voice_clip (multipart) or text_note (JSON/form field)
	var direction string

	voiceFile, voiceErr := c.FormFile("voice_clip")
	textNote := c.PostForm("text_note")

	// Try JSON body if no form fields found
	if voiceErr != nil && textNote == "" {
		var req struct {
			TextNote string `json:"text_note"`
		}
		if bindErr := c.ShouldBindJSON(&req); bindErr == nil {
			textNote = req.TextNote
		}
	}

	if voiceErr != nil && textNote == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "provide voice_clip or text_note"})
		return
	}

	// Transcribe voice clip if present
	if voiceErr == nil {
		path, _, saveErr := h.media.SaveUploadedFile(voiceFile, sub.ID)
		if saveErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save voice clip"})
			return
		}
		transcribed, transcribeErr := h.pipeline.Transcription().Transcribe(c.Request.Context(), path)
		if transcribeErr != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to transcribe voice clip"})
			return
		}
		direction = transcribed
		if textNote != "" {
			direction = direction + "\n\n" + textNote
		}
	} else {
		direction = textNote
	}

	// Save current article as a version
	meta := sub.Meta.V
	if meta.ArticleMarkdown != "" && meta.ArticleMetadata != nil && meta.Review != nil {
		version := models.ArticleVersion{
			ArticleMarkdown:  meta.ArticleMarkdown,
			Metadata:         *meta.ArticleMetadata,
			Review:           *meta.Review,
			ContributorInput: direction,
			Timestamp:        time.Now(),
		}
		meta.Versions = append(meta.Versions, version)
	}

	h.db.Model(&sub).Updates(map[string]any{
		"status": models.StatusRefining,
		"meta":   models.JSONB[models.SubmissionMeta]{V: meta},
	})

	c.JSON(http.StatusOK, gin.H{"status": "ready_to_stream"})
}

func (h *Handler) AppealSubmission(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	actor := services.ActorFromContext(c)
	if !h.access.CanAppealSubmission(actor, &sub) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if sub.Status != models.StatusReady {
		c.JSON(http.StatusConflict, gin.H{"error": "submission not in an appealable state"})
		return
	}

	if sub.Meta.V.Review == nil || sub.Meta.V.Review.Gate != "RED" {
		c.JSON(http.StatusConflict, gin.H{"error": "can only appeal RED-gated submissions"})
		return
	}

	h.db.Model(&sub).Update("status", models.StatusAppealed)
	c.JSON(http.StatusOK, gin.H{"status": "under_review"})
}
