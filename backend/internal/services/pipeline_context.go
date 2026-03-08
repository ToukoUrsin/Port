// PipelineContext carries accumulated data through all pipeline stages.
//
// Each stage reads from and writes to the context so downstream stages
// see everything upstream produced.
package services

import "github.com/localnews/backend/internal/models"

// PipelineContext is the shared state threaded through GATHER → RESEARCH → QUESTIONING → GENERATE → REVIEW.
type PipelineContext struct {
	// GATHER outputs
	Transcript        string
	Notes             string
	PhotoDescriptions []string
	PhotoFileURLs     []string
	TownContext       string
	Language          string // e.g. "Finnish", "English", "Swedish"; empty = auto-detect from source

	// RESEARCH outputs
	ResearchContext string
	ResearchSources []models.WebSource

	// QUESTIONING outputs
	QuestionsAsked       []string // all questions asked (questioning + generation gaps)
	ClarificationAnswers string   // formatted Q&A pairs

	// GENERATION outputs
	ArticleMarkdown string
	Metadata        models.ArticleMetadata

	// Refinement
	PreviousArticle string
	Direction       string
}
