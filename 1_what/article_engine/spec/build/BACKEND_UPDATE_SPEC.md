# BACKEND_UPDATE_SPEC.md — Model, Service, and Endpoint Changes
# Date: 2026-03-07 UTC+3
# Plan: 1_what/article_engine/spec/ARCHITECTURE.md
# Depends on: PROMPTS_SPEC.md (all data shapes defined there)

Changes to the Go backend to support markdown articles, 6-dimension review, gate system, coaching, and refinement loops. References current code in `backend/`.

---

## 1. Model Changes

### 1.1 New ReviewResult (replaces old)

The old `ReviewResult` in `models/submission.go`:

```go
// OLD — remove
type ReviewFlag struct {
    Type       string
    Text       string
    Suggestion string
}

type ReviewResult struct {
    Score    int
    Flags    []ReviewFlag
    Approved bool
}
```

Replace with:

```go
// NEW — models/submission.go

type VerificationEntry struct {
    Claim    string `json:"claim"`
    Evidence string `json:"evidence"`
    Status   string `json:"status"` // SUPPORTED | NOT_IN_SOURCE | POSSIBLE_HALLUCINATION | FABRICATED_QUOTE
}

type QualityScores struct {
    Evidence       float64 `json:"evidence"`
    Perspectives   float64 `json:"perspectives"`
    Representation float64 `json:"representation"`
    EthicalFraming float64 `json:"ethical_framing"`
    CulturalContext float64 `json:"cultural_context"`
    Manipulation   float64 `json:"manipulation"`
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

type ReviewResult struct {
    Verification []VerificationEntry `json:"verification"`
    Scores       QualityScores       `json:"scores"`
    Gate         string              `json:"gate"` // GREEN | YELLOW | RED
    RedTriggers  []RedTrigger        `json:"red_triggers"`
    YellowFlags  []YellowFlag        `json:"yellow_flags"`
    Coaching     Coaching            `json:"coaching"`
}
```

### 1.2 New ArticleMetadata

Returned alongside the markdown from generation. Replaces the old `GeneratedArticle` struct in `services/generation.go`.

```go
// NEW — models/submission.go

type ArticleMetadata struct {
    ChosenStructure string   `json:"chosen_structure"` // news_report | feature | photo_essay | brief | narrative
    Category        string   `json:"category"`         // council | schools | business | events | ...
    Confidence      float64  `json:"confidence"`       // 0.0-1.0
    MissingContext  []string `json:"missing_context"`  // 0-3 coaching questions
}
```

### 1.3 New ArticleVersion

For refinement history and rollback.

```go
// NEW — models/submission.go

type ArticleVersion struct {
    ArticleMarkdown string          `json:"article_markdown"`
    Metadata        ArticleMetadata `json:"metadata"`
    Review          ReviewResult    `json:"review"`
    ContributorInput string         `json:"contributor_input"` // what the contributor said in refinement
    Timestamp       time.Time       `json:"timestamp"`
}
```

### 1.4 Updated SubmissionMeta

Add new fields, deprecate `Blocks`.

```go
// UPDATED — models/submission.go

type SubmissionMeta struct {
    // NEW fields
    ArticleMarkdown string           `json:"article_markdown,omitempty"`
    ArticleMetadata *ArticleMetadata `json:"article_metadata,omitempty"`
    Versions        []ArticleVersion `json:"versions,omitempty"`

    // CHANGED — Review now uses the new ReviewResult type (same field name)
    Review      *ReviewResult `json:"review,omitempty"`

    // NEW — persisted on first pipeline run so refinement doesn't re-transcribe
    Transcript  string        `json:"transcript,omitempty"`

    // KEPT as-is
    Summary     string        `json:"summary,omitempty"`
    Category    string        `json:"category,omitempty"`
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
    EditHistory []EditEntry   `json:"edit_history,omitempty"`

    // DEPRECATED — keep for backward compat with existing data, but pipeline no longer writes to it
    Blocks      []Block       `json:"blocks,omitempty"`
}
```

The `Blocks` field stays in the struct so existing DB rows don't break on read, but the pipeline stops writing to it. New articles use `ArticleMarkdown`.

### 1.5 New Status Constants

