package services

import (
	"context"
	"time"

	"github.com/localnews/backend/internal/models"
)

type GeneratedArticle struct {
	Headline      string   `json:"headline"`
	Body          string   `json:"body"`
	Summary       string   `json:"summary"`
	Category      string   `json:"category"`
	PhotoCaptions []string `json:"photo_captions"`
}

type GenerationService interface {
	Generate(ctx context.Context, transcript, notes string, photoCount int) (*GeneratedArticle, error)
}

type StubGenerationService struct{}

func NewStubGenerationService() *StubGenerationService {
	return &StubGenerationService{}
}

func (s *StubGenerationService) Generate(ctx context.Context, transcript, notes string, photoCount int) (*GeneratedArticle, error) {
	time.Sleep(3 * time.Second)

	now := time.Now()
	_ = now

	article := &GeneratedArticle{
		Headline: "City Council Debates $4.2M Budget with Focus on Infrastructure",
		Body: `The city council convened Tuesday evening for a pivotal budget discussion that could shape local infrastructure priorities for years to come.

Council member Maria Johnson led the push for increased infrastructure spending, highlighting the deteriorating condition of Main Street. "We need to prioritize infrastructure spending, especially road repairs on Main Street that have been delayed for over two years," Johnson told the packed council chamber.

The proposed $4.2 million budget represents a significant investment in public services, with allocations spanning parks maintenance, library expansion, and a new downtown community center. The spending plan comes amid favorable revenue conditions, with Mayor Thompson reporting an 8 percent increase in property tax revenue over the previous year.

"This gives us more room to invest in the services our residents depend on," Thompson said during his opening remarks.

The library expansion emerged as a popular topic during the public comment period, drawing support from multiple residents who cited growing demand for community programming and digital resources.

The council is expected to cast its final vote on the budget at next month's regular meeting. If approved, construction on the priority projects could begin as early as spring.`,
		Summary:       "City council discusses $4.2M budget proposal focusing on road repairs, library expansion, and new community center, with final vote expected next month.",
		Category:      "council",
		PhotoCaptions: []string{"Council members review the proposed budget during Tuesday's meeting"},
	}

	// Convert to blocks
	_ = []models.Block{
		{Type: "heading", Content: article.Headline, Level: 1},
		{Type: "text", Content: article.Body},
	}

	return article, nil
}
