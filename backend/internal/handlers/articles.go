package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
	"gorm.io/gorm"
)

func (h *Handler) ListArticles(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	cursor := c.Query("cursor")
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
	hasMore := false
	nextCursor := ""

	switch sort {
	case "ranked":
		articles, hasMore, nextCursor = h.listRanked(c, query, limit, offset, cursor)

	case "popular":
		articles, hasMore, nextCursor = h.listWithKeyset(c, query, limit, offset, cursor, "popular")

	default: // "recent"
		articles, hasMore, nextCursor = h.listWithKeyset(c, query, limit, offset, cursor, "recent")
	}

	h.fillLocationNames(articles)
	h.fillOwnerNames(articles)

	resp := gin.H{"articles": articles, "total": total, "has_more": hasMore}
	if nextCursor != "" {
		resp["next_cursor"] = nextCursor
	}
	c.JSON(http.StatusOK, resp)
}

// listWithKeyset handles cursor-based pagination for recent and popular sorts.
func (h *Handler) listWithKeyset(c *gin.Context, query *gorm.DB, limit, offset int, cursor, sortMode string) ([]models.Submission, bool, string) {
	var articles []models.Submission

	if cursor != "" {
		// Parse cursor: "value_uuid"
		parts := strings.SplitN(cursor, "_", 2)
		if len(parts) == 2 {
			cursorID, err := uuid.Parse(parts[1])
			if err == nil {
				switch sortMode {
				case "popular":
					cursorViews, _ := strconv.Atoi(parts[0])
					query = query.Where("(views, id) < (?, ?)", cursorViews, cursorID)
				default: // recent
					cursorTime, err := time.Parse(time.RFC3339Nano, parts[0])
					if err == nil {
						query = query.Where("(updated_at, id) < (?, ?)", cursorTime, cursorID)
					}
				}
			}
		}
	} else if offset > 0 {
		// Fallback to offset when no cursor
		query = query.Offset(offset)
	}

	switch sortMode {
	case "popular":
		query = query.Order("views DESC, id DESC")
	default:
		query = query.Order("updated_at DESC, id DESC")
	}

	// Fetch limit+1 to detect has_more
	query.Limit(limit + 1).Find(&articles)

	hasMore := len(articles) > limit
	if hasMore {
		articles = articles[:limit]
	}

	nextCursor := ""
	if hasMore && len(articles) > 0 {
		last := articles[len(articles)-1]
		switch sortMode {
		case "popular":
			nextCursor = fmt.Sprintf("%d_%s", last.Views, last.ID.String())
		default:
			nextCursor = fmt.Sprintf("%s_%s", last.UpdatedAt.Format(time.RFC3339Nano), last.ID.String())
		}
	}

	return articles, hasMore, nextCursor
}

// listRanked handles ranked feed with Redis-cached feed sessions.
func (h *Handler) listRanked(c *gin.Context, query *gorm.DB, limit, offset int, cursor string) ([]models.Submission, bool, string) {
	ctx := c.Request.Context()

	// If cursor is provided, try to use cached feed session
	if cursor != "" {
		parts := strings.SplitN(cursor, "_", 2)
		if len(parts) == 2 {
			feedID := parts[0]
			cursorOffset, _ := strconv.Atoi(parts[1])
			cacheKey := "feed:" + feedID

			var cachedIDs []string
			if h.cache.Get(ctx, cacheKey, &cachedIDs) {
				// Slice the cached IDs
				start := cursorOffset
				if start >= len(cachedIDs) {
					return nil, false, ""
				}
				end := start + limit
				hasMore := end < len(cachedIDs)
				if end > len(cachedIDs) {
					end = len(cachedIDs)
				}
				pageIDs := cachedIDs[start:end]

				// Batch-load articles by IDs
				uuids := make([]uuid.UUID, 0, len(pageIDs))
				for _, idStr := range pageIDs {
					if id, err := uuid.Parse(idStr); err == nil {
						uuids = append(uuids, id)
					}
				}
				var articles []models.Submission
				if len(uuids) > 0 {
					h.db.Where("id IN ?", uuids).Find(&articles)
				}

				// Restore cached order
				idxMap := make(map[uuid.UUID]int, len(pageIDs))
				for i, idStr := range pageIDs {
					if id, err := uuid.Parse(idStr); err == nil {
						idxMap[id] = i
					}
				}
				for i := 0; i < len(articles); i++ {
					for j := i + 1; j < len(articles); j++ {
						if idxMap[articles[i].ID] > idxMap[articles[j].ID] {
							articles[i], articles[j] = articles[j], articles[i]
						}
					}
				}

				nextCursor := ""
				if hasMore {
					nextCursor = fmt.Sprintf("%s_%d", feedID, end)
				}
				return articles, hasMore, nextCursor
			}
			// Cache miss — fall through to recompute
		}
	}

	// Compute ranked list (expanded pool: 350 regular + 150 boosted)
	var regular []models.Submission
	query.Session(&gorm.Session{}).Where("boost_score = 0").
		Order("created_at DESC").Limit(350).Find(&regular)
	var boosted []models.Submission
	query.Session(&gorm.Session{}).Where("boost_score > 0").
		Order("boost_score DESC, created_at DESC").Limit(150).Find(&boosted)
	allArticles := append(regular, boosted...)

	if len(allArticles) > 0 {
		// Batch-load reply counts
		articleIDs := make([]uuid.UUID, len(allArticles))
		for i, a := range allArticles {
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
		for _, a := range allArticles {
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

		// Load personalization if user is logged in
		var perso *FeedPersonalization
		if pidRaw, exists := c.Get("profile_id"); exists {
			if pidStr, ok := pidRaw.(string); ok {
				if pid, err := uuid.Parse(pidStr); err == nil {
					perso = h.loadPersonalization(c, pid)
				}
			}
		}

		h.rankArticles(allArticles, karmaMap, replyCountMap, perso)
	}

	// Cache the full ranked ID list in Redis with 15min TTL
	feedID := uuid.New().String()
	cachedIDs := make([]string, len(allArticles))
	for i, a := range allArticles {
		cachedIDs[i] = a.ID.String()
	}
	cacheKey := "feed:" + feedID
	data, _ := json.Marshal(cachedIDs)
	_ = h.cache.SetWithTTL(ctx, cacheKey, json.RawMessage(data), 15*time.Minute)

	// Apply pagination (use offset for legacy, default 0)
	start := offset
	if start >= len(allArticles) {
		return nil, false, ""
	}
	end := start + limit
	hasMore := end < len(allArticles)
	if end > len(allArticles) {
		end = len(allArticles)
	}
	articles := allArticles[start:end]

	nextCursor := ""
	if hasMore {
		nextCursor = fmt.Sprintf("%s_%d", feedID, end)
	}

	return articles, hasMore, nextCursor
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