```go
// ADD to models/constants.go

const (
    StatusRefining int16 = 7 // contributor submitted refinement, pipeline re-running
    StatusAppealed int16 = 8 // contributor appealed a RED gate, awaiting human review
)
```

---

## 2. Service Interface Changes

### 2.1 GenerationService

Old interface:

```go
// OLD
type GenerationService interface {
    Generate(ctx context.Context, transcript, notes string, photoCount int) (*GeneratedArticle, error)
}

type GeneratedArticle struct {
    Headline      string
    Body          string
    Summary       string
    Category      string
    PhotoCaptions []string
}
```

New interface:

```go
// NEW — services/generation.go

type GenerationInput struct {
    Transcript       string   // from ElevenLabs STT (may be empty for notes-only)
    Notes            string   // contributor's text notes (may be empty)
    PhotoDescriptions []string // from Gemini Vision, one per photo (may be empty)
    TownContext      string   // static town context blob
    PreviousArticle  string   // previous markdown for refinement (empty on first run)
    Direction        string   // contributor's refinement direction (empty on first run)
}

type GenerationOutput struct {
    ArticleMarkdown string                  // the full markdown article
    Metadata        models.ArticleMetadata  // parsed from ---METADATA--- block
}

type GenerationService interface {
    Generate(ctx context.Context, input GenerationInput) (*GenerationOutput, error)
}
```

The stub keeps sleeping 3s and returning a dummy markdown article + metadata. The real implementation:
1. Builds the system prompt (from PROMPTS_SPEC.md generation system prompt, verbatim)
2. Builds the user prompt from `GenerationInput` fields
3. Calls Gemini API
4. Parses the response: splits on `---METADATA---`, extracts article markdown and metadata JSON
5. Applies fallback parsing per PROMPTS_SPEC.md parsing concerns

### 2.2 ReviewService

Old interface:

```go
// OLD
type ReviewService interface {
    Review(ctx context.Context, article *GeneratedArticle, transcript, notes string) (*models.ReviewResult, error)
}
```

New interface:

```go
// NEW — services/review.go

type ReviewInput struct {
    ArticleMarkdown   string   // the generated article
    Transcript        string   // original transcript (may be empty)
    Notes             string   // original notes (may be empty)
    PhotoDescriptions []string // original photo descriptions (may be empty)
}

type ReviewService interface {
    Review(ctx context.Context, input ReviewInput) (*models.ReviewResult, error)
}
```

The stub keeps sleeping 2s. Returns a dummy `ReviewResult` with GREEN gate, sample scores, and coaching. The real implementation:
1. Builds the system prompt (from PROMPTS_SPEC.md review system prompt, verbatim)
2. Builds the user prompt from `ReviewInput` fields
3. Calls Gemini API
4. Parses the JSON response, stripping code fences if present
5. On parse failure, retries once per PROMPTS_SPEC.md parsing concerns
6. On second failure, returns the fallback review from PROMPTS_SPEC.md

### 2.3 New PhotoDescriptionService

```go
// NEW — services/photo_description.go

type PhotoDescriptionService interface {
    Describe(ctx context.Context, photoPath string) (string, error)
}

type StubPhotoDescriptionService struct{}

func NewStubPhotoDescriptionService() *StubPhotoDescriptionService {
    return &StubPhotoDescriptionService{}
}

func (s *StubPhotoDescriptionService) Describe(ctx context.Context, photoPath string) (string, error) {
    return "A photo showing a local scene in Kirkkonummi.", nil
}
```

The real implementation sends the image to Gemini Vision with the photo vision prompt from PROMPTS_SPEC.md.

---

## 3. Pipeline Changes (`services/pipeline.go`)

### 3.1 Updated PipelineService struct

Add `photoDescription` service to the pipeline's dependencies.

```go
type PipelineService struct {
    db               *gorm.DB
    transcription    TranscriptionService
    generation       GenerationService
    review           ReviewService
    photoDescription PhotoDescriptionService // NEW
    chunker          ChunkerService
    embedding        EmbeddingService
}

func NewPipelineService(
    db *gorm.DB,
    transcription TranscriptionService,
    generation GenerationService,
    review ReviewService,
    photoDescription PhotoDescriptionService, // NEW parameter
    chunker ChunkerService,
    embedding EmbeddingService,
) *PipelineService {
    // ...
}
```

