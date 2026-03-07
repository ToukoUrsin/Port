# Local News Platform — Technical Specification

**Stack:** Go (Gin) · PostgreSQL · Redis · Vite + React · ElevenLabs STT · Claude API
**Target:** Hackathon MVP (48h build)

---

## Architecture Overview

```
┌─────────────────────────────┐      ┌─────────────────────────────┐
│   Frontend (Vite + React)   │      │   Reader Site (Vite + React)│
│   - Contributor PWA         │      │   - Public newspaper view   │
│   - Audio recorder          │      │   - Article pages           │
│   - Photo capture/upload    │      │   - Category filtering      │
└────────────┬────────────────┘      └────────────┬────────────────┘
             │                                    │
             └──────────────┬─────────────────────┘
                            │ REST / JSON / SSE
                            v
             ┌──────────────────────────────────────┐
             │     Backend (Gin)                     │
             │     Go 1.22+                         │
             ├──────────────────────────────────────┤
             │  POST /api/submissions               │
             │  GET  /api/submissions/{id}/stream    │ ← SSE
             │  GET  /api/articles                  │
             │  GET  /api/articles/{id}             │
             │  POST /api/articles/{id}/publish     │
             │  GET  /api/search?q=...&type=...      │
             │  GET  /api/locations/{slug}/articles  │
             └──────┬───────┬───────┬───────────────┘
                    │       │       │
          ┌─────────┘       │       └─────────┐
          v                 v                  v
   ┌────────────┐   ┌─────────────┐   ┌──────────────────┐
   │ PostgreSQL │   │ Claude API  │   │ ElevenLabs STT   │
   │            │   │ (generate + │   │ (transcribe)     │
   │ articles   │   │  review)    │   └──────────────────┘
   │ submissions│   └─────────────┘
   │ locations  │
   └──────┬─────┘          ┌──────────────┐
          │                │ File Storage │
          │                │ (local / S3) │
   ┌──────┴─────┐          └──────────────┘
   │   Redis    │
   │ (cache)    │
   │ TTL 30min  │
   └────────────┘
```

### Stateless Backend

The backend holds zero in-memory state between requests. All state lives in PostgreSQL, Redis, and external services:

- **No sessions** — no server-side user state, no login for MVP
- **No in-process queues** — pipeline progress is driven by the SSE connection, but each step's result is persisted to the DB (submission status, transcript, article row) as it completes. If the connection drops mid-pipeline, the data written so far is not lost.
- **No local file coupling** — media files go to a storage layer (local disk for hackathon, S3/R2 for production). The backend only stores paths/keys, never holds files in memory.
- **No local caching** — Redis is the shared cache. Every instance reads/writes the same Redis, so cache hits are consistent across instances.
- **Any instance can serve any request** — since all state is external (PostgreSQL + Redis), multiple backend instances can run behind a load balancer with no sticky sessions or shared memory.

This means the backend is a pure function layer: request comes in → check Redis → read/write DB + call external APIs → update Redis → response goes out.

---

## Backend — Go / Gin

### Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # Entrypoint, router setup, middleware
├── internal/
│   ├── config/
│   │   └── config.go            # Env vars, API keys, DB URL
│   ├── database/
│   │   └── database.go          # GORM connection + auto-migrate
│   ├── models/
│   │   ├── location.go          # Location model (hierarchical)
│   │   ├── profile.go           # Profile + auth models
│   │   ├── submission.go        # Submission model
│   │   ├── file.go              # File model
│   │   ├── tag.go               # Tag + EntityTag models
│   │   ├── follow.go            # Follow model
│   │   ├── reply.go             # Reply model
│   │   └── embedding.go         # Embedding model (pgvector)
│   ├── handlers/
│   │   ├── submissions.go       # POST raw content, GET stream (SSE)
│   │   ├── articles.go          # GET/list published articles
│   │   ├── search.go            # GET full-text search
│   │   └── locations.go         # GET location newspaper data
│   ├── services/
│   │   ├── transcription.go     # ElevenLabs STT integration
│   │   ├── generation.go        # Claude API — article generation
│   │   ├── review.go            # Claude API — editorial quality review
│   │   └── media.go             # File upload handling
│   ├── cache/
│   │   └── cache.go             # Redis client, get/set/invalidate helpers
│   └── middleware/
│       └── cors.go              # CORS configuration
├── go.mod
└── go.sum
```

### Dependencies

```
// go.mod
module github.com/localnews/backend

