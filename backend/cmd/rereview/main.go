// Re-run the review pipeline on an existing published article and update its review in the DB.
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/localnews/backend/internal/config"
	"github.com/localnews/backend/internal/database"
	"github.com/localnews/backend/internal/models"
	"github.com/localnews/backend/internal/services"
	"google.golang.org/genai"
)

func main() {
	articleID := flag.String("id", "", "Article UUID to re-review")
	model := flag.String("model", "", "Gemini model (default: from config)")
	flag.Parse()

	if *articleID == "" {
		log.Fatal("usage: go run cmd/rereview/main.go -id <uuid>")
	}

	_ = godotenv.Load()
	cfg := config.Load()

	if cfg.GeminiAPIKey == "" {
		log.Fatal("GEMINI_API_KEY is required")
	}

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}

	// Load article
	id, err := uuid.Parse(*articleID)
	if err != nil {
		log.Fatalf("invalid UUID: %v", err)
	}

	var sub models.Submission
	if err := db.First(&sub, "id = ?", id).Error; err != nil {
		log.Fatalf("article not found: %v", err)
	}

	fmt.Printf("Article: %s\n", sub.Title)
	fmt.Printf("Old gate: %s\n", sub.Meta.V.Review.Gate)
	fmt.Printf("Old scores: %+v\n\n", sub.Meta.V.Review.Scores)

	// Reconstruct PipelineContext from stored meta
	pctx := &services.PipelineContext{
		Transcript:      sub.Meta.V.Transcript,
		ArticleMarkdown: sub.Meta.V.ArticleMarkdown,
	}

	if sub.Meta.V.Research != nil {
		pctx.ResearchContext = sub.Meta.V.Research.Context
	}

	if len(sub.Meta.V.PhotoDescs) > 0 {
		pctx.PhotoDescriptions = sub.Meta.V.PhotoDescs
	}

	// Reconstruct questions asked and answers from meta.questions
	if len(sub.Meta.V.Questions) > 0 {
		var questions []string
		var answerParts []string
		for _, q := range sub.Meta.V.Questions {
			questions = append(questions, q.Question)
			if q.Answer != "" {
				answerParts = append(answerParts, fmt.Sprintf("Q: %s\nA: %s", q.Question, q.Answer))
			}
		}
		pctx.QuestionsAsked = questions
		pctx.ClarificationAnswers = strings.Join(answerParts, "\n\n")
	}

	// Gemini client
	gemClient, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey:  cfg.GeminiAPIKey,
		Backend: genai.BackendGeminiAPI,
	})
	if err != nil {
		log.Fatalf("gemini: %v", err)
	}

	mdl := cfg.GenerationModel
	if *model != "" {
		mdl = *model
	}

	reviewSvc := services.NewGeminiReviewService(gemClient, mdl)

	fmt.Println("Running review...")
	result, err := reviewSvc.Review(context.Background(), pctx)
	if err != nil {
		log.Fatalf("review failed: %v", err)
	}

	fmt.Printf("\nNew gate: %s\n", result.Gate)
	fmt.Printf("New scores: %+v\n", result.Scores)

	if len(result.YellowFlags) > 0 {
		fmt.Println("\nYellow flags:")
		for _, f := range result.YellowFlags {
			fmt.Printf("  - [%s] %s\n", f.Dimension, f.Description)
		}
	}

	if len(result.RedTriggers) > 0 {
		fmt.Println("\nRed triggers:")
		for _, t := range result.RedTriggers {
			fmt.Printf("  - [%s] %s: %s\n", t.Dimension, t.Trigger, t.Sentence)
		}
	}

	if result.Coaching.Celebration != "" {
		fmt.Printf("\nCoaching celebration: %s\n", result.Coaching.Celebration)
	}
	if len(result.Coaching.Suggestions) > 0 {
		fmt.Println("Coaching suggestions:")
		for _, s := range result.Coaching.Suggestions {
			fmt.Printf("  - %s\n", s)
		}
	}

	// Update meta.review in DB
	sub.Meta.V.Review = result
	if err := db.Model(&sub).Update("meta", sub.Meta).Error; err != nil {
		log.Fatalf("failed to update meta: %v", err)
	}

	// Also update title from review if gate changed
	fmt.Println("\nReview updated in database.")

	// Pretty-print verification
	if len(result.Verification) > 0 {
		fmt.Println("\nVerification:")
		for _, v := range result.Verification {
			fmt.Printf("  [%s] %s\n    Evidence: %s\n", v.Status, v.Claim, v.Evidence)
		}
	}

	_ = json.NewEncoder(os.Stdout)
}