### 3.2 Parallel GATHER stage

Currently the pipeline runs transcription sequentially. Change to parallel goroutines for transcription + photo vision.

```go
func (p *PipelineService) gather(ctx context.Context, sub *models.Submission, events chan<- PipelineEvent) (transcript string, photoDescs []string, err error) {
    var wg sync.WaitGroup
    var transcriptErr, photoErr error

    // Get file paths from DB
    audioPath := getAudioPath(sub)       // may be empty
    photoPaths := getPhotoPaths(sub)     // may be empty slice

    // Transcription goroutine — only if audio exists
    if audioPath != "" {
        wg.Add(1)
        go func() {
            defer wg.Done()
            events <- PipelineEvent{Event: "status", Step: "transcribing"}
            transcript, transcriptErr = p.transcription.Transcribe(ctx, audioPath)
        }()
    }
    // If no audio, skip — don't emit "transcribing" event

    // Photo description goroutine — only if photos exist
    if len(photoPaths) > 0 {
        wg.Add(1)
        go func() {
            defer wg.Done()
            events <- PipelineEvent{Event: "status", Step: "describing_photos"}
            photoDescs = make([]string, len(photoPaths))
            // Describe photos sequentially within the goroutine (rate limits)
            for i, path := range photoPaths {
                desc, descErr := p.photoDescription.Describe(ctx, path)
                if descErr != nil {
                    photoErr = descErr
                    return
                }
                photoDescs[i] = desc
            }
        }()
    }

    wg.Wait()

    if transcriptErr != nil {
        return "", nil, transcriptErr
    }
    if photoErr != nil {
        return "", nil, photoErr
    }

    return transcript, photoDescs, nil
}
```

**Skip logic for absent inputs:**
- No audio file → skip transcription entirely, don't emit `"transcribing"` SSE event
- No photos → skip photo vision entirely, don't emit `"describing_photos"` SSE event
- Notes-only (no audio, no photos) → GATHER completes instantly, pipeline goes straight to GENERATE

### 3.3 Updated GENERATE stage

```go
func (p *PipelineService) generate(ctx context.Context, sub *models.Submission, transcript string, photoDescs []string, events chan<- PipelineEvent) (*GenerationOutput, error) {
    events <- PipelineEvent{Event: "status", Step: "generating"}

    input := GenerationInput{
        Transcript:        transcript,
        Notes:             sub.Description, // contributor's notes stored here
        PhotoDescriptions: photoDescs,
        TownContext:       townContext, // package-level constant or config
    }

    // If this is a refinement round, add previous article + direction
    if sub.Meta.V.ArticleMarkdown != "" {
        input.PreviousArticle = sub.Meta.V.ArticleMarkdown
        // Direction comes from the latest version's ContributorInput
        if len(sub.Meta.V.Versions) > 0 {
            latest := sub.Meta.V.Versions[len(sub.Meta.V.Versions)-1]
            input.Direction = latest.ContributorInput
        }
    }

    return p.generation.Generate(ctx, input)
}
```

### 3.4 Updated REVIEW stage

```go
func (p *PipelineService) review(ctx context.Context, genOutput *GenerationOutput, transcript, notes string, photoDescs []string, events chan<- PipelineEvent) (*models.ReviewResult, error) {
    events <- PipelineEvent{Event: "status", Step: "reviewing"}

    input := ReviewInput{
        ArticleMarkdown:   genOutput.ArticleMarkdown,
        Transcript:        transcript,
        Notes:             notes,
        PhotoDescriptions: photoDescs,
    }

    return p.review.Review(ctx, input)
}
```

### 3.5 Refinement: reuse persisted transcript

On the first pipeline run, the transcript is saved to `sub.Meta.V.Transcript`. On refinement runs, the pipeline reads it from there instead of re-running ElevenLabs:

