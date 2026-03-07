package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/search"
)

const (
	chunkSize     = 15
	maxChunks     = 8
	sessionTTL    = 5 * time.Minute
	searchLimit   = maxChunks * chunkSize // 120
)

type searchSession struct {
	Mode         string                  `json:"mode"`
	TotalResults int                     `json:"total_results"`
	TotalChunks  int                     `json:"total_chunks"`
	SubChunks    [][]models.Submission   `json:"sub_chunks"`
	ProfChunks   [][]models.Profile      `json:"prof_chunks"`
}

type searchResponse struct {
	SessionID    string              `json:"session_id"`
	Mode         string              `json:"mode"`
	Chunk        int                 `json:"chunk"`
	TotalChunks  int                 `json:"total_chunks"`
	TotalResults int                 `json:"total_results"`
	Submissions  []models.Submission `json:"submissions"`
	Profiles     []models.Profile    `json:"profiles"`
}

func (h *Handler) Search(c *gin.Context) {
	q := c.Query("q")
	if q == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
		return
	}

	mode := search.Mode(c.DefaultQuery("mode", "keyword"))

	params := search.Params{
		Query:      q,
		Mode:       mode,
		Type:       c.Query("type"),
		LocationID: c.Query("location_id"),
		Limit:      searchLimit,
		Offset:     0,
	}

	result, err := h.search.Search(c.Request.Context(), params)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Chunk submissions
	subChunks := chunkSubmissions(result.Submissions, chunkSize)
	profChunks := chunkProfiles(result.Profiles, chunkSize)

	// Total chunks = max of sub and prof chunk counts
	totalChunks := len(subChunks)
	if len(profChunks) > totalChunks {
		totalChunks = len(profChunks)
	}
	if totalChunks > maxChunks {
		totalChunks = maxChunks
		if len(subChunks) > maxChunks {
			subChunks = subChunks[:maxChunks]
		}
		if len(profChunks) > maxChunks {
			profChunks = profChunks[:maxChunks]
		}
	}
	if totalChunks == 0 {
		totalChunks = 1 // always at least 1 chunk (even if empty)
	}

	totalResults := len(result.Submissions) + len(result.Profiles)

	// Generate session ID
	sessionID, err := generateSessionID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate session id"})
		return
	}

	// Store session in Redis
	session := searchSession{
		Mode:         result.Mode,
		TotalResults: totalResults,
		TotalChunks:  totalChunks,
		SubChunks:    subChunks,
		ProfChunks:   profChunks,
	}
	key := fmt.Sprintf("search_session:%s", sessionID)
	if err := h.cache.SetWithTTL(c.Request.Context(), key, session, sessionTTL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to cache search session"})
		return
	}

	// Return first chunk
	c.JSON(http.StatusOK, searchResponse{
		SessionID:    sessionID,
		Mode:         result.Mode,
		Chunk:        0,
		TotalChunks:  totalChunks,
		TotalResults: totalResults,
		Submissions:  safeSubChunk(subChunks, 0),
		Profiles:     safeProfChunk(profChunks, 0),
	})
}

func (h *Handler) SearchSession(c *gin.Context) {
	sessionID := c.Param("id")

	chunkIdx, err := strconv.Atoi(c.DefaultQuery("chunk", "0"))
	if err != nil || chunkIdx < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid chunk index"})
		return
	}

	key := fmt.Sprintf("search_session:%s", sessionID)
	var session searchSession
	if !h.cache.Get(c.Request.Context(), key, &session) {
		c.JSON(http.StatusNotFound, gin.H{"error": "session not found or expired"})
		return
	}

	if chunkIdx >= session.TotalChunks {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("chunk index %d out of range (total: %d)", chunkIdx, session.TotalChunks)})
		return
	}

	c.JSON(http.StatusOK, searchResponse{
		SessionID:    sessionID,
		Mode:         session.Mode,
		Chunk:        chunkIdx,
		TotalChunks:  session.TotalChunks,
		TotalResults: session.TotalResults,
		Submissions:  safeSubChunk(session.SubChunks, chunkIdx),
		Profiles:     safeProfChunk(session.ProfChunks, chunkIdx),
	})
}

func generateSessionID() (string, error) {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func chunkSubmissions(items []models.Submission, size int) [][]models.Submission {
	if len(items) == 0 {
		return nil
	}
	var chunks [][]models.Submission
	for i := 0; i < len(items); i += size {
		end := i + size
		if end > len(items) {
			end = len(items)
		}
		chunks = append(chunks, items[i:end])
	}
	return chunks
}

func chunkProfiles(items []models.Profile, size int) [][]models.Profile {
	if len(items) == 0 {
		return nil
	}
	var chunks [][]models.Profile
	for i := 0; i < len(items); i += size {
		end := i + size
		if end > len(items) {
			end = len(items)
		}
		chunks = append(chunks, items[i:end])
	}
	return chunks
}

func safeSubChunk(chunks [][]models.Submission, idx int) []models.Submission {
	if idx < len(chunks) {
		return chunks[idx]
	}
	return []models.Submission{}
}

func safeProfChunk(chunks [][]models.Profile, idx int) []models.Profile {
	if idx < len(chunks) {
		return chunks[idx]
	}
	return []models.Profile{}
}
