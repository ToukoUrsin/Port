# Integration Status — Backend Reality vs. Article Engine Architecture
# Date: 2026-03-07 UTC+3

The backend exists. It's not a skeleton — it's a working app with auth, CRUD, SSE streaming, file uploads, caching, and a stub pipeline. The question is: how far is it from what the article engine architecture specifies?

---

## What's Already Built and Good

The backend has **more infrastructure than needed**. Auth, access control, profiles, replies, follows, locations, search, caching — all done. The article engine only needs a fraction of this.

### Pipeline orchestration (pipeline.go) — works
The pattern is right: `PipelineService` holds interfaces for each stage (`TranscriptionService`, `GenerationService`, `ReviewService`, `ChunkerService`, `EmbeddingService`), runs them in sequence, emits SSE events through a channel. The handler opens the channel, streams events to the frontend. This is the correct shape.

### File uploads (media.go, submissions handler) — works
`CreateSubmission` accepts multipart: audio file + photos[] + notes. Saves to disk, creates File records with submission_id. The GATHER phase can find files by `submission_id + file_type`.

### SSE streaming (submissions handler) — works
`StreamPipeline` sets correct headers, opens a goroutine for the pipeline, streams events with `c.Stream()`. The frontend receives `event: status` and `event: complete`. Matches the architecture.

### Auth + access control — works
JWT, roles, permissions, per-resource access checks. `CanPublishSubmission` requires `PermPublish` + `StatusReady`. Complete and more than sufficient.

### Config — ready
`AnthropicAPIKey` and `ElevenLabsAPIKey` already in the config struct. Just need env vars set.

---

## What Needs to Change

### 1. ReviewResult model — must be rewritten

**Current** (`models/submission.go`):
```go
type ReviewResult struct {
    Score    int          `json:"score"`       // single integer
    Flags    []ReviewFlag `json:"flags"`       // generic flags
    Approved bool         `json:"approved"`    // binary
}
```

**Architecture requires:**
```go
type VerificationEntry struct {
    Claim    string `json:"claim"`
    Evidence string `json:"evidence"`
    Status   string `json:"status"` // SUPPORTED, NOT_IN_SOURCE, POSSIBLE_HALLUCINATION, FABRICATED_QUOTE
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
    Dimension   string   `json:"dimension"`
    TriggerType string   `json:"trigger_type"`
    Paragraph   int      `json:"paragraph"`
    Sentence    string   `json:"sentence"`
    Explanation string   `json:"explanation"`
    FixOptions  []string `json:"fix_options"`
}

type Coaching struct {
    Celebration string   `json:"celebration"`
    Suggestions []string `json:"suggestions"`
}

type ReviewResult struct {
    Verification []VerificationEntry `json:"verification"`
    Scores       QualityScores       `json:"scores"`
    Gate         string              `json:"gate"` // GREEN, YELLOW, RED
    RedTriggers  []RedTrigger        `json:"red_triggers"`
    YellowFlags  []string            `json:"yellow_flags"`
    Coaching     Coaching            `json:"coaching"`
}
```

This is the biggest model change. Everything downstream (pipeline, handler, frontend) touches ReviewResult.

### 2. Article format — Block structs must become markdown

**Current flow:**
```
generation.Generate() returns GeneratedArticle{Headline, Body, Summary, Category, PhotoCaptions}
pipeline.go converts to Block structs: [{type:"heading", content:headline}, {type:"text", content:body}]
stored in meta.Blocks
```

**Architecture requires:**
```
generation.Generate() returns article_markdown (single string) + metadata sidecar
stored as meta.ArticleMarkdown (string) + meta.ArticleMetadata (struct)
```

The `Block` type was designed for a structured JSON article format. OUTPUT_FORMAT.md explicitly killed that approach — "JSON as primary article output format" is listed under "What Dies." The article is markdown prose; the AI makes structural decisions.

**Change:**
- `GeneratedArticle` struct: replace `Headline`/`Body` with `Markdown string` + `Metadata ArticleMetadata`
- `SubmissionMeta`: add `ArticleMarkdown string`, add `ArticleMetadata` struct, keep `Blocks` for backward compat or remove
- Pipeline: stop creating Block arrays from the generated article
- Chunker: chunk from markdown text instead of Block arrays (or just split on paragraphs)

### 3. GenerationService interface — needs richer input

**Current:**
```go
Generate(ctx context.Context, transcript, notes string, photoCount int) (*GeneratedArticle, error)
```

**Architecture requires:**
```go
type GenerationInput struct {
    Transcript       string
    Notes            string
    PhotoDescriptions []string    // from Claude vision, not just count
    TownContext      string
    PreviousArticle  string      // for refinement rounds
    Direction        string      // contributor's refinement input
}

Generate(ctx context.Context, input GenerationInput) (*GeneratedArticle, error)
```

The current interface passes `photoCount int` — useless. The architecture needs photo descriptions from Claude vision. It also needs town context and refinement inputs.

### 4. ReviewService interface — needs source material

**Current:**
```go
Review(ctx context.Context, article *GeneratedArticle, transcript, notes string) (*ReviewResult, error)
```

**Close to correct.** The interface shape is right — it receives the article and the source material. Just needs to also receive photo descriptions, and the return type changes to the new ReviewResult.

### 5. Pipeline — missing parallel GATHER and photo vision

**Current pipeline.go flow:**
```
1. Find audio file → transcribe (serial)
2. Generate article (serial)
3. Review article (serial)
4. Embed (serial)
```

**Architecture requires:**
```
1. GATHER (parallel goroutines):
   - transcribe audio (ElevenLabs)
   - describe photos (Claude vision)
   - parse notes (local)
2. GENERATE (serial) — uses all GATHER outputs
3. REVIEW (serial) — uses article + all GATHER outputs
```