```go
func (p *PipelineService) Run(ctx context.Context, submissionID uuid.UUID, events chan<- PipelineEvent) {
    sub := loadSubmission(submissionID)

    // Validate starting state
    if sub.Status != models.StatusDraft && sub.Status != models.StatusRefining {
        events <- PipelineEvent{Event: "error", Message: "Submission is not in a valid state for pipeline processing"}
        return
    }

    var transcript string
    var photoDescs []string

    if sub.Status == models.StatusRefining && sub.Meta.V.Transcript != "" {
        // Refinement: reuse persisted transcript and photo descriptions
        transcript = sub.Meta.V.Transcript
        // Photo descriptions don't change between rounds — skip re-describing
        // (they were baked into the generation context on first run)
    } else {
        // First run: full GATHER stage
        var err error
        transcript, photoDescs, err = p.gather(ctx, sub, events)
        if err != nil { /* handle */ return }
    }

    // GENERATE + REVIEW as before...
}
```

### 3.6 Updated save + SSE complete

After GENERATE + REVIEW:

```go
func (p *PipelineService) saveResults(sub *models.Submission, genOutput *GenerationOutput, review *models.ReviewResult, transcript string, photoFileURLs []string) {
    // Replace photo placeholders with actual URLs
    article := genOutput.ArticleMarkdown
    for i, fileURL := range photoFileURLs {
        placeholder := fmt.Sprintf("photo_%d", i+1)
        article = strings.ReplaceAll(article, placeholder, fileURL)
    }

    // Extract headline from markdown (first # line)
    headline := extractHeadline(article)

    // Persist transcript on first run (so refinement doesn't re-transcribe)
    if sub.Meta.V.Transcript == "" && transcript != "" {
        sub.Meta.V.Transcript = transcript
    }

    // Save to submission
    sub.Title = headline
    sub.Meta.V.ArticleMarkdown = article
    sub.Meta.V.ArticleMetadata = &genOutput.Metadata
    sub.Meta.V.Review = review
    sub.Meta.V.Category = genOutput.Metadata.Category
    sub.Meta.V.Summary = extractFirstParagraph(article) // first paragraph after headline
    now := time.Now()
    sub.Meta.V.GeneratedAt = &now
    sub.Status = models.StatusReady

    p.db.Save(sub)
}
```

Helper to extract headline from markdown:

```go
func extractHeadline(markdown string) string {
    for _, line := range strings.Split(markdown, "\n") {
        line = strings.TrimSpace(line)
        if strings.HasPrefix(line, "# ") {
            return strings.TrimPrefix(line, "# ")
        }
    }
    return ""
}
```

### 3.6 Updated SSE complete event payload

```go
events <- PipelineEvent{
    Event: "complete",
    Data: map[string]any{
        "article":  sub.Meta.V.ArticleMarkdown,
        "metadata": sub.Meta.V.ArticleMetadata,
        "review":   sub.Meta.V.Review,
    },
}
```

This replaces the old payload that sent `Blocks`, `Score`, `Flags`, and `Approved`.

### 3.7 Embedding / Chunker — no changes

The `ChunkerService` and `EmbeddingService` remain in the pipeline as no-ops (stubs). They are not wired into the new flow. The old `ChunkBlocks` function takes `[]Block` which no longer applies. When embeddings are needed, add a `ChunkMarkdown(markdown string) []Chunk` function. For now, these services stay in the constructor to avoid breaking the interface but are not called.

### 3.8 Updated stub return values

The stubs must return the new types so the frontend can develop against them.

**StubGenerationService.Generate:**

```go
func (s *StubGenerationService) Generate(ctx context.Context, input GenerationInput) (*GenerationOutput, error) {
    time.Sleep(3 * time.Second)
    return &GenerationOutput{
        ArticleMarkdown: "# City Council Debates $4.2M Budget\n\nThe Kirkkonummi city council convened Tuesday evening for a budget discussion that drew approximately 30 residents to the chamber.\n\n> \"Our children deserve better than this.\"\n> — Korhonen, council member\n\nThe budget's specific provisions were not immediately available. Council members' reasoning for their votes was not available at press time.\n\n![Residents at the council meeting](photo_1)",
        Metadata: models.ArticleMetadata{
            ChosenStructure: "news_report",
            Category:        "council",
            Confidence:      0.7,
            MissingContext:  []string{"What specifically does the budget cut?", "How did the other council members vote?"},
        },
    }, nil
}
```

