package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/middleware"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
)

// requirePublicProfile checks that the actor's profile is public.
// Returns true (and writes a 403 response) if the profile is not public, meaning the caller should return.
func (h *Handler) requirePublicProfile(c *gin.Context, actor services.Actor) bool {
	var profile models.Profile
	if err := h.db.Select("public").First(&profile, "id = ?", actor.ProfileID).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "public_profile_required"})
		return true
	}
	if !profile.Public {
		c.JSON(http.StatusForbidden, gin.H{"error": "public_profile_required"})
		return true
	}
	return false
}

func (h *Handler) CreateSubmission(c *gin.Context) {
	actor := services.ActorFromContext(c)
	if !actor.HasPerm(models.PermSubmit) {
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}
	if h.requirePublicProfile(c, actor) {
		return
	}

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
	anonymous := c.PostForm("anonymous") == "true"

	sub := models.Submission{
		OwnerID:     actor.ProfileID,
		LocationID:  locationID,
		Title:       title,
		Description: notes,
		Status:      models.StatusDraft,
		Meta:        models.JSONB[models.SubmissionMeta]{V: models.SubmissionMeta{Anonymous: anonymous}},
	}

	if err := h.db.Create(&sub).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create submission"})
		return
	}

	maxSize := int64(h.cfg.MaxUploadSizeMB) * 1024 * 1024

	// Save audio file
	audioFile, err := c.FormFile("audio")
	if err == nil {
		path, size, err := h.media.SaveUploadedFile(audioFile, sub.ID, maxSize)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "audio upload failed: " + err.Error()})
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
		if len(photos) > h.cfg.MaxPhotos {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("too many photos: max %d allowed", h.cfg.MaxPhotos)})
			return
		}
		for _, photo := range photos {
			path, size, err := h.media.SaveUploadedFile(photo, sub.ID, maxSize)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "photo upload failed: " + err.Error()})
				return
			}

			// Compress image
			var fileMeta models.FileMeta
			newPath, meta, compErr := h.media.CompressImage(path)
			if compErr != nil {
				log.Printf("compression failed for %s: %v", path, compErr)
				newPath = path
			} else {
				fileMeta = meta
			}
			if info, _ := os.Stat(newPath); info != nil {
				size = info.Size()
			}

			file := models.File{
				EntityID:       sub.ID,
				EntityCategory: models.EntitySubmission,
				SubmissionID:   sub.ID,
				ContributorID:  actor.ProfileID,
				FileType:       2, // photo
				Name:           newPath,
				Size:           size,
				Meta:           models.JSONB[models.FileMeta]{V: fileMeta},
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
	if h.requirePublicProfile(c, actor) {
		return
	}
	if !h.access.CanStreamSubmission(actor, &sub) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	middleware.EnablePassthrough(c)
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
			// Include intermediate data if available
			payload := map[string]any{
				"step":    event.Step,
				"message": event.Message,
			}
			if event.Data != nil {
				payload["data"] = event.Data
			}
			data, _ = json.Marshal(payload)
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

	subs := []models.Submission{sub}
	h.fillOwnerNames(subs)
	c.JSON(http.StatusOK, subs[0])
}

