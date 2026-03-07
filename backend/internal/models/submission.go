package models

import (
	"time"

	"github.com/google/uuid"
)

// Block is deprecated — kept for backward compat with existing DB rows.
type Block struct {
	Type    string `json:"type"`
	Content string `json:"content,omitempty"`
	Src     string `json:"src,omitempty"`
	Caption string `json:"caption,omitempty"`
	Alt     string `json:"alt,omitempty"`
	Level   int    `json:"level,omitempty"`
	Author  string `json:"author,omitempty"`
}

type VerificationEntry struct {
	Claim    string `json:"claim"`
	Evidence string `json:"evidence"`
	Status   string `json:"status"` // SUPPORTED | NOT_IN_SOURCE | POSSIBLE_HALLUCINATION | FABRICATED_QUOTE
}

type QualityScores struct {
	Evidence        float64 `json:"evidence"`
	Perspectives    float64 `json:"perspectives"`
	Representation  float64 `json:"representation"`
	EthicalFraming  float64 `json:"ethical_framing"`
	CulturalContext float64 `json:"cultural_context"`
	Manipulation    float64 `json:"manipulation"`
}

type RedTrigger struct {
	Dimension  string   `json:"dimension"`
	Trigger    string   `json:"trigger"`
	Paragraph  int      `json:"paragraph"`
	Sentence   string   `json:"sentence"`
	FixOptions []string `json:"fix_options"`
}

type YellowFlag struct {
	Dimension   string `json:"dimension"`
	Description string `json:"description"`
	Suggestion  string `json:"suggestion"`
}

type Coaching struct {
	Celebration string   `json:"celebration"`
	Suggestions []string `json:"suggestions"`
}

type WebSource struct {
	Title string `json:"title"`
	URL   string `json:"url"`
}

type ReviewResult struct {
	Verification []VerificationEntry `json:"verification"`
	Scores       QualityScores       `json:"scores"`
	Gate         string              `json:"gate"` // GREEN | YELLOW | RED
	RedTriggers  []RedTrigger        `json:"red_triggers"`
	YellowFlags  []YellowFlag        `json:"yellow_flags"`
	Coaching     Coaching            `json:"coaching"`
	WebSources   []WebSource         `json:"web_sources,omitempty"`
}

type ArticleMetadata struct {
	ChosenStructure string   `json:"chosen_structure"` // news_report | feature | photo_essay | brief | narrative
	Category        string   `json:"category"`
	Confidence      float64  `json:"confidence"`
	MissingContext  []string `json:"missing_context"`
}

type ArticleVersion struct {
	ArticleMarkdown  string          `json:"article_markdown"`
	Metadata         ArticleMetadata `json:"metadata"`
	Review           ReviewResult    `json:"review"`
	ContributorInput string          `json:"contributor_input"`
	Timestamp        time.Time       `json:"timestamp"`
}

type EditEntry struct {
	EditedBy uuid.UUID `json:"edited_by"`
	EditedAt time.Time `json:"edited_at"`
	Field    string    `json:"field"`
	Previous string    `json:"previous"`
}

type SubmissionMeta struct {
	ArticleMarkdown string           `json:"article_markdown,omitempty"`
	ArticleMetadata *ArticleMetadata `json:"article_metadata,omitempty"`
	Versions        []ArticleVersion `json:"versions,omitempty"`
	Transcript      string           `json:"transcript,omitempty"`
	Review          *ReviewResult    `json:"review,omitempty"`
	Summary         string           `json:"summary,omitempty"`
	Category        string           `json:"category,omitempty"`
	Model       string        `json:"model,omitempty"`
	GeneratedAt *time.Time    `json:"generated_at,omitempty"`
	Slug        string        `json:"slug,omitempty"`
	FeaturedImg string        `json:"featured_img,omitempty"`
	Sources     []string      `json:"sources,omitempty"`
	EventDate   string        `json:"event_date,omitempty"`
	PlaceName   string        `json:"place_name,omitempty"`
	CoAuthors   []uuid.UUID   `json:"co_authors,omitempty"`
	PublishedAt *time.Time    `json:"published_at,omitempty"`
	PublishedBy *uuid.UUID    `json:"published_by,omitempty"`
	ScheduledAt *time.Time    `json:"scheduled_at,omitempty"`
	Flagged     bool          `json:"flagged,omitempty"`
	FlagReason  string        `json:"flag_reason,omitempty"`
	Anonymous   bool          `json:"anonymous,omitempty"`
	EditHistory []EditEntry   `json:"edit_history,omitempty"`
	Blocks      []Block       `json:"blocks,omitempty"` // deprecated — kept for existing DB rows
}

type Submission struct {
	ID          uuid.UUID             `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
	OwnerID     uuid.UUID             `gorm:"type:uuid;not null;index" json:"owner_id"`
	LocationID  uuid.UUID             `gorm:"type:uuid;not null;index" json:"location_id"`
	ContinentID *uuid.UUID            `gorm:"type:uuid;index" json:"continent_id,omitempty"`
	CountryID   *uuid.UUID            `gorm:"type:uuid;index" json:"country_id,omitempty"`
	RegionID    *uuid.UUID            `gorm:"type:uuid;index" json:"region_id,omitempty"`
	CityID      *uuid.UUID            `gorm:"type:uuid;index" json:"city_id,omitempty"`
	Lat         *float64              `json:"lat,omitempty"`
	Lng         *float64              `json:"lng,omitempty"`
	Title       string                `gorm:"type:varchar(300);not null;default:''" json:"title"`
	Description string                `gorm:"type:text;not null;default:''" json:"description"`
	Tags        int64                 `gorm:"default:0" json:"tags"`
	Status      int16                 `gorm:"default:0;index" json:"status"`
	Error       int16                 `gorm:"default:0" json:"error"`
	Views       int                   `gorm:"default:0" json:"views"`
	ShareCount  int                   `gorm:"default:0" json:"share_count"`
	Reactions   JSONB[map[string]int] `gorm:"type:jsonb;default:'{}'" json:"reactions"`
	Meta         JSONB[SubmissionMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
	SearchVector string                `gorm:"type:tsvector" json:"-"`
	Timestamps
}

type SubmissionContributor struct {
	SubmissionID uuid.UUID `gorm:"type:uuid;not null;primaryKey" json:"submission_id"`
	ProfileID    uuid.UUID `gorm:"type:uuid;not null;primaryKey;index:idx_sub_contrib_profile" json:"profile_id"`
	Role         int16     `gorm:"default:0" json:"role"`
	CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
}
