package handlers

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/localnews/backend/internal/models"
)

// --- Weight constants for base score ---
const (
	wEngagement = 0.30
	wQuality    = 0.30
	wKarma      = 0.15
	wFreshness  = 0.25
)

// --- Personalization boost constants ---
const (
	boostFollowedAuthor   = 0.50
	boostFollowedLocation = 0.30
	boostTagOverlap       = 0.20
	boostHomeLocation     = 0.15
	boostUnseen           = 0.10
)

// FeedPersonalization holds pre-loaded data for personalizing a user's feed.
type FeedPersonalization struct {
	FollowedProfileIDs  map[uuid.UUID]bool
	FollowedLocationIDs map[uuid.UUID]bool
	UserTags            int64
	HomeLocationID      *uuid.UUID
	InteractedArticleIDs map[uuid.UUID]bool
}

type scoredArticle struct {
	article *models.Submission
	score   float64
}

// computeBaseScore calculates the base ranking score for an article.
func computeBaseScore(article *models.Submission, authorKarma int, replyCount int) float64 {
	engagement := computeEngagement(article, replyCount)
	quality := computeQuality(article)
	karma := computeKarmaScore(authorKarma)
	freshness := computeFreshness(article.CreatedAt)

	return wEngagement*engagement + wQuality*quality + wKarma*karma + wFreshness*freshness
}

func computeEngagement(article *models.Submission, replyCount int) float64 {
	likes := 0
	if l, ok := article.Reactions.V["like"]; ok {
		likes = l
	}
	if l, ok := article.Reactions.V["likes"]; ok {
		likes = l
	}

	shares := article.ShareCount
	views := article.Views

	score := (math.Log1p(float64(views))/7 +
		math.Log1p(float64(likes))/3 +
		math.Log1p(float64(replyCount))/3 +
		math.Log1p(float64(shares))/2.5) / 4

	return math.Min(1.0, score)
}

func computeQuality(article *models.Submission) float64 {
	review := article.Meta.V.Review
	if review == nil {
		return 0.3 // default for unreviewed
	}

	var gateScore float64
	switch review.Gate {
	case "GREEN":
		gateScore = 0.6
	case "YELLOW":
		gateScore = 0.3
	default:
		gateScore = 0.1
	}

	// Weighted dimension scores
	scores := review.Scores
	dimScore := scores.Evidence*0.25 +
		scores.Perspectives*0.20 +
		scores.Representation*0.18 +
		scores.EthicalFraming*0.15 +
		scores.CulturalContext*0.12 +
		scores.Manipulation*0.10

	// Scores are 0-1 range; if they're 0-10 scale, normalize
	if dimScore > 1.0 {
		dimScore = dimScore / 10.0
	}

	return gateScore + 0.4*dimScore
}

func computeKarmaScore(karma int) float64 {
	return math.Min(1.0, math.Log1p(float64(karma))/5)
}

func computeFreshness(createdAt time.Time) float64 {
	ageHours := time.Since(createdAt).Hours()
	return 1.0 / math.Pow(1.0+ageHours/12.0, 1.5)
}

// computePersonalBoost returns a boost value 0.0 - 1.0 for personalization.
func computePersonalBoost(article *models.Submission, perso *FeedPersonalization) float64 {
	if perso == nil {
		return 0.0
	}

	boost := 0.0

	if perso.FollowedProfileIDs[article.OwnerID] {
		boost += boostFollowedAuthor
	}

	if perso.FollowedLocationIDs[article.LocationID] {
		boost += boostFollowedLocation
	}

	if perso.UserTags != 0 && article.Tags != 0 && (perso.UserTags&article.Tags) != 0 {
		boost += boostTagOverlap
	}

	if perso.HomeLocationID != nil && article.LocationID == *perso.HomeLocationID {
		boost += boostHomeLocation
	}

	if !perso.InteractedArticleIDs[article.ID] {
		boost += boostUnseen
	}

	return math.Min(1.0, boost)
}