go 1.22

require (
    github.com/gin-gonic/gin          v1.10+
    github.com/gin-contrib/cors        v1.7+
    gorm.io/gorm                       v1.25+
    gorm.io/driver/postgres            v1.5+
    github.com/anthropics/anthropic-sdk-go  latest
    github.com/redis/go-redis/v9       v9.7+
    github.com/joho/godotenv           v1.5+
    github.com/google/uuid             v1.6+
)
```

### Key Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/localnews
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...          # Speech-to-Text
MEDIA_STORAGE_PATH=./uploads    # local for hackathon, S3 later
REDIS_URL=redis://localhost:6379/0
ALLOWED_ORIGINS=http://localhost:5173
PORT=8000
```

---

## Database — PostgreSQL

### Schema

```sql
CREATE TABLE locations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(200) NOT NULL,
    slug              VARCHAR(100) NOT NULL,
    level             SMALLINT NOT NULL,
    parent_id         UUID REFERENCES locations(id),
    path              TEXT NOT NULL,
    description       TEXT,
    is_active         BOOLEAN DEFAULT TRUE,

    -- Aggregate counters (includes all descendants)
    article_count     INTEGER DEFAULT 0,
    submission_count  INTEGER DEFAULT 0,
    contributor_count INTEGER DEFAULT 0,
    follower_count    INTEGER DEFAULT 0,

    -- Activity
    last_activity_at  TIMESTAMPTZ,
    trending_score    REAL DEFAULT 0,

    meta              JSONB DEFAULT '{}',

    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name    VARCHAR(200),
    email           VARCHAR(320) UNIQUE NOT NULL,
    password_hash   BYTEA NOT NULL,
    location_id     UUID REFERENCES locations(id),
    role            SMALLINT DEFAULT 0,
    permissions     BIGINT DEFAULT 0,
    tags            BIGINT DEFAULT 0,
    public          BOOLEAN DEFAULT FALSE,
    meta            JSONB DEFAULT '{}',

    -- Full-text search (populated from display_name + email)
    search_vector   TSVECTOR,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_location ON profiles (location_id);
CREATE INDEX idx_profiles_role ON profiles (role);
CREATE INDEX idx_profiles_search ON profiles USING GIN (search_vector);

CREATE TABLE refresh_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID REFERENCES profiles(id) NOT NULL,
    token_hash      BYTEA NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked         BOOLEAN DEFAULT FALSE,
    meta            JSONB DEFAULT '{}',          -- device, ip, user_agent
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_profile ON refresh_tokens (profile_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens (expires_at);

CREATE TABLE oauth_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID REFERENCES profiles(id) NOT NULL,
    provider        SMALLINT NOT NULL,           -- 1=google
    provider_uid    VARCHAR(300) NOT NULL,
    meta            JSONB DEFAULT '{}',          -- access_token, scopes, profile data
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, provider_uid)
);

CREATE INDEX idx_oauth_profile ON oauth_accounts (profile_id);

CREATE TABLE submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id     UUID REFERENCES locations(id) NOT NULL,
    contributor_id  UUID NOT NULL,
    tags            BIGINT DEFAULT 0,
    status          SMALLINT DEFAULT 0,
    error           SMALLINT DEFAULT 0,          -- 0=none, 1=transcription_failed, 2=generation_failed, etc.
    transcript      TEXT,                        -- populated after ElevenLabs STT completes
    notes           TEXT,                        -- contributor-provided notes
    headline        TEXT,                        -- generated article headline
    body            TEXT,                        -- generated article body (markdown)
    meta            JSONB DEFAULT '{}',

    -- Full-text search (populated from transcript + notes + headline + body)
    search_vector   TSVECTOR,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_location ON submissions (location_id);
CREATE INDEX idx_submissions_contributor ON submissions (contributor_id);
CREATE INDEX idx_submissions_status ON submissions (status);
CREATE INDEX idx_submissions_search ON submissions USING GIN (search_vector);

CREATE TABLE files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id       UUID NOT NULL,
    entity_category SMALLINT NOT NULL,
    submission_id   UUID REFERENCES submissions(id) NOT NULL,
    contributor_id  UUID NOT NULL,
    file_type       SMALLINT NOT NULL,
    name            VARCHAR(300) NOT NULL,
    size            BIGINT NOT NULL,
    uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
    meta            JSONB DEFAULT '{}'
);

CREATE INDEX idx_files_submission ON files (submission_id);
CREATE INDEX idx_files_type ON files (file_type);

CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE entity_tags (
    entity_id       UUID NOT NULL,
    entity_category SMALLINT NOT NULL,
    tag_id          UUID REFERENCES tags(id) NOT NULL,
    PRIMARY KEY(entity_id, tag_id)
);

CREATE INDEX idx_entity_tags_entity ON entity_tags (entity_id, entity_category);
CREATE INDEX idx_entity_tags_tag ON entity_tags (tag_id);

CREATE TABLE follows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID REFERENCES profiles(id) NOT NULL,
    target_id       UUID NOT NULL,               -- location or profile UUID
    target_type     SMALLINT NOT NULL,            -- 1=location, 2=profile
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, target_id, target_type)
);

CREATE INDEX idx_follows_profile ON follows (profile_id);
CREATE INDEX idx_follows_target ON follows (target_id, target_type);

CREATE TABLE replies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id   UUID REFERENCES submissions(id) NOT NULL,
    profile_id      UUID REFERENCES profiles(id) NOT NULL,
    parent_id       UUID REFERENCES replies(id),  -- NULL = top-level, set = nested reply
    body            TEXT NOT NULL,
    status          SMALLINT DEFAULT 0,
    meta            JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_replies_submission ON replies (submission_id);
CREATE INDEX idx_replies_profile ON replies (profile_id);
CREATE INDEX idx_replies_parent ON replies (parent_id);

CREATE TABLE embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id       UUID NOT NULL,
    entity_category SMALLINT NOT NULL,
    chunk_text      TEXT NOT NULL,
    embedding       VECTOR(1536) NOT NULL
);

CREATE INDEX idx_embeddings_entity ON embeddings (entity_id);
CREATE INDEX idx_embeddings_category ON embeddings (entity_category);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops);
```

