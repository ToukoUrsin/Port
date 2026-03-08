package agents

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/google/uuid"
)

// APIClient wraps HTTP calls to the backend REST API.
type APIClient struct {
	baseURL    string
	httpClient *http.Client
	token      string // JWT for the agent persona
	adminToken string // JWT for batch article creation (admin role)
}

func NewAPIClient(baseURL, token, adminToken string) *APIClient {
	return &APIClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		token:      token,
		adminToken: adminToken,
	}
}

func (c *APIClient) ListArticles(limit, offset int) (map[string]any, error) {
	url := fmt.Sprintf("%s/api/articles?limit=%d&offset=%d&sort=recent", c.baseURL, limit, offset)
	return c.getJSON(url, c.token)
}

func (c *APIClient) GetArticle(id string) (map[string]any, error) {
	url := fmt.Sprintf("%s/api/articles/%s", c.baseURL, id)
	return c.getJSON(url, c.token)
}

func (c *APIClient) ListReplies(articleID string) (map[string]any, error) {
	url := fmt.Sprintf("%s/api/articles/%s/replies", c.baseURL, articleID)
	return c.getJSON(url, c.token)
}

func (c *APIClient) CreateReply(submissionID, body, parentID string) (map[string]any, error) {
	url := fmt.Sprintf("%s/api/submissions/%s/replies", c.baseURL, submissionID)
	payload := map[string]any{"body": body}
	if parentID != "" {
		pid, err := uuid.Parse(parentID)
		if err == nil {
			payload["parent_id"] = pid.String()
		}
	}
	return c.postJSON(url, payload, c.token)
}

func (c *APIClient) LikeArticle(articleID string) (map[string]any, error) {
	url := fmt.Sprintf("%s/api/articles/%s/react", c.baseURL, articleID)
	return c.postJSON(url, map[string]any{"kind": 1}, c.token)
}

func (c *APIClient) LikeReply(replyID string) (map[string]any, error) {
	url := fmt.Sprintf("%s/api/replies/%s/react", c.baseURL, replyID)
	return c.postJSON(url, map[string]any{"kind": 1}, c.token)
}

func (c *APIClient) CreateArticleBatch(title, content, category string, ownerID uuid.UUID, summary string) (map[string]any, error) {
	url := fmt.Sprintf("%s/api/admin/batch", c.baseURL)
	// Use the Kirkkonummi location ID from seed data
	locationID := uuid.MustParse("a0000000-0000-0000-0000-000000000004")
	article := map[string]any{
		"title":       title,
		"content":     content,
		"category":    category,
		"location_id": locationID.String(),
		"owner_id":    ownerID.String(),
		"summary":     summary,
	}
	return c.postJSON(url, map[string]any{"articles": []any{article}}, c.adminToken)
}

func (c *APIClient) ListNotifications(limit int) (map[string]any, error) {
	url := fmt.Sprintf("%s/api/notifications?limit=%d", c.baseURL, limit)
	return c.getJSON(url, c.token)
}

func (c *APIClient) MarkAllNotificationsRead() (map[string]any, error) {
	url := fmt.Sprintf("%s/api/notifications/read", c.baseURL)
	req, err := http.NewRequest("PUT", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return map[string]any{"status": "ok"}, nil
}

// --- HTTP helpers ---

func (c *APIClient) getJSON(url, token string) (map[string]any, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return c.doRequest(req)
}

func (c *APIClient) postJSON(url string, body map[string]any, token string) (map[string]any, error) {
	data, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequest("POST", url, bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return c.doRequest(req)
}

func (c *APIClient) doRequest(req *http.Request) (map[string]any, error) {
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(bodyBytes))
	}

	// Try to parse as JSON object
	var result map[string]any
	if err := json.Unmarshal(bodyBytes, &result); err != nil {
		// Might be an array response (e.g., list articles)
		var arr []any
		if err2 := json.Unmarshal(bodyBytes, &arr); err2 == nil {
			return map[string]any{"items": arr}, nil
		}
		return map[string]any{"raw": string(bodyBytes)}, nil
	}
	return result, nil
}
