package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
	"gorm.io/gorm"
)

func (h *Handler) ListArticles(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	locationID := c.Query("location_id")
	locationIDs := c.Query("location_ids")

	if limit > 100 {
		limit = 100
	}

	query := h.db.Model(&models.Submission{}).Where("status = ?", models.StatusPublished)

	if locationIDs != "" {
		ids := strings.Split(locationIDs, ",")
		query = query.Where("location_id IN (?)", h.resolveLocationHierarchy(ids))
	} else if locationID != "" {
		query = query.Where("location_id IN (?)", h.resolveLocationHierarchy([]string{locationID}))
	}

	// Filter by country: match locations whose path contains this country segment
	country := c.Query("country")
	if country != "" {
		query = query.Where(
			"location_id IN (SELECT id FROM locations WHERE path LIKE ? OR path LIKE ? OR slug = ?)",
			"%/"+country+"/%", "%/"+country, country,
		)
	}

	category := c.Query("category")
	if category != "" {
		query = query.Where("meta->>'category' = ?", category)
	}

	ownerID := c.Query("owner_id")
	if ownerID != "" {
		query = query.Where("owner_id = ?", ownerID)
	}

	sort := c.DefaultQuery("sort", "recent")

	var total int64
	query.Count(&total)

	var articles []models.Submission
	switch sort {
	case "ranked":
		// Over-fetch 200 candidates for ranking
		fetchLimit := 200
		query.Order("created_at DESC").Limit(fetchLimit).Find(&articles)

		if len(articles) > 0 {
			// Batch-load reply counts
			articleIDs := make([]uuid.UUID, len(articles))
			for i, a := range articles {
				articleIDs[i] = a.ID
			}
			type replyCountRow struct {
				SubmissionID uuid.UUID
				Count        int
			}
			var replyCounts []replyCountRow
			h.db.Model(&models.Reply{}).
				Select("submission_id, COUNT(*) as count").
				Where("submission_id IN ? AND status = ?", articleIDs, models.ReplyVisible).
				Group("submission_id").
				Scan(&replyCounts)
			replyCountMap := make(map[uuid.UUID]int, len(replyCounts))
			for _, rc := range replyCounts {
				replyCountMap[rc.SubmissionID] = rc.Count
			}

			// Batch-load author karma
			ownerSet := make(map[uuid.UUID]bool)
			for _, a := range articles {
				ownerSet[a.OwnerID] = true
			}
			ownerIDs := make([]uuid.UUID, 0, len(ownerSet))
			for id := range ownerSet {
				ownerIDs = append(ownerIDs, id)
			}
			type karmaRow struct {
				ID    uuid.UUID
				Karma int
			}
			var karmaRows []karmaRow
			h.db.Model(&models.Profile{}).
				Select("id, karma").
				Where("id IN ?", ownerIDs).
				Scan(&karmaRows)
			karmaMap := make(map[uuid.UUID]int, len(karmaRows))
			for _, kr := range karmaRows {
				karmaMap[kr.ID] = kr.Karma
			}

			// Identify system accounts (e.g. LocalNews) for freshness boost + diversity cap
			type profileNameRow struct {
				ID          uuid.UUID
				ProfileName string
			}
			var pnRows []profileNameRow
			h.db.Model(&models.Profile{}).
				Select("id, profile_name").
				Where("id IN ?", ownerIDs).
				Scan(&pnRows)
			systemOwnerIDs := make(map[uuid.UUID]bool)
			for _, pn := range pnRows {
				if systemAccountNames[pn.ProfileName] {
					systemOwnerIDs[pn.ID] = true
				}
			}

			// Load personalization if user is logged in
			var perso *FeedPersonalization
			if pidRaw, exists := c.Get("profile_id"); exists {
				if pidStr, ok := pidRaw.(string); ok {
					if pid, err := uuid.Parse(pidStr); err == nil {
						perso = h.loadPersonalization(c, pid)
					}
				}
			}

			h.rankArticles(articles, karmaMap, replyCountMap, perso, systemOwnerIDs)
		}

		// Apply pagination after ranking
		if offset >= len(articles) {
			articles = nil
		} else {
			end := offset + limit
			if end > len(articles) {
				end = len(articles)
			}
			articles = articles[offset:end]
		}

	case "popular":
		query = query.Order("views DESC, updated_at DESC")
		query.Limit(limit).Offset(offset).Find(&articles)
	default:
		query = query.Order("updated_at DESC")
		query.Limit(limit).Offset(offset).Find(&articles)
	}

	h.fillLocationNames(articles)
	h.fillOwnerNames(articles)
	c.JSON(http.StatusOK, gin.H{"articles": articles, "total": total})
}