### Migrations

GORM AutoMigrate handles schema creation during development. For production, use raw SQL migration files in `backend/migrations/` applied with a migration tool like `golang-migrate/migrate` or manual `psql` execution. The full-text search triggers and extensions (below) must be applied via raw SQL since GORM doesn't manage triggers.

### Full-Text Search

PostgreSQL full-text search with precalculated `tsvector` columns and GIN indexes for efficient keyword search. Extension required:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- trigram fuzzy matching
```

#### How it works

1. **Write time** — when a row is inserted/updated, a trigger populates the `search_vector` column by normalizing the source text into lexemes (tokenize → remove stop words → stem).
2. **GIN index** — an inverted index maps each lexeme to the rows containing it. Lookups are O(1) per term instead of full table scans.
3. **Query time** — the search query goes through the same normalization, then PostgreSQL intersects matching row sets from the index.

#### Triggers

```sql
-- Submissions: index transcript, notes, headline, and body
-- headline is weighted A (highest), body B, notes C, transcript D
CREATE FUNCTION submissions_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.headline, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.body, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.notes, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW.transcript, '')), 'D');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_submissions_search
  BEFORE INSERT OR UPDATE OF transcript, notes, headline, body
  ON submissions
  FOR EACH ROW EXECUTE FUNCTION submissions_search_update();

-- Profiles: index display_name and email
CREATE FUNCTION profiles_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.email, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_search
  BEFORE INSERT OR UPDATE OF display_name, email
  ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_search_update();