**StubReviewService.Review:**

```go
func (s *StubReviewService) Review(ctx context.Context, input ReviewInput) (*models.ReviewResult, error) {
    time.Sleep(2 * time.Second)
    return &models.ReviewResult{
        Verification: []models.VerificationEntry{
            {Claim: "council convened Tuesday evening", Evidence: "contributor mentioned council meeting", Status: "SUPPORTED"},
        },
        Scores: models.QualityScores{
            Evidence: 0.75, Perspectives: 0.5, Representation: 0.6,
            EthicalFraming: 0.9, CulturalContext: 0.8, Manipulation: 0.95,
        },
        Gate:        "GREEN",
        RedTriggers: []models.RedTrigger{},
        YellowFlags: []models.YellowFlag{
            {Dimension: "PERSPECTIVES", Description: "Only one side of the budget debate is represented", Suggestion: "Did anyone speak in favor of the budget?"},
        },
        Coaching: models.Coaching{
            Celebration: "The quote from Korhonen really captures the tension of the vote. Strong opening that leads with the news.",
            Suggestions: []string{"Do you know what the budget specifically cuts?"},
        },
    }, nil
}
```

---

## 4. New Endpoints

### 4.1 POST /api/submissions/:id/refine

Accept a refinement input (voice clip or text note), optionally transcribe, save the current article as a version, and prepare for re-running the pipeline.

**Handler: `RefineSubmission`**

```go
func (h *Handler) RefineSubmission(c *gin.Context) {
    // 1. Parse submission ID
    // 2. Load submission, check ownership (CanRefineSubmission)
    // 3. Validate status: must be StatusReady or StatusRefining
    //    If status is not valid, return 409 Conflict
    // 4. Parse input:
    //    - Multipart: voice_clip (audio file) — optional
    //    - JSON or form field: text_note (string) — optional
    //    - At least one must be present, otherwise 400
    // 5. If voice_clip present:
    //    - Save file via MediaService
    //    - Transcribe via TranscriptionService
    //    - direction = transcribed text
    // 6. If text_note present (and no voice_clip):
    //    - direction = text_note
    // 7. If both present:
    //    - direction = transcribed_voice + "\n\n" + text_note
    // 8. Save current article as a version:
    //    version := ArticleVersion{
    //        ArticleMarkdown:  sub.Meta.V.ArticleMarkdown,
    //        Metadata:         *sub.Meta.V.ArticleMetadata,
    //        Review:           *sub.Meta.V.Review,
    //        ContributorInput: direction,
    //        Timestamp:        time.Now(),
    //    }
    //    sub.Meta.V.Versions = append(sub.Meta.V.Versions, version)
    // 9. Set status to StatusRefining
    // 10. Save submission
    // 11. Return 200 {"status": "ready_to_stream"}
    //     Frontend will then open GET /submissions/:id/stream to re-run pipeline
}
```

**Request:** `POST /api/submissions/:id/refine`
- Content-Type: `multipart/form-data` (if voice_clip) or `application/json` (if text-only)
- Body: `voice_clip` (file, optional) + `text_note` (string, optional)
- Auth: required (owner of submission)

**Responses:**
- `200` `{"status": "ready_to_stream"}` — refinement saved, frontend should open SSE stream
- `400` — neither voice_clip nor text_note provided
- `403` — not the submission owner
- `404` — submission not found
- `409` — submission not in a refinable state (not StatusReady)

### 4.2 POST /api/submissions/:id/appeal

Escalate a RED-gated submission to human review.

**Handler: `AppealSubmission`**

```go
func (h *Handler) AppealSubmission(c *gin.Context) {
    // 1. Parse submission ID
    // 2. Load submission, check ownership (CanAppealSubmission)
    // 3. Validate: submission must be StatusReady AND review.gate == "RED"
    //    If not, return 409
    // 4. Set status to StatusAppealed
    // 5. Save submission
    // 6. Return 200 {"status": "under_review"}
}
```

**Request:** `POST /api/submissions/:id/appeal`
- Auth: required (owner of submission)
- Body: none

