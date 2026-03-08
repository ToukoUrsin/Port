package services

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/localnews/backend/internal/cache"
	"github.com/localnews/backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type NotificationEvent struct {
	Notification models.Notification `json:"notification"`
	ActorName    string              `json:"actor_name"`
	ArticleTitle string              `json:"article_title"`
}

type NotificationService struct {
	cache *cache.Cache
	mu    sync.RWMutex
	// map[profileID][]chan — supports multiple tabs/devices per user
	subscribers map[string][]chan NotificationEvent
}

func NewNotificationService(c *cache.Cache) *NotificationService {
	return &NotificationService{
		cache:       c,
		subscribers: make(map[string][]chan NotificationEvent),
	}
}

// Subscribe registers a new SSE listener for the given profile.
func (s *NotificationService) Subscribe(profileID string) chan NotificationEvent {
	ch := make(chan NotificationEvent, 20)
	s.mu.Lock()
	s.subscribers[profileID] = append(s.subscribers[profileID], ch)
	s.mu.Unlock()
	return ch
}

// Unsubscribe removes a specific channel from the profile's subscriber list.
func (s *NotificationService) Unsubscribe(profileID string, ch chan NotificationEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	chans := s.subscribers[profileID]
	for i, c := range chans {
		if c == ch {
			s.subscribers[profileID] = append(chans[:i], chans[i+1:]...)
			close(ch)
			break
		}
	}
	if len(s.subscribers[profileID]) == 0 {
		delete(s.subscribers, profileID)
	}
}

// Notify creates a notification in the DB (upsert) and fans out to active SSE subscribers.
func (s *NotificationService) Notify(db *gorm.DB, recipientID, actorID uuid.UUID, notifType int16, targetID uuid.UUID, targetType int16, articleID uuid.UUID) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("NotificationService.Notify panic: %v", r)
		}
	}()

	// Don't notify yourself
	if recipientID == actorID {
		return
	}

	notif := models.Notification{
		ProfileID:  recipientID,
		ActorID:    actorID,
		Type:       notifType,
		TargetID:   targetID,
		TargetType: targetType,
		ArticleID:  articleID,
		CreatedAt:  time.Now(),
	}
	result := db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "profile_id"}, {Name: "actor_id"}, {Name: "type"},
			{Name: "target_id"}, {Name: "target_type"},
		},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"read":       false,
			"created_at": time.Now(),
		}),
	}).Create(&notif)
	if result.Error != nil {
		log.Printf("NotificationService.Notify error: %v", result.Error)
		return
	}

	// Invalidate unread count cache
	s.cache.Delete(context.Background(), "notif:unread:"+recipientID.String())

	// Look up actor name and article title for SSE payload
	var actorName string
	var articleTitle string
	var profile models.Profile
	if db.Select("profile_name").First(&profile, "id = ?", actorID).Error == nil {
		actorName = profile.ProfileName
	}
	if articleID != uuid.Nil {
		var sub models.Submission
		if db.Select("title").First(&sub, "id = ?", articleID).Error == nil {
			articleTitle = sub.Title
		}
	}

	event := NotificationEvent{
		Notification: notif,
		ActorName:    actorName,
		ArticleTitle: articleTitle,
	}

	// Fan out to active subscribers
	pid := recipientID.String()
	s.mu.RLock()
	for _, ch := range s.subscribers[pid] {
		select {
		case ch <- event:
		default:
			// channel full, skip
		}
	}
	s.mu.RUnlock()
}

// GetUnreadCount returns the unread notification count, using Redis cache with 60s TTL.
func (s *NotificationService) GetUnreadCount(db *gorm.DB, profileID uuid.UUID) int64 {
	ctx := context.Background()
	cacheKey := "notif:unread:" + profileID.String()

	var cached int64
	if s.cache.Get(ctx, cacheKey, &cached) {
		return cached
	}

	var count int64
	db.Model(&models.Notification{}).
		Where("profile_id = ? AND read = false", profileID).
		Count(&count)

	s.cache.SetWithTTL(ctx, cacheKey, count, 60*time.Second)
	return count
}