```

Note: profiles use the `simple` text search config (no stemming) since names and emails shouldn't be stemmed.

#### Search API (`GET /api/search`)

Query parameters:
- `q` — search query string (required)
- `type` — `submissions` | `profiles` | omit for both
- `location_id` — optional, scope to a location
- `limit` — max results (default 20, max 100)
- `offset` — pagination offset

```go
// handlers/search.go

func (h *Handler) Search(c *gin.Context) {
    q := c.Query("q")
    searchType := c.Query("type")
    locationID := c.Query("location_id")
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
    offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

    if limit > 100 {
        limit = 100
    }

    results := map[string]any{}
    query := "plainto_tsquery('english', ?)"

    if searchType == "" || searchType == "submissions" {
        var submissions []models.Submission
        stmt := h.db.Where("search_vector @@ plainto_tsquery('english', ?)", q).
            Order("ts_rank(search_vector, plainto_tsquery('english', ?)) DESC", q).
            Limit(limit).Offset(offset)
        if locationID != "" {
            stmt = stmt.Where("location_id = ?", locationID)
        }
        stmt.Find(&submissions)
        results["submissions"] = submissions
    }

    if searchType == "" || searchType == "profiles" {
        var profiles []models.Profile
        h.db.Where("search_vector @@ plainto_tsquery('english', ?)", q).
            Order("ts_rank(search_vector, plainto_tsquery('english', ?)) DESC", q).
            Limit(limit).Offset(offset).
            Find(&profiles)
        results["profiles"] = profiles
    }

    c.JSON(http.StatusOK, results)
}
```

#### Fuzzy matching with pg_trgm

For typo-tolerant "search as you type", use trigram similarity on specific columns:

```sql
-- Optional: add trigram indexes for fuzzy headline/name search
CREATE INDEX idx_submissions_headline_trgm ON submissions USING GIN (headline gin_trgm_ops);
CREATE INDEX idx_profiles_name_trgm ON profiles USING GIN (display_name gin_trgm_ops);
```

```go
// Fuzzy search example (for autocomplete)
var submissions []models.Submission
h.db.Where("similarity(headline, ?) > 0.3", q).
    Order("similarity(headline, ?) DESC", q).
    Limit(10).
    Find(&submissions)
```

---

## Cache Layer — Redis

All GET endpoints check Redis before hitting PostgreSQL. Cache hits return immediately. TTL is 30 minutes. Writes invalidate affected cache keys so subsequent reads see fresh data.

### Cache Keys

```
articles:{id}                          → single article
articles:list:{location_id}:{offset}   → paginated article list for a location
locations:{slug}                       → location data
search:{sha256(query_params)}          → search results
submissions:{id}                       → single submission
```

### Read Path

```
GET request → Redis GET key
  → hit:  return cached JSON
  → miss: query PostgreSQL → Redis SET key (TTL 30min) → return
```

### Write Path (Invalidation)

```
Write to PostgreSQL → Redis DEL affected keys
```

| Trigger | Invalidated Keys |
|---------|-----------------|
| Pipeline completes (article generated) | `articles:list:{location_id}:*`, `submissions:{id}` |
| Article published | `articles:{id}`, `articles:list:{location_id}:*` |
| Article updated | `articles:{id}`, `articles:list:{location_id}:*` |
| Location updated | `locations:{slug}` |

### Implementation (`internal/cache/cache.go`)

```go
package cache

import (
    "context"
    "encoding/json"
    "time"

    "github.com/redis/go-redis/v9"
)

const DefaultTTL = 30 * time.Minute

type Cache struct {
    client *redis.Client
    ttl    time.Duration
}

func New(redisURL string) (*Cache, error) {
    opt, err := redis.ParseURL(redisURL)
    if err != nil {
        return nil, err
    }
    client := redis.NewClient(opt)
    if err := client.Ping(context.Background()).Err(); err != nil {
        return nil, err
    }
    return &Cache{client: client, ttl: DefaultTTL}, nil
}

// Get retrieves a cached value. Returns false on miss.
func (c *Cache) Get(ctx context.Context, key string, dest any) bool {
    val, err := c.client.Get(ctx, key).Bytes()
    if err != nil {
        return false
    }
    return json.Unmarshal(val, dest) == nil
}