func (h *Handler) GetArticle(c *gin.Context) {
	idStr := c.Param("id")
	key := "articles:" + idStr

	// Cache hit
	var article models.Submission
	if h.cache.Get(c.Request.Context(), key, &article) {
		// Increment views in background (approximate count)
		go h.db.Model(&models.Submission{}).Where("id = ?", article.ID).
			UpdateColumn("views", gorm.Expr("views + 1"))
		c.JSON(http.StatusOK, article)
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.db.First(&article, "id = ? AND status = ?", id, models.StatusPublished).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	// Increment views in background
	go h.db.Model(&models.Submission{}).Where("id = ?", id).
		UpdateColumn("views", gorm.Expr("views + 1"))

	articles := []models.Submission{article}
	h.fillLocationNames(articles)
	h.fillOwnerNames(articles)
	h.cache.Set(c.Request.Context(), key, articles[0])
	c.JSON(http.StatusOK, articles[0])
}

func (h *Handler) SimilarArticles(c *gin.Context) {
	idStr := c.Param("id")
	key := "similar:" + idStr

	// Cache hit
	var cached []models.Submission
	if h.cache.Get(c.Request.Context(), key, &cached) {
		c.JSON(http.StatusOK, gin.H{"articles": cached})
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	// Verify article exists and is published
	var article models.Submission
	if err := h.db.First(&article, "id = ? AND status = ?", id, models.StatusPublished).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}

	// Determine the country path from the article's location so similar
	// articles are restricted to the same country/language.
	var countryPath string
	var loc models.Location
	if h.db.First(&loc, "id = ?", article.LocationID).Error == nil {
		parts := strings.SplitN(loc.Path, "/", 3) // e.g. "europe/finland/uusimaa/helsinki"
		if len(parts) >= 2 {
			countryPath = parts[0] + "/" + parts[1] // "europe/finland"
		}
	}

	similar, err := h.search.SimilarArticles(c.Request.Context(), id, 5, countryPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
		return
	}
	if similar == nil {
		similar = []models.Submission{}
	}

	h.fillLocationNames(similar)
	h.fillOwnerNames(similar)
	h.cache.Set(c.Request.Context(), key, similar)
	c.JSON(http.StatusOK, gin.H{"articles": similar})
}

func (h *Handler) UpdateArticle(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var sub models.Submission
	if err := h.db.First(&sub, "id = ? AND status = ?", id, models.StatusPublished).Error; err != nil {
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

	// Invalidate cache
	h.cache.Delete(c.Request.Context(), "articles:"+id.String())
	h.cache.DeletePattern(c.Request.Context(), "articles:list:"+sub.LocationID.String()+":*")

	h.db.First(&sub, "id = ?", id)
	c.JSON(http.StatusOK, sub)
}

// fillLocationNames populates the LocationName field on each submission
// by looking up location names from the locations table.
func (h *Handler) fillLocationNames(articles []models.Submission) {
	if len(articles) == 0 {
		return
	}
	ids := make([]uuid.UUID, len(articles))
	for i, a := range articles {
		ids[i] = a.LocationID
	}
	var locs []models.Location
	h.db.Select("id, name").Where("id IN ?", ids).Find(&locs)
	nameMap := make(map[uuid.UUID]string, len(locs))
	for _, l := range locs {
		nameMap[l.ID] = l.Name
	}
	for i := range articles {
		articles[i].LocationName = nameMap[articles[i].LocationID]
	}
}

// fillOwnerNames populates the OwnerName field on each submission
// by looking up profile names from the profiles table.
func (h *Handler) fillOwnerNames(articles []models.Submission) {
	if len(articles) == 0 {
		return
	}
	seen := make(map[uuid.UUID]bool)
	var ids []uuid.UUID
	for _, a := range articles {
		if !seen[a.OwnerID] {
			seen[a.OwnerID] = true
			ids = append(ids, a.OwnerID)
		}
	}
	var profiles []models.Profile
	h.db.Select("id, profile_name").Where("id IN ?", ids).Find(&profiles)
	nameMap := make(map[uuid.UUID]string, len(profiles))
	for _, p := range profiles {
		nameMap[p.ID] = p.ProfileName
	}
	for i := range articles {
		articles[i].OwnerName = nameMap[articles[i].OwnerID]
	}
}

// recalculateKarma computes and stores a profile's karma based on their published articles.
// Formula: GREEN gate = +10, YELLOW = +5, RED/no review = +2, plus +1 per 100 views, +1 per like.
func (h *Handler) recalculateKarma(profileID uuid.UUID) {
	var articles []models.Submission
	h.db.Where("owner_id = ? AND status = ?", profileID, models.StatusPublished).
		Select("meta, views, reactions").Find(&articles)

	karma := 0
	for _, a := range articles {
		gate := ""
		if a.Meta.V.Review != nil {
			gate = a.Meta.V.Review.Gate
		}
		switch gate {
		case "GREEN":
			karma += 10
		case "YELLOW":
			karma += 5
		default:
			karma += 2
		}
		karma += a.Views / 100
		if likes, ok := a.Reactions.V["likes"]; ok {
			karma += likes
		}
	}

	h.db.Model(&models.Profile{}).Where("id = ?", profileID).Update("karma", karma)
}

// resolveLocationHierarchy returns a GORM subquery that selects all location
// IDs matching the given IDs plus all their descendants via path prefix.
// Produces a single SQL subquery: SELECT id FROM locations WHERE id IN (...)
// OR path LIKE 'prefix1/%' OR path LIKE 'prefix2/%' ...
// Uses text_pattern_ops btree index for each LIKE condition.
func (h *Handler) resolveLocationHierarchy(ids []string) *gorm.DB {
	// Fetch paths for the requested locations (single indexed query)
	var locs []models.Location
	h.db.Select("id", "path").Where("id IN ?", ids).Find(&locs)

	// Build: SELECT id FROM locations WHERE id IN (...) OR path LIKE ...
	sub := h.db.Model(&models.Location{}).Select("id").Where("id IN ?", ids)
	for _, loc := range locs {
		sub = sub.Or("path LIKE ?", loc.Path+"/%")
	}
	return sub
}