**Responses:**
- `200` `{"status": "under_review"}` — escalated to human review queue
- `403` — not the submission owner
- `404` — submission not found
- `409` — submission is not RED-gated and ready (can't appeal a GREEN/YELLOW article or one not in Ready state)

### 4.3 Updated PublishSubmission — Gate Check

The existing `PublishSubmission` handler needs a gate check before publishing.

```go
func (h *Handler) PublishSubmission(c *gin.Context) {
    // ... existing auth + load + access check ...

    // NEW: gate check
    if sub.Meta.V.Review != nil && sub.Meta.V.Review.Gate == "RED" {
        c.JSON(422, gin.H{
            "error":        "gate_red",
            "gate":         sub.Meta.V.Review.Gate,
            "coaching":     sub.Meta.V.Review.Coaching,
            "red_triggers": sub.Meta.V.Review.RedTriggers,
        })
        return
    }

    // ... existing publish logic (set status, published_at, etc.) ...
}
```

**Changed response:**
- `422 Unprocessable Entity` when gate is RED — body contains `{gate, coaching, red_triggers}` so the frontend can display the coaching and fix options. This is NOT a mechanical error — the response carries the warm coaching text.

---

## 5. State Machine

### Valid Status Transitions

```
Draft(0)          → Transcribing(1)     [pipeline starts, audio present]
Draft(0)          → Generating(2)       [pipeline starts, notes-only]
Transcribing(1)   → Generating(2)       [transcription complete]
Generating(2)     → Reviewing(3)        [generation complete]
Reviewing(3)      → Ready(4)            [review complete]
Ready(4)          → Published(5)        [publish, gate != RED]
Ready(4)          → Refining(7)         [contributor submits refinement]
Ready(4)          → Appealed(8)         [contributor appeals RED gate]
Ready(4)          → Archived(6)         [owner archives]
Refining(7)       → Generating(2)       [refinement pipeline starts — transcript reused from meta, voice clip already transcribed in handler]
Appealed(8)       → Ready(4)            [human reviewer clears]
Appealed(8)       → Archived(6)         [human reviewer rejects]
Published(5)      → Archived(6)         [owner or editor archives]
```

Note: On refinement, the pipeline always goes `Refining → Generating` (never back to `Transcribing`). The original transcript is persisted in `SubmissionMeta.Transcript`. If the contributor submitted a refinement voice clip, it was transcribed in the `RefineSubmission` handler before the pipeline starts.

### Invalid Transitions (return 409 Conflict)

- `Published → Refining` — can't refine a published article
- `Archived → anything` — archived is terminal (except admin override)
- `Appealed → Published` — must go through Ready first
- `Draft → Published` — must go through pipeline
- `Refining → Published` — must complete pipeline first

The pipeline's `Run` method should validate that the submission is in a valid starting state (Draft or Refining) before proceeding.

---

## 6. Access Control Additions

Add to `services/access.go`:

```go
func (a *AccessService) CanRefineSubmission(actor Actor, sub *models.Submission) bool {
    // Owner only. Must be in Ready state.
    return actor.ProfileID == sub.OwnerID && sub.Status == models.StatusReady
}

func (a *AccessService) CanAppealSubmission(actor Actor, sub *models.Submission) bool {
    // Owner only. Must be Ready with RED gate.
    if actor.ProfileID != sub.OwnerID {
        return false
    }
    if sub.Status != models.StatusReady {
        return false
    }
    if sub.Meta.V.Review == nil || sub.Meta.V.Review.Gate != "RED" {
        return false
    }
    return true
}
```

---

## 7. Dependency

Add the Google Gemini Go SDK for real API calls:

```bash
go get google.golang.org/genai
```

This is needed for the real `GenerationService`, `ReviewService`, and `PhotoDescriptionService` implementations (not the stubs).

---

## 8. New Routes

Add to `cmd/server/main.go` in the `authed` route group:

```go
authed.POST("/submissions/:id/refine", h.RefineSubmission)
authed.POST("/submissions/:id/appeal", h.AppealSubmission)
```

Update DI to include `PhotoDescriptionService`:

```go
// Pipeline stubs
transcription := services.NewStubTranscriptionService()
generation := services.NewStubGenerationService()     // update stub to return new types
review := services.NewStubReviewService()              // update stub to return new types
photoDesc := services.NewStubPhotoDescriptionService() // NEW
chunker := services.NewStubChunkerService()
embedding := services.NewNoOpEmbeddingService()
pipelineSvc := services.NewPipelineService(db, transcription, generation, review, photoDesc, chunker, embedding)
```

---

## 9. Implementation Order

Work in this order to keep the codebase compiling at each step:

1. **Models first** — Add new types to `models/submission.go`, new constants to `models/constants.go`. Keep old `Block` and `ReviewFlag` types (still referenced by existing data). Run `go build ./...` to verify.

2. **Service interfaces** — Update `GenerationService` and `ReviewService` interfaces in their respective files. Update stubs to return the new types. Create `PhotoDescriptionService` interface + stub. Run `go build ./...`.

3. **Pipeline** — Update `PipelineService` struct and constructor (add `photoDescription`). Implement parallel GATHER, updated GENERATE/REVIEW calls, new save logic, updated SSE payload. Update `main.go` DI. Run `go build ./...`.

4. **Handlers** — Add `RefineSubmission` and `AppealSubmission` handlers. Update `PublishSubmission` with gate check. Add routes to `main.go`. Run `go build ./...`.

5. **Access control** — Add `CanRefineSubmission` and `CanAppealSubmission` to `access.go`.

6. **Prompt files** — Create `services/prompts/` directory with embedded text files:

    ```
    services/prompts/
      prompts.go                 # //go:embed directives exposing var strings
      generation_system.txt      # generation system prompt (from PROMPTS_SPEC.md)
      review_system.txt          # review system prompt (from PROMPTS_SPEC.md)
      photo_vision.txt           # photo description prompt
      town_context.txt           # static Kirkkonummi demo context
    ```

    `prompts.go` uses Go 1.16+ embed:

    ```go
    package prompts

    import _ "embed"

    //go:embed generation_system.txt
    var GenerationSystem string

    //go:embed review_system.txt
    var ReviewSystem string

    //go:embed photo_vision.txt
    var PhotoVision string

    //go:embed town_context.txt
    var TownContext string
    ```

    User prompt templates are built in each service using `strings.NewReplacer` with `{transcript}`, `{notes}`, etc. — kept inline since they're short.

7. **Real API services** — Implement `GeminiGenerationService`, `GeminiReviewService`, `GeminiPhotoDescriptionService` using the Google Gemini Go SDK. Each wraps one Gemini API call with `prompts.GenerationSystem` (etc.) as the system instruction. Include the parsing logic from PROMPTS_SPEC.md (delimiter search, fence stripping, retry on parse failure).

8. **Test** — Write test cases matching PROMPTS_SPEC.md test cases 1-7. Run against real Gemini API. Verify gate classifications, coaching vocabulary constraints, and output schema compliance.

---

## 10. Files Modified (Summary)

| File | Changes |
|------|---------|
| `models/submission.go` | Replace `ReviewFlag` + old `ReviewResult` with new types. Add `ArticleMetadata`, `ArticleVersion`. Update `SubmissionMeta` fields. |
| `models/constants.go` | Add `StatusRefining(7)`, `StatusAppealed(8)` |
| `services/generation.go` | New `GenerationInput`, `GenerationOutput`, updated interface. Update stub. |
| `services/review.go` | New `ReviewInput`, updated interface returning `*models.ReviewResult`. Update stub. |
| `services/photo_description.go` | New file. `PhotoDescriptionService` interface + stub. |
| `services/pipeline.go` | Add `photoDescription` dependency. Parallel GATHER. Skip logic for absent inputs. Updated save + SSE payload. Photo placeholder replacement. |
| `services/access.go` | Add `CanRefineSubmission`, `CanAppealSubmission`. |
| `handlers/submissions.go` | Add `RefineSubmission`, `AppealSubmission`. Update `PublishSubmission` gate check. |
| `cmd/server/main.go` | Add photo description stub to DI. Add `/refine` and `/appeal` routes. |
| `services/prompts/prompts.go` | New file. `//go:embed` directives for all prompt text files. |
| `services/prompts/*.txt` | New files. System prompts, photo vision prompt, town context (from PROMPTS_SPEC.md). |