// Set stores a value with the default TTL.
func (c *Cache) Set(ctx context.Context, key string, value any) error {
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }
    return c.client.Set(ctx, key, data, c.ttl).Err()
}

// Delete removes one or more exact keys.
func (c *Cache) Delete(ctx context.Context, keys ...string) error {
    return c.client.Del(ctx, keys...).Err()
}

// DeletePattern removes all keys matching a glob pattern (e.g. "articles:list:uuid:*").
func (c *Cache) DeletePattern(ctx context.Context, pattern string) error {
    iter := c.client.Scan(ctx, 0, pattern, 0).Iterator()
    for iter.Next(ctx) {
        c.client.Del(ctx, iter.Val())
    }
    return iter.Err()
}
```

### Handler Usage Pattern

```go
func (h *Handler) GetArticle(c *gin.Context) {
    id := c.Param("id")
    key := "articles:" + id

    // Cache hit → return immediately
    var article models.Submission
    if h.cache.Get(c, key, &article) {
        c.JSON(http.StatusOK, article)
        return
    }

    // Cache miss → query DB → cache → return
    if err := h.db.First(&article, "id = ?", id).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
        return
    }
    h.cache.Set(c, key, article)
    c.JSON(http.StatusOK, article)
}

func (h *Handler) PublishArticle(c *gin.Context) {
    id := c.Param("id")

    // ... update DB ...

    // Invalidate cache
    h.cache.Delete(c, "articles:"+id)
    h.cache.DeletePattern(c, "articles:list:"+article.LocationID.String()+":*")
}
```

---

## Core Pipeline

### 1. Submission Intake (`POST /api/submissions`)

Accepts `multipart/form-data`:
- `audio` — audio file (webm/mp4a from browser MediaRecorder)
- `photos[]` — up to 5 image files
- `notes` — optional text
- `location_id` — UUID

Saves files to disk, creates a `submissions` row with status `pending`, returns immediately:

```json
{ "submission_id": "uuid-here", "status": "pending" }
```

### 2. Pipeline Stream (`GET /api/submissions/{id}/stream`)

SSE (Server-Sent Events) endpoint. The frontend opens this after the POST returns. The backend runs the pipeline and streams progress:

```
event: status
data: {"step": "transcribing", "message": "Transcribing audio..."}

event: status
data: {"step": "generating", "message": "Writing article..."}

event: status
data: {"step": "reviewing", "message": "Editorial review..."}

event: complete
data: {"article": {...}, "review": {...}}
```

On failure at any step:
```
event: error
data: {"step": "generating", "message": "Failed to generate article"}
```

Gin implementation uses `c.Stream()` with `c.SSEvent()` for SSE. The handler runs the pipeline and flushes events as each step completes.

```go
// handlers/submissions.go

func (h *Handler) StreamPipeline(c *gin.Context) {
    id := c.Param("id")

    c.Header("Content-Type", "text/event-stream")
    c.Header("Cache-Control", "no-cache")
    c.Header("Connection", "keep-alive")

    c.Stream(func(w io.Writer) bool {
        // Step 1: Transcribe
        c.SSEvent("status", gin.H{"step": "transcribing", "message": "Transcribing audio..."})
        c.Writer.Flush()
        transcript, err := h.transcriptionService.Transcribe(audioPath)
        if err != nil {
            c.SSEvent("error", gin.H{"step": "transcribing", "message": err.Error()})
            return false
        }

        // Step 2: Generate
        c.SSEvent("status", gin.H{"step": "generating", "message": "Writing article..."})
        c.Writer.Flush()
        article, err := h.generationService.Generate(transcript, notes, photoCount)
        if err != nil {
            c.SSEvent("error", gin.H{"step": "generating", "message": err.Error()})
            return false
        }

        // Step 3: Review
        c.SSEvent("status", gin.H{"step": "reviewing", "message": "Editorial review..."})
        c.Writer.Flush()
        review, err := h.reviewService.Review(article, transcript, notes)
        if err != nil {
            c.SSEvent("error", gin.H{"step": "reviewing", "message": err.Error()})
            return false
        }

        // Done
        c.SSEvent("complete", gin.H{"article": article, "review": review})
        return false // close stream
    })
}
```

### 3. Transcription (`services/transcription.go`)

ElevenLabs Speech-to-Text API via HTTP. Audio file in, transcript text out.

```go
// services/transcription.go