// loadPersonalization loads personalization data for a user, using Redis cache with 10min TTL.
func (h *Handler) loadPersonalization(c *gin.Context, profileID uuid.UUID) *FeedPersonalization {
	ctx := c.Request.Context()
	cacheKey := "feed:perso:" + profileID.String()

	// Try cache first
	var cached FeedPersonalization
	if h.cache.Get(ctx, cacheKey, &cached) {
		return &cached
	}

	perso := &FeedPersonalization{
		FollowedProfileIDs:   make(map[uuid.UUID]bool),
		FollowedLocationIDs:  make(map[uuid.UUID]bool),
		InteractedArticleIDs: make(map[uuid.UUID]bool),
	}

	// Load follows
	var follows []models.Follow
	h.db.Where("profile_id = ?", profileID).Find(&follows)
	for _, f := range follows {
		switch f.TargetType {
		case models.FollowProfile:
			perso.FollowedProfileIDs[f.TargetID] = true
		case models.FollowLocation:
			perso.FollowedLocationIDs[f.TargetID] = true
		}
	}

	// Load profile for tags and home location
	var profile models.Profile
	if h.db.Select("tags, location_id").First(&profile, "id = ?", profileID).Error == nil {
		perso.UserTags = profile.Tags
		perso.HomeLocationID = profile.LocationID
	}

	// Load interacted article IDs (reactions + bookmarks)
	var reactionTargetIDs []uuid.UUID
	h.db.Model(&models.Reaction{}).
		Where("profile_id = ? AND target_type = ?", profileID, models.ReactionTargetSubmission).
		Pluck("target_id", &reactionTargetIDs)
	for _, id := range reactionTargetIDs {
		perso.InteractedArticleIDs[id] = true
	}

	var bookmarkArticleIDs []uuid.UUID
	h.db.Model(&models.Bookmark{}).
		Where("profile_id = ?", profileID).
		Pluck("article_id", &bookmarkArticleIDs)
	for _, id := range bookmarkArticleIDs {
		perso.InteractedArticleIDs[id] = true
	}

	// Cache for 10 minutes
	_ = h.cache.SetWithTTL(ctx, cacheKey, perso, 10*time.Minute)

	return perso
}

// rankArticles scores articles and sorts them in-place by descending score.
// If profileID is non-nil, personalization boosts are applied.
func (h *Handler) rankArticles(articles []models.Submission, authorKarmaMap map[uuid.UUID]int, replyCountMap map[uuid.UUID]int, perso *FeedPersonalization) {
	scored := make([]scoredArticle, len(articles))
	for i := range articles {
		karma := authorKarmaMap[articles[i].OwnerID]
		replies := replyCountMap[articles[i].ID]
		base := computeBaseScore(&articles[i], karma, replies)

		personalBoost := computePersonalBoost(&articles[i], perso)
		finalScore := base * (1.0 + personalBoost)

		scored[i] = scoredArticle{article: &articles[i], score: finalScore}
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	// Reorder articles slice in-place
	reordered := make([]models.Submission, len(scored))
	for i, s := range scored {
		reordered[i] = *s.article
	}
	copy(articles, reordered)
}

// FeedPersonalization JSON marshaling for Redis cache
func (p *FeedPersonalization) MarshalJSON() ([]byte, error) {
	type Alias struct {
		FollowedProfileIDs   []string   `json:"followed_profile_ids"`
		FollowedLocationIDs  []string   `json:"followed_location_ids"`
		UserTags             int64      `json:"user_tags"`
		HomeLocationID       *uuid.UUID `json:"home_location_id"`
		InteractedArticleIDs []string   `json:"interacted_article_ids"`
	}
	a := Alias{
		UserTags:       p.UserTags,
		HomeLocationID: p.HomeLocationID,
	}
	for id := range p.FollowedProfileIDs {
		a.FollowedProfileIDs = append(a.FollowedProfileIDs, id.String())
	}
	for id := range p.FollowedLocationIDs {
		a.FollowedLocationIDs = append(a.FollowedLocationIDs, id.String())
	}
	for id := range p.InteractedArticleIDs {
		a.InteractedArticleIDs = append(a.InteractedArticleIDs, id.String())
	}
	return json.Marshal(a)
}

func (p *FeedPersonalization) UnmarshalJSON(data []byte) error {
	type Alias struct {
		FollowedProfileIDs   []string   `json:"followed_profile_ids"`
		FollowedLocationIDs  []string   `json:"followed_location_ids"`
		UserTags             int64      `json:"user_tags"`
		HomeLocationID       *uuid.UUID `json:"home_location_id"`
		InteractedArticleIDs []string   `json:"interacted_article_ids"`
	}
	var a Alias
	if err := json.Unmarshal(data, &a); err != nil {
		return err
	}
	p.UserTags = a.UserTags
	p.HomeLocationID = a.HomeLocationID
	p.FollowedProfileIDs = make(map[uuid.UUID]bool, len(a.FollowedProfileIDs))
	for _, s := range a.FollowedProfileIDs {
		id, err := uuid.Parse(s)
		if err != nil {
			return fmt.Errorf("parse followed profile id: %w", err)
		}
		p.FollowedProfileIDs[id] = true
	}
	p.FollowedLocationIDs = make(map[uuid.UUID]bool, len(a.FollowedLocationIDs))
	for _, s := range a.FollowedLocationIDs {
		id, err := uuid.Parse(s)
		if err != nil {
			return fmt.Errorf("parse followed location id: %w", err)
		}
		p.FollowedLocationIDs[id] = true
	}
	p.InteractedArticleIDs = make(map[uuid.UUID]bool, len(a.InteractedArticleIDs))
	for _, s := range a.InteractedArticleIDs {
		id, err := uuid.Parse(s)
		if err != nil {
			return fmt.Errorf("parse interacted article id: %w", err)
		}
		p.InteractedArticleIDs[id] = true
	}
	return nil
}