The pipeline needs:
- A photo description step (Claude vision API call for each photo)
- Parallel execution of transcription + photo description
- Pass photo descriptions to generation and review

### 6. Publish handler — missing gate check

**Current** (`submissions.go:253`):
```go
func (h *Handler) PublishSubmission(c *gin.Context) {
    // ... checks CanPublishSubmission (permission + status == Ready)
    // ... updates status to Published
    // NO gate check
}
```

**Architecture requires:**
```go
if review.Gate == "RED" {
    c.JSON(http.StatusUnprocessableEntity, gin.H{
        "coaching":     review.Coaching,
        "red_triggers": review.RedTriggers,
        "fix_options":  ...,
    })
    return
}
```

The publish handler must read the review from `sub.Meta.V.Review`, check the gate, and return warm coaching text if RED — not a mechanical error.

### 7. Missing endpoints — refine + appeal

**Not in router:**
- `POST /submissions/:id/refine` — accept voice_clip or text_note, mark for re-generation
- `POST /submissions/:id/appeal` — escalate RED gate to human review

**Need:**
- Refine handler: accept multipart (voice) or JSON (text), optionally transcribe voice, set status back to a processing state, trigger GENERATE → REVIEW again
- Appeal handler: simple status update + queue entry (can be minimal for hackathon)
- Routes in main.go under `authed` group

### 8. Missing submission states

**Current constants.go:**
```go
StatusDraft(0) → StatusTranscribing(1) → StatusGenerating(2) →
StatusReviewing(3) → StatusReady(4) → StatusPublished(5) → StatusArchived(6)
```

**Need to add:**
```go
StatusRefining  int16 = 7  // refinement round in progress
StatusAppealed  int16 = 8  // RED gate appealed, awaiting human review
```

### 9. Anthropic Go SDK — not in go.mod

The go.mod has no Anthropic SDK. Need to add it for both generation (Claude API) and photo vision (Claude vision API).

```
go get github.com/anthropics/anthropic-sdk-go
```

### 10. Version history — not in model

ARCHITECTURE.md specifies `versions[]` on the submission for refinement rollback:
```go
type ArticleVersion struct {
    ArticleMarkdown string          `json:"article_markdown"`
    Metadata        ArticleMetadata `json:"metadata"`
    Review          ReviewResult    `json:"review"`
    Direction       string          `json:"direction"`
    Timestamp       time.Time       `json:"timestamp"`
}
```

Add `Versions []ArticleVersion` to `SubmissionMeta`.

---

## What Doesn't Need to Change

- **main.go router structure** — just add 2 routes
- **Auth middleware** — untouched
- **Access control** — add `CanRefineSubmission`, `CanAppealSubmission` (trivial)
- **File/Location/Profile/Follow/Reply models** — untouched
- **Cache layer** — untouched
- **Media service** — untouched (file upload works)
- **Database connection** — untouched
- **Config** — untouched (API keys already there)

---

## The Integration Order

The stub pattern is a gift. Each service has an interface — swap the stub for a real implementation. The pipeline orchestration doesn't change, only the services it calls.

### Phase 1: Models (30 min)
Update `ReviewResult`, `SubmissionMeta`, `GeneratedArticle`. Add `ArticleVersion`. Add submission states. This is a model-only change — nothing breaks because stubs still return the old shape, but the types are ready.

### Phase 2: Real transcription (1 hr)
Implement `ElevenLabsTranscriptionService` behind the existing `TranscriptionService` interface. One HTTP call. Swap the stub in main.go. Test with a real audio file.

### Phase 3: Real generation (2-3 hr)
Implement `ClaudeGenerationService` behind `GenerationService` interface. This is where the **generation prompt** lives. Requires writing the actual prompt (the highest-leverage work). Add Anthropic SDK to go.mod.

### Phase 4: Photo vision (1 hr)
Add `PhotoDescriptionService` — Claude vision API call per photo. Integrate into pipeline GATHER phase with parallel goroutines.

### Phase 5: Real review (2-3 hr)
Implement `ClaudeReviewService` behind `ReviewService` interface. This is where the **review prompt** lives — the 4-phase prompt (verify, score, gate, coach). Parse Claude's JSON response into the new `ReviewResult` struct.

### Phase 6: Pipeline updates (1 hr)
- Parallel GATHER (goroutines for transcribe + photo vision)
- Pass richer context to generation and review
- Update SSE complete event payload

### Phase 7: Gate check + refine + appeal (1 hr)
- Add gate check to `PublishSubmission`
- Add `RefineSubmission` handler
- Add `AppealSubmission` handler
- Add routes

### Phase 8: Prompts (parallel with Phase 3+5)
Write the actual generation and review system prompts. Test against varied inputs. Iterate. This is the real product work — everything else is plumbing.

---

## The Honest Assessment

**The backend is ~60% of the way there in terms of infrastructure, ~0% in terms of the article engine's actual intelligence.**

The plumbing works: uploads, streaming, auth, storage, CRUD. The pipeline orchestration pattern is correct. But every AI service is a stub returning hardcoded data. The models don't match the architecture. The two most critical artifacts — the generation and review prompts — don't exist.

The gap is not "we need to build a backend." The gap is:
1. Update 3 structs to match the architecture (1 hr)
2. Write 2 prompts that encode the journalism craft (4-6 hr — this IS the product)
3. Implement 3 API integrations behind existing interfaces (4-5 hr)
4. Add 2 endpoints and 1 gate check (1 hr)

That's a focused day of work, not a rewrite. The backend's stub-and-interface pattern means the AI integration slots in cleanly. The foundation was built for exactly this moment.