func (s *TranscriptionService) Transcribe(audioPath string) (string, error) {
    file, err := os.Open(audioPath)
    if err != nil {
        return "", err
    }
    defer file.Close()

    body := &bytes.Buffer{}
    writer := multipart.NewWriter(body)
    part, _ := writer.CreateFormFile("file", filepath.Base(audioPath))
    io.Copy(part, file)
    writer.WriteField("model_id", "scribe_v1")
    writer.Close()

    req, _ := http.NewRequest("POST", "https://api.elevenlabs.io/v1/speech-to-text", body)
    req.Header.Set("xi-api-key", s.apiKey)
    req.Header.Set("Content-Type", writer.FormDataContentType())

    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    var result struct {
        Text string `json:"text"`
    }
    json.NewDecoder(resp.Body).Decode(&result)
    return result.Text, nil
}
```

### 4. Article Generation (`services/generation.go`)

Single Claude call. System prompt defines the output format. User message contains the raw inputs.

```go
// services/generation.go

const systemPrompt = `You are a local news editor. Given raw inputs from a community
contributor (transcript, notes, photos described), write a professional local news
article. Output JSON:
{
  "headline": "...",
  "body": "... (markdown, 300-800 words)",
  "summary": "... (1-2 sentences)",
  "category": "council|schools|business|events|sports|community",
  "photo_captions": ["...", "..."]
}

Rules:
- Only use information from the provided inputs. Never invent facts or quotes.
- Attribute all quotes to the speaker from the transcript.
- Write in third person, neutral tone.
- Structure: lead paragraph, body with context, quotes, closing.`

func (s *GenerationService) Generate(transcript, notes string, photoCount int) (*Article, error) {
    message, err := s.client.Messages.New(context.Background(), anthropic.MessageNewParams{
        Model:     anthropic.ModelClaudeSonnet4_6,
        MaxTokens: 2000,
        System:    []anthropic.TextBlockParam{{Text: systemPrompt}},
        Messages: []anthropic.MessageParam{
            anthropic.NewUserMessage(
                anthropic.NewTextBlock(fmt.Sprintf(
                    "Transcript:\n%s\n\nNotes:\n%s\n\nPhotos attached: %d",
                    transcript, notes, photoCount,
                )),
            ),
        },
    })
    if err != nil {
        return nil, err
    }

    var article Article
    err = json.Unmarshal([]byte(message.Content[0].Text), &article)
    return &article, err
}
```

### 5. Quality Review (`services/review.go`)

Second Claude call. Compares generated article against source inputs.

```go
// services/review.go

const reviewPrompt = `You are an editorial reviewer. Compare the article against the
source transcript and notes. Return JSON:
{
  "score": 1-10,
  "flags": [
    {"type": "unverified_claim|missing_context|tone|attribution|factual",
     "text": "the specific text",
     "suggestion": "what to fix"}
  ],
  "approved": true/false
}

Flag if:
- A quote doesn't match the transcript
- A factual claim seems extreme or isn't in the source
- Important context is missing
- Tone is inappropriate for local news
- Anything potentially defamatory`

func (s *ReviewService) Review(article *Article, transcript, notes string) (*ReviewResult, error) {
    articleJSON, _ := json.Marshal(article)
    message, err := s.client.Messages.New(context.Background(), anthropic.MessageNewParams{
        Model:     anthropic.ModelClaudeSonnet4_6,
        MaxTokens: 1000,
        System:    []anthropic.TextBlockParam{{Text: reviewPrompt}},
        Messages: []anthropic.MessageParam{
            anthropic.NewUserMessage(
                anthropic.NewTextBlock(fmt.Sprintf(
                    "Article:\n%s\n\nSource transcript:\n%s\n\nSource notes:\n%s",
                    string(articleJSON), transcript, notes,
                )),
            ),
        },
    })
    if err != nil {
        return nil, err
    }

    var review ReviewResult
    err = json.Unmarshal([]byte(message.Content[0].Text), &review)
    return &review, err
}
```

### 6. Pipeline Orchestration

Two-request pattern with SSE for real-time progress:

```
1. POST /api/submissions  →  save files + DB row → return { submission_id }

