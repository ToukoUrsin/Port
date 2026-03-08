package agents

import (
	"fmt"
	"log"

	"google.golang.org/genai"
)

var agentTools = []*genai.Tool{{
	FunctionDeclarations: []*genai.FunctionDeclaration{
		{
			Name:        "list_articles",
			Description: "Browse recent articles on the platform. Returns titles, IDs, categories, and summaries.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"limit":  {Type: genai.TypeInteger, Description: "Number of articles to fetch (default 10, max 50)"},
					"offset": {Type: genai.TypeInteger, Description: "Pagination offset (default 0)"},
				},
			},
		},
		{
			Name:        "read_article",
			Description: "Read the full content of a specific article.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"article_id": {Type: genai.TypeString, Description: "UUID of the article to read"},
				},
				Required: []string{"article_id"},
			},
		},
		{
			Name:        "list_comments",
			Description: "See all comments on an article.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"article_id": {Type: genai.TypeString, Description: "UUID of the article"},
				},
				Required: []string{"article_id"},
			},
		},
		{
			Name:        "post_comment",
			Description: "Post a comment on an article.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"article_id": {Type: genai.TypeString, Description: "UUID of the article (submission) to comment on"},
					"body":       {Type: genai.TypeString, Description: "The comment text"},
				},
				Required: []string{"article_id", "body"},
			},
		},
		{
			Name:        "reply_to_comment",
			Description: "Reply to an existing comment on an article.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"article_id": {Type: genai.TypeString, Description: "UUID of the article (submission)"},
					"parent_id":  {Type: genai.TypeString, Description: "UUID of the comment to reply to"},
					"body":       {Type: genai.TypeString, Description: "The reply text"},
				},
				Required: []string{"article_id", "parent_id", "body"},
			},
		},
		{
			Name:        "like_article",
			Description: "Like an article you enjoyed.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"article_id": {Type: genai.TypeString, Description: "UUID of the article to like"},
				},
				Required: []string{"article_id"},
			},
		},
		{
			Name:        "like_comment",
			Description: "Like a comment you appreciate.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"comment_id": {Type: genai.TypeString, Description: "UUID of the comment (reply) to like"},
				},
				Required: []string{"comment_id"},
			},
		},
		{
			Name:        "create_article",
			Description: "Write and publish a new local news article. Use this only when you feel inspired to write about something happening in Kirkkonummi.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"title":    {Type: genai.TypeString, Description: "Article headline"},
					"content":  {Type: genai.TypeString, Description: "Full article content in markdown"},
					"category": {Type: genai.TypeString, Description: "Category (e.g. community, sports, environment, culture, politics, business)"},
					"summary":  {Type: genai.TypeString, Description: "Brief 1-2 sentence summary"},
				},
				Required: []string{"title", "content", "category"},
			},
		},
		{
			Name:        "done",
			Description: "Signal that you are finished browsing and interacting for this session.",
			Parameters: &genai.Schema{
				Type: genai.TypeObject,
				Properties: map[string]*genai.Schema{
					"summary": {Type: genai.TypeString, Description: "Brief summary of what you did this session"},
				},
			},
		},
	},
}}

// executeTool dispatches a function call to the HTTP API client and returns the result.
func executeTool(name string, args map[string]any, client *APIClient, persona Persona, logger *log.Logger) map[string]any {
	switch name {
	case "list_articles":
		limit := intArg(args, "limit", 10)
		offset := intArg(args, "offset", 0)
		result, err := client.ListArticles(limit, offset)
		if err != nil {
			logger.Printf("  [%s] list_articles error: %v", persona.ProfileName, err)
			return map[string]any{"error": err.Error()}
		}
		logger.Printf("  [%s] listed articles (limit=%d, offset=%d)", persona.ProfileName, limit, offset)
		return result

	case "read_article":
		id := strArg(args, "article_id")
		result, err := client.GetArticle(id)
		if err != nil {
			logger.Printf("  [%s] read_article error: %v", persona.ProfileName, err)
			return map[string]any{"error": err.Error()}
		}
		logger.Printf("  [%s] read article %s", persona.ProfileName, id)
		return result

	case "list_comments":
		id := strArg(args, "article_id")
		result, err := client.ListReplies(id)
		if err != nil {
			logger.Printf("  [%s] list_comments error: %v", persona.ProfileName, err)
			return map[string]any{"error": err.Error()}
		}
		logger.Printf("  [%s] listed comments on %s", persona.ProfileName, id)
		return result

	case "post_comment":
		articleID := strArg(args, "article_id")
		body := strArg(args, "body")
		result, err := client.CreateReply(articleID, body, "")
		if err != nil {
			logger.Printf("  [%s] post_comment error: %v", persona.ProfileName, err)
			return map[string]any{"error": err.Error()}
		}
		logger.Printf("  [%s] commented on %s: %q", persona.ProfileName, articleID, truncate(body, 60))
		return result

	case "reply_to_comment":
		articleID := strArg(args, "article_id")
		parentID := strArg(args, "parent_id")
		body := strArg(args, "body")
		result, err := client.CreateReply(articleID, body, parentID)
		if err != nil {
			logger.Printf("  [%s] reply_to_comment error: %v", persona.ProfileName, err)
			return map[string]any{"error": err.Error()}
		}
		logger.Printf("  [%s] replied to comment %s: %q", persona.ProfileName, parentID, truncate(body, 60))
		return result

	case "like_article":
		id := strArg(args, "article_id")
		result, err := client.LikeArticle(id)
		if err != nil {
			logger.Printf("  [%s] like_article error: %v", persona.ProfileName, err)
			return map[string]any{"error": err.Error()}
		}
		logger.Printf("  [%s] liked article %s", persona.ProfileName, id)
		return result

	case "like_comment":
		id := strArg(args, "comment_id")
		result, err := client.LikeReply(id)
		if err != nil {
			logger.Printf("  [%s] like_comment error: %v", persona.ProfileName, err)
			return map[string]any{"error": err.Error()}
		}
		logger.Printf("  [%s] liked comment %s", persona.ProfileName, id)
		return result

	case "create_article":
		title := strArg(args, "title")
		content := strArg(args, "content")
		category := strArg(args, "category")
		summary := strArg(args, "summary")
		result, err := client.CreateArticleBatch(title, content, category, persona.ID, summary)
		if err != nil {
			logger.Printf("  [%s] create_article error: %v", persona.ProfileName, err)
			return map[string]any{"error": err.Error()}
		}
		logger.Printf("  [%s] created article: %q", persona.ProfileName, title)
		return result

	case "done":
		summary := strArg(args, "summary")
		logger.Printf("  [%s] done: %s", persona.ProfileName, summary)
		return map[string]any{"status": "done", "summary": summary}

	default:
		logger.Printf("  [%s] unknown tool: %s", persona.ProfileName, name)
		return map[string]any{"error": fmt.Sprintf("unknown tool: %s", name)}
	}
}

func strArg(args map[string]any, key string) string {
	if v, ok := args[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func intArg(args map[string]any, key string, def int) int {
	if v, ok := args[key]; ok {
		switch n := v.(type) {
		case float64:
			return int(n)
		case int:
			return n
		}
	}
	return def
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