func (h *Handler) ListSubmissions(c *gin.Context) {
	actor := services.ActorFromContext(c)

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if limit > 100 {
		limit = 100
	}

	query := h.db.Model(&models.Submission{})

	if actor.IsEditor() {
		// Editors see all submissions
	} else {
		query = query.Where(
			"owner_id = ? OR id IN (SELECT submission_id FROM submission_contributors WHERE profile_id = ?)",
			actor.ProfileID, actor.ProfileID,
		)
	}

	var total int64
	query.Count(&total)

	var submissions []models.Submission
	query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&submissions)
	h.fillOwnerNames(submissions)
	c.JSON(http.StatusOK, gin.H{"submissions": submissions, "total": total})
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
	if !h.access.CanViewSubmission(actor, &sub) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.access.CanEditSubmission(actor, &sub) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	var req struct {
		Title           *string `json:"title"`
		Description     *string `json:"description"`
		ArticleMarkdown *string `json:"article_markdown"`
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

	// Update article markdown in meta (only when submission is in ready state)
	if req.ArticleMarkdown != nil {
		if sub.Status != models.StatusReady {
			c.JSON(http.StatusConflict, gin.H{"error": "can only edit article in ready state"})
			return
		}
		meta := sub.Meta.V
		meta.ArticleMarkdown = *req.ArticleMarkdown
		updates["meta"] = models.JSONB[models.SubmissionMeta]{V: meta}
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
	if !h.access.CanViewSubmission(actor, &sub) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.access.CanDeleteSubmission(actor, &sub) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	if sub.Status == models.StatusPublished {
		services.AdjustArticleCount(h.db, sub.LocationID, -1)
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
	if h.requirePublicProfile(c, actor) {
		return
	}
	if !h.access.CanViewSubmission(actor, &sub) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if !h.access.CanPublishSubmission(actor, &sub) {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	// Gate is informational only — never blocks publishing (anti-censorship design).
	// The review data is still available on the article for reader transparency.

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

	// Update location counters (propagate up hierarchy)
	services.AdjustArticleCount(h.db, sub.LocationID, +1)

	// Recalculate karma for the article owner
	h.recalculateKarma(sub.OwnerID)

	// Notify followers of the author and location
	go h.notifyFollowers(sub.OwnerID, sub.ID, sub.LocationID)

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
	if h.requirePublicProfile(c, actor) {
		return
	}
	if !h.access.CanViewSubmission(actor, &sub) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
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
		maxSize := int64(h.cfg.MaxUploadSizeMB) * 1024 * 1024
		path, _, saveErr := h.media.SaveUploadedFile(voiceFile, sub.ID, maxSize)
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
	if h.requirePublicProfile(c, actor) {
		return
	}
	if !h.access.CanViewSubmission(actor, &sub) {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
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

func (h *Handler) FlagSubmission(c *gin.Context) {
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

	if sub.Status != models.StatusPublished {
		c.JSON(http.StatusConflict, gin.H{"error": "can only flag published articles"})
		return
	}

	var body struct {
		Reason string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&body); err != nil || body.Reason == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "reason is required"})
		return
	}

	meta := sub.Meta.V
	meta.Flagged = true
	meta.FlagReason = body.Reason
	h.db.Model(&sub).Update("meta", models.JSONB[models.SubmissionMeta]{V: meta})

	// Invalidate article cache
	cacheKey := fmt.Sprintf("article:%s", id)
	h.cache.Delete(c.Request.Context(), cacheKey)

	c.JSON(http.StatusOK, gin.H{"status": "flagged"})
}

// notifyFollowers notifies all followers of the author and location about a new article.
func (h *Handler) notifyFollowers(ownerID, submissionID, locationID uuid.UUID) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("notifyFollowers panic: %v", r)
		}
	}()

	seen := make(map[uuid.UUID]bool)

	// Profile followers
	var profileFollowerIDs []uuid.UUID
	h.db.Model(&models.Follow{}).
		Where("target_id = ? AND target_type = ?", ownerID, models.FollowProfile).
		Pluck("profile_id", &profileFollowerIDs)
	for _, id := range profileFollowerIDs {
		seen[id] = true
	}

	// Location followers
	if locationID != uuid.Nil {
		var locationFollowerIDs []uuid.UUID
		h.db.Model(&models.Follow{}).
			Where("target_id = ? AND target_type = ?", locationID, models.FollowLocation).
			Pluck("profile_id", &locationFollowerIDs)
		for _, id := range locationFollowerIDs {
			seen[id] = true
		}
	}

	// Notify each unique follower
	for followerID := range seen {
		h.notifSvc.Notify(h.db, followerID, ownerID, models.NotifNewArticle, submissionID, models.ReactionTargetSubmission, submissionID)
	}
}