2. GET /api/submissions/{id}/stream  →  SSE connection opens
   → transcribe audio (ElevenLabs)     → event: status "transcribing"
   → generate article (Claude)         → event: status "generating"
   → review article (Claude)           → event: status "reviewing"
   → save article to DB                → event: complete { article, review }
```

The full pipeline takes ~20-30 seconds. The frontend shows real-time step progress via the SSE stream. If any step fails, the submission is marked `failed` with an error message, and an error event is sent.

---

## Frontend — Vite + React

### Project Structure

```
frontend/
├── index.html
├── vite.config.ts
├── package.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── api/
│   │   └── client.ts           # fetch wrapper, base URL config
│   ├── pages/
│   │   ├── ContributePage.tsx   # record → upload → generate → review → publish
│   │   ├── NewspaperPage.tsx    # public reader view for a location
│   │   └── ArticlePage.tsx     # single article view
│   ├── components/
│   │   ├── AudioRecorder.tsx    # MediaRecorder API, stop/start, waveform
│   │   ├── PhotoUpload.tsx     # camera capture + file picker, preview grid
│   │   ├── ArticlePreview.tsx  # rendered article with headline, body, photos
│   │   ├── ReviewPanel.tsx     # flags, suggestions, score, approve button
│   │   ├── ArticleCard.tsx     # card for newspaper feed
│   │   └── LoadingPipeline.tsx # step indicator: transcribing → writing → reviewing
│   └── styles/
│       └── tokens.css          # CSS custom properties (design tokens)
```

### Setup

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install react-router-dom
npm install -D tailwindcss @tailwindcss/vite
```

### Key Components

**AudioRecorder** — uses the browser `MediaRecorder` API. Records WebM audio. Shows recording time. Returns a `Blob` on stop.

**ContributePage** — the main contributor flow. Four steps:
1. **Record/Write** — audio recorder + notes textarea
2. **Photos** — camera capture or file upload (up to 5)
3. **Generating** — POST to `/api/submissions`, then open SSE stream for real-time pipeline progress
4. **Review & Publish** — show generated article + review flags. Contributor can edit, then publish.

**NewspaperPage** — fetches `GET /api/locations/<slug>/articles`, renders a newspaper-style feed. Reverse chronological. Category tabs.

### API Client

```typescript
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function submitContribution(formData: FormData) {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: "POST",
    body: formData,  // multipart: audio, photos[], notes, location_id
  });
  return res.json();  // returns { submission_id, status }
}

// SSE stream for pipeline progress
export function streamPipeline(
  submissionId: string,
  onStatus: (step: string, message: string) => void,
  onComplete: (data: { article: Article, review: Review }) => void,
  onError: (step: string, message: string) => void,
) {
  const source = new EventSource(
    `${API_BASE}/api/submissions/${submissionId}/stream`
  );
  source.addEventListener("status", (e) => {
    const { step, message } = JSON.parse(e.data);
    onStatus(step, message);
  });
  source.addEventListener("complete", (e) => {
    const data = JSON.parse(e.data);
    onComplete(data);
    source.close();
  });
  source.addEventListener("error", (e) => {
    if (e.data) {
      const { step, message } = JSON.parse(e.data);
      onError(step, message);
    }
    source.close();
  });
  return source;  // caller can close early if needed
}

export async function publishArticle(articleId: string) {
  const res = await fetch(`${API_BASE}/api/articles/${articleId}/publish`, {
    method: "POST",
  });
  return res.json();
}

export async function getArticles(locationSlug: string) {
  const res = await fetch(`${API_BASE}/api/locations/${locationSlug}/articles`);
  return res.json();
}
```

### Routing

```
/                       → landing / location selector (hardcoded for hackathon)
/contribute             → ContributePage (the main flow)
/l/:locationSlug        → NewspaperPage (public reader view)
/l/:locationSlug/:id    → ArticlePage (single article)
```

---

## Dev Environment Setup

### Prerequisites

- Go 1.22+
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### Quick Start

```bash
# 1. Database + Redis
createdb localnews
redis-server                   # or brew services start redis

# 2. Backend
cd backend
cp .env.example .env          # fill in API keys
go mod download
go run cmd/server/main.go     # runs on :8000

# 3. Frontend
cd frontend
npm install
npm run dev                    # runs on :5173
```

### CORS

Configure in `middleware/cors.go`:
```go
import "github.com/gin-contrib/cors"

func SetupCORS(r *gin.Engine) {
    r.Use(cors.New(cors.Config{
        AllowOrigins: strings.Split(os.Getenv("ALLOWED_ORIGINS"), ","),
        AllowMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowHeaders: []string{"Origin", "Content-Type", "Authorization"},
    }))
}
```

---

## Hackathon Scope — What to Build vs Skip

### Build (MVP)

| Feature | Owner | Est. Hours |
|---------|-------|-----------|
| Gin skeleton + DB setup + GORM models | Backend dev | 2-3h |
| Audio recording component (MediaRecorder) | Frontend dev | 2-3h |
| ElevenLabs transcription + SSE pipeline | Backend dev | 2-3h |
| Photo upload (capture + file) | Frontend dev | 1-2h |
| Article generation (Claude) | Backend dev | 2-3h |
| Quality review (Claude) | Backend dev | 2-3h |
| Contributor flow UI (4-step) | Frontend dev | 3-4h |
| Newspaper reader page | Frontend dev | 3-4h |
| Article detail page | Frontend dev | 1-2h |
| Pipeline loading states | Frontend dev | 1h |
| Demo content + Samu reporting | Everyone | 2-3h |
| Pitch prep | Everyone | 3-4h |
| **Total** | | **~24-34h** |

### Skip (Post-Hackathon)

- User authentication / accounts
- Ad system
- Moderation dashboard
- Multi-location admin
- Native mobile app
- Push notifications
- Comment system
- Background task queue

---

## Task Split (3-Person Team)

**Person A — Backend Core**
- Gin app, GORM models, DB migrations
- Submission endpoint (file upload + save)
- ElevenLabs STT integration + SSE stream endpoint
- Claude generation + review services
- Publish endpoint

**Person B — Frontend**
- Vite + React setup, routing, Tailwind
- AudioRecorder component
- PhotoUpload component
- ContributePage (full 4-step flow)
- NewspaperPage + ArticlePage

**Person C — Integration + Demo + Design**
- API client, connect frontend ↔ backend
- Loading states, error handling
- Newspaper visual design and layout
- Demo content: Samu's reporting run
- Pitch deck and demo video

All three work in parallel from hour one. Backend exposes endpoints, frontend builds against mock data, then connect.

---

## API Cost Estimate (Hackathon)

| Service | Per Article | 50 Articles (demo) |
|---------|-----------|-------------------|
| ElevenLabs STT (2 min audio) | ~$0.01 | $0.50 |
| Claude Sonnet — generation | ~$0.01-0.03 | $0.50-1.50 |
| Claude Sonnet — review | ~$0.005-0.015 | $0.25-0.75 |
| **Total** | ~$0.03-0.06 | **~$1.50-3.00** |

Negligible. No need to worry about API costs during the hackathon.

---

## Deployment (Demo Day)

For the hackathon demo, keep it simple:

- **Backend:** `go build -o server cmd/server/main.go` → run the binary, or deploy to Railway / Render / Fly.io
- **Frontend:** `npm run build` → serve from the same machine, or Vercel
- **Database:** Local PostgreSQL or Railway managed Postgres
- **Domain:** Optional — a free `.vercel.app` or `.fly.dev` subdomain works for judges scanning a QR code

Production deployment is a post-hackathon concern.
