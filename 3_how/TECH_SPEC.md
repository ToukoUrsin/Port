# Local News Platform — Technical Specification

**Stack:** Go (Gin) · PostgreSQL · Redis · Vite + React · ElevenLabs STT · Gemini API
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
             │  POST /api/submissions/{id}/publish   │
             │  GET  /api/search?q=...&type=...      │
             │  GET  /api/locations/{slug}/articles  │
             └──────┬───────┬───────┬───────────────┘
                    │       │       │
          ┌─────────┘       │       └─────────┐
          v                 v                  v
   ┌────────────┐   ┌─────────────┐   ┌──────────────────┐
   │ PostgreSQL │   │ Gemini API  │   │ ElevenLabs STT   │
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
│   │   ├── base.go              # Timestamps, JSONB[T] generic wrapper
│   │   ├── constants.go         # Status, error, tag, entity category constants
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
│   │   ├── search.go            # GET full-text + semantic search
│   │   └── locations.go         # GET location newspaper data
│   ├── services/
│   │   ├── transcription.go     # ElevenLabs STT integration
│   │   ├── generation.go        # Article generation interface + stub
│   │   ├── gemini_generation.go # Gemini API — article generation
│   │   ├── review.go            # Review interface + stub
│   │   ├── gemini_review.go     # Gemini API — editorial quality review
│   │   ├── media.go             # File upload handling
│   │   ├── chunker.go           # Semantic-aware block chunking
│   │   ├── embedding.go         # Gemini embedding + pgvector storage
│   │   └── reranker.go          # ONNX cross-encoder reranking (CPU)
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
    github.com/gin-gonic/gin              v1.10+
    github.com/gin-contrib/cors            v1.7+
    gorm.io/gorm                           v1.25+
    gorm.io/driver/postgres                v1.5+
    github.com/redis/go-redis/v9           v9.7+
    github.com/joho/godotenv               v1.5+
    github.com/google/uuid                 v1.6+
    google.golang.org/genai                latest    // Gemini API (generation, review, embeddings)
    github.com/pgvector/pgvector-go        latest    // pgvector Go bindings
    github.com/yalue/onnxruntime_go        latest    // ONNX Runtime (cross-encoder reranker)
)
```

### Key Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/localnews
GEMINI_API_KEY=...
GENERATION_MODEL=gemini-3.1-pro
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
    slug              VARCHAR(100) UNIQUE NOT NULL,
    level             SMALLINT NOT NULL,
    parent_id         UUID REFERENCES locations(id),
    path              TEXT NOT NULL,
    description       TEXT,
    is_active         BOOLEAN DEFAULT TRUE,

    -- Coordinates (center point of the location)
    lat               DOUBLE PRECISION,
    lng               DOUBLE PRECISION,

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
    profile_name    VARCHAR(100) UNIQUE NOT NULL,
    email           VARCHAR(320) UNIQUE NOT NULL,
    password_hash   BYTEA,                        -- NULL for OAuth-only accounts
    location_id     UUID REFERENCES locations(id),
    continent_id    UUID REFERENCES locations(id),
    country_id      UUID REFERENCES locations(id),
    region_id       UUID REFERENCES locations(id),
    city_id         UUID REFERENCES locations(id),
    role            SMALLINT DEFAULT 0,
    permissions     BIGINT DEFAULT 0,
    tags            BIGINT DEFAULT 0,
    public          BOOLEAN DEFAULT FALSE,
    is_adult        BOOLEAN DEFAULT FALSE,
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
    owner_id        UUID REFERENCES profiles(id) NOT NULL,
    location_id     UUID REFERENCES locations(id) NOT NULL,
    continent_id    UUID REFERENCES locations(id),
    country_id      UUID REFERENCES locations(id),
    region_id       UUID REFERENCES locations(id),
    city_id         UUID REFERENCES locations(id),
    title           VARCHAR(300) NOT NULL DEFAULT '',
    description     TEXT NOT NULL DEFAULT '',
    tags            BIGINT DEFAULT 0,
    status          SMALLINT DEFAULT 0,
    error           SMALLINT DEFAULT 0,
    views           INTEGER DEFAULT 0,
    share_count     INTEGER DEFAULT 0,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    reactions       JSONB DEFAULT '{}',
    meta            JSONB DEFAULT '{}',
    search_vector   TSVECTOR,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_location ON submissions (location_id);
CREATE INDEX idx_submissions_continent ON submissions (continent_id);
CREATE INDEX idx_submissions_country ON submissions (country_id);
CREATE INDEX idx_submissions_region ON submissions (region_id);
CREATE INDEX idx_submissions_city ON submissions (city_id);
CREATE INDEX idx_submissions_coords ON submissions (lat, lng) WHERE lat IS NOT NULL;
CREATE INDEX idx_submissions_status ON submissions (status);
CREATE INDEX idx_submissions_search ON submissions USING GIN (search_vector);

CREATE TABLE submission_contributors (
    submission_id   UUID REFERENCES submissions(id) NOT NULL,
    profile_id      UUID REFERENCES profiles(id) NOT NULL,
    role            SMALLINT DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (submission_id, profile_id)
);

CREATE INDEX idx_sub_contrib_profile ON submission_contributors (profile_id);

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

CREATE TABLE advertisers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(300) NOT NULL,
    status          SMALLINT DEFAULT 0,         -- 0=pending, 1=active, 2=suspended
    permissions     BIGINT DEFAULT 0,
    tags            BIGINT DEFAULT 0,           -- targeting categories
    meta            JSONB DEFAULT '{}',         -- contact, billing, logo, etc.
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE embeddings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id       UUID NOT NULL,
    entity_category SMALLINT NOT NULL,
    chunk_index     SMALLINT NOT NULL DEFAULT 0,
    chunk_text      TEXT NOT NULL,
    embedding       VECTOR(768) NOT NULL
);

CREATE INDEX idx_embeddings_entity ON embeddings (entity_id, entity_category);
CREATE INDEX idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops);
```

### Go Structs (GORM Models)

#### Base Types (`internal/models/base.go`)

```go
package models

import (
    "database/sql/driver"
    "encoding/json"
    "fmt"
    "time"
)

type Timestamps struct {
    CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

// JSONB[T] — typed wrapper for PostgreSQL JSONB columns.
// Implements sql.Scanner, driver.Valuer, and JSON marshal/unmarshal.
type JSONB[T any] struct{ V T }

func (j JSONB[T]) Value() (driver.Value, error) {
    return json.Marshal(j.V)
}

func (j *JSONB[T]) Scan(src any) error {
    if src == nil {
        return nil
    }
    b, ok := src.([]byte)
    if !ok {
        return fmt.Errorf("expected []byte, got %T", src)
    }
    return json.Unmarshal(b, &j.V)
}

func (j JSONB[T]) MarshalJSON() ([]byte, error) {
    return json.Marshal(j.V)
}

func (j *JSONB[T]) UnmarshalJSON(data []byte) error {
    return json.Unmarshal(data, &j.V)
}
```

#### Constants (`internal/models/constants.go`)

```go
package models

// --- Submission status ---

const (
    StatusDraft        int16 = 0 // just created, raw files saved
    StatusTranscribing int16 = 1 // audio being transcribed
    StatusGenerating   int16 = 2 // Gemini generating article
    StatusReviewing    int16 = 3 // Gemini reviewing article
    StatusReady        int16 = 4 // pipeline complete, awaiting publish decision
    StatusPublished    int16 = 5 // publicly visible
    StatusArchived     int16 = 6 // hidden by owner or editor
)

// --- Submission error codes (0 = no error) ---

const (
    ErrNone          int16 = 0
    ErrTranscription int16 = 1 // ElevenLabs call failed
    ErrGeneration    int16 = 2 // Gemini generation failed
    ErrReview        int16 = 3 // Gemini review failed
    ErrModeration    int16 = 4 // flagged by moderation
)

// --- Profile / Submission category tags (bitmask) ---
// Each bit represents a general content category.
// Used on both profiles.tags (interests) and submissions.tags (article category).

const (
    TagCouncil   int64 = 1 << 0  // local government, council meetings
    TagSchools   int64 = 1 << 1  // education, school boards
    TagBusiness  int64 = 1 << 2  // local business, economy
    TagEvents    int64 = 1 << 3  // community events, festivals
    TagSports    int64 = 1 << 4  // local sports
    TagCommunity int64 = 1 << 5  // neighborhood, volunteer, civic
    TagCulture   int64 = 1 << 6  // arts, music, heritage
    TagSafety    int64 = 1 << 7  // police, fire, public safety
    TagHealth    int64 = 1 << 8  // health, hospitals, public health
    TagEnviron   int64 = 1 << 9  // environment, parks, weather
)

// --- Entity categories (polymorphic type discriminator) ---
// Used in files.entity_category, entity_tags.entity_category, embeddings.entity_category

const (
    EntitySubmission int16 = 1
    EntityProfile    int16 = 2
    EntityLocation   int16 = 3
)

// --- Follow target types ---

const (
    FollowLocation int16 = 1
    FollowProfile  int16 = 2
)

// --- Reply status ---

const (
    ReplyVisible  int16 = 0
    ReplyHidden   int16 = 1 // hidden by moderator
    ReplyDeleted  int16 = 2 // soft-deleted by author
)

// --- Location level ---

const (
    LevelContinent int16 = 0
    LevelCountry   int16 = 1
    LevelRegion    int16 = 2 // state, province, län
    LevelCity      int16 = 3
)
```

#### Slug Convention

Slugs are URL-safe identifiers derived from the entity name. Generation rule:

1. Lowercase the name
2. Replace spaces and non-alphanumeric characters with hyphens
3. Collapse consecutive hyphens into one
4. Trim leading/trailing hyphens
5. For locations, if a duplicate exists at the same level, append the parent slug: `springfield-il`, `springfield-oh`

Examples: `"Port 2026"` → `port-2026`, `"Gävle kommun"` → `gavle-kommun`, `"Council & Budget"` → `council-budget`

#### Location (`internal/models/location.go`)

```go
type LocationMeta struct {
    // Geographic
    AreaKm2    float64 `json:"area_km2,omitempty"`
    Timezone   string  `json:"timezone,omitempty"`

    // Descriptive
    About      string   `json:"about,omitempty"`
    Highlights []string `json:"highlights,omitempty"`
    Population int      `json:"population,omitempty"`
    PostalCode string   `json:"postal_code,omitempty"`

    // Media
    CoverImage string `json:"cover_image,omitempty"`
    Icon       string `json:"icon,omitempty"`
}

type Location struct {
    ID               uuid.UUID           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    Name             string              `gorm:"type:varchar(200);not null" json:"name"`
    Slug             string              `gorm:"type:varchar(100);uniqueIndex;not null" json:"slug"`
    Level            int16               `gorm:"not null" json:"level"`
    ParentID         *uuid.UUID          `gorm:"type:uuid" json:"parent_id,omitempty"`
    Path             string              `gorm:"type:text;not null" json:"path"`
    Description      *string             `gorm:"type:text" json:"description,omitempty"`
    IsActive         bool                `gorm:"default:true" json:"is_active"`
    Lat              *float64            `json:"lat,omitempty"`
    Lng              *float64            `json:"lng,omitempty"`
    ArticleCount     int                 `gorm:"default:0" json:"article_count"`
    SubmissionCount  int                 `gorm:"default:0" json:"submission_count"`
    ContributorCount int                 `gorm:"default:0" json:"contributor_count"`
    FollowerCount    int                 `gorm:"default:0" json:"follower_count"`
    LastActivityAt   *time.Time          `json:"last_activity_at,omitempty"`
    TrendingScore    float32             `gorm:"default:0" json:"trending_score"`
    Meta             JSONB[LocationMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
    Timestamps
}
```

#### Profile + Auth (`internal/models/profile.go`)

```go
type ProfileMeta struct {
    // Identity
    FirstName    string   `json:"first_name,omitempty"`
    LastName     string   `json:"last_name,omitempty"`
    Avatar       string   `json:"avatar,omitempty"`
    Bio          string   `json:"bio,omitempty"`
    About        string   `json:"about,omitempty"`
    Occupation   string   `json:"occupation,omitempty"`
    Organization string   `json:"organization,omitempty"`
    Tags         []string `json:"tags,omitempty"`

    // Contact / links
    Phone   string            `json:"phone,omitempty"`
    Website string            `json:"website,omitempty"`
    Links   map[string]string `json:"links,omitempty"`

    // Activity
    LastLoginAt *time.Time `json:"last_login_at,omitempty"`

    // Preferences
    Language    string `json:"language,omitempty"`
    NotifyEmail bool   `json:"notify_email,omitempty"`
    NotifyPush  bool   `json:"notify_push,omitempty"`
}

type Profile struct {
    ID           uuid.UUID          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    ProfileName  string             `gorm:"type:varchar(100);uniqueIndex;not null" json:"profile_name"`
    Email        string             `gorm:"type:varchar(320);uniqueIndex;not null" json:"email"`
    PasswordHash []byte             `gorm:"type:bytea" json:"-"`            // nil for OAuth-only accounts
    LocationID   *uuid.UUID         `gorm:"type:uuid;index" json:"location_id,omitempty"`
    ContinentID  *uuid.UUID         `gorm:"type:uuid;index" json:"continent_id,omitempty"`
    CountryID    *uuid.UUID         `gorm:"type:uuid;index" json:"country_id,omitempty"`
    RegionID     *uuid.UUID         `gorm:"type:uuid;index" json:"region_id,omitempty"`
    CityID       *uuid.UUID         `gorm:"type:uuid;index" json:"city_id,omitempty"`
    Role         int16              `gorm:"default:0;index" json:"role"`
    Permissions  int64              `gorm:"default:0" json:"permissions"`
    Tags         int64              `gorm:"default:0" json:"tags"`
    Public       bool               `gorm:"default:false" json:"public"`
    IsAdult      bool               `gorm:"default:false" json:"is_adult"`
    Meta         JSONB[ProfileMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
    SearchVector string             `gorm:"type:tsvector" json:"-"`
    Timestamps
}

type RefreshTokenMeta struct {
    Device    string `json:"device,omitempty"`
    IP        string `json:"ip,omitempty"`
    UserAgent string `json:"user_agent,omitempty"`
}

type RefreshToken struct {
    ID        uuid.UUID               `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    ProfileID uuid.UUID               `gorm:"type:uuid;not null;index" json:"profile_id"`
    TokenHash []byte                  `gorm:"type:bytea;not null" json:"-"`
    ExpiresAt time.Time               `gorm:"not null;index" json:"expires_at"`
    Revoked   bool                    `gorm:"default:false" json:"revoked"`
    Meta      JSONB[RefreshTokenMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
    CreatedAt time.Time               `gorm:"autoCreateTime" json:"created_at"`
}

type OAuthAccountMeta struct {
    AccessToken  string     `json:"access_token,omitempty"`
    RefreshToken string     `json:"refresh_token,omitempty"`
    Scopes       string     `json:"scopes,omitempty"`
    ExpiresAt    *time.Time `json:"expires_at,omitempty"`
    DisplayName  string     `json:"display_name,omitempty"`
    AvatarURL    string     `json:"avatar_url,omitempty"`
}

type OAuthAccount struct {
    ID          uuid.UUID                `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    ProfileID   uuid.UUID                `gorm:"type:uuid;not null;index" json:"profile_id"`
    Provider    int16                    `gorm:"not null;uniqueIndex:idx_oauth_provider_uid" json:"provider"`
    ProviderUID string                   `gorm:"type:varchar(300);not null;uniqueIndex:idx_oauth_provider_uid" json:"provider_uid"`
    Meta        JSONB[OAuthAccountMeta]  `gorm:"type:jsonb;default:'{}'" json:"meta"`
    Timestamps
}
```

#### Submission (`internal/models/submission.go`)

```go
type Block struct {
    Type    string `json:"type"`              // "text", "heading", "image", "audio", "quote", "video"
    Content string `json:"content,omitempty"`  // text/markdown content
    Src     string `json:"src,omitempty"`      // media path for image/audio/video
    Caption string `json:"caption,omitempty"`  // media caption
    Alt     string `json:"alt,omitempty"`      // image alt text
    Level   int    `json:"level,omitempty"`    // heading level (1-3)
    Author  string `json:"author,omitempty"`   // quote attribution
}

type ReviewFlag struct {
    Type       string `json:"type"`       // unverified_claim, missing_context, tone, attribution, factual
    Text       string `json:"text"`
    Suggestion string `json:"suggestion"`
}

type ReviewResult struct {
    Score    int          `json:"score"`
    Flags    []ReviewFlag `json:"flags"`
    Approved bool         `json:"approved"`
}

type EditEntry struct {
    EditedBy uuid.UUID `json:"edited_by"`
    EditedAt time.Time `json:"edited_at"`
    Field    string    `json:"field"`
    Previous string    `json:"previous"`
}

type SubmissionMeta struct {
    // Content blocks
    Blocks []Block `json:"blocks,omitempty"`

    // AI pipeline output
    Review   *ReviewResult `json:"review,omitempty"`
    Summary  string        `json:"summary,omitempty"`
    Category string        `json:"category,omitempty"`

    // AI pipeline metadata
    Model       string     `json:"model,omitempty"`
    GeneratedAt *time.Time `json:"generated_at,omitempty"`

    // Content metadata
    Slug        string      `json:"slug,omitempty"`
    FeaturedImg string      `json:"featured_img,omitempty"`
    Sources     []string    `json:"sources,omitempty"`
    EventDate   string      `json:"event_date,omitempty"`
    PlaceName   string      `json:"place_name,omitempty"`
    CoAuthors   []uuid.UUID `json:"co_authors,omitempty"`

    // Publishing
    PublishedAt *time.Time `json:"published_at,omitempty"`
    PublishedBy *uuid.UUID `json:"published_by,omitempty"`
    ScheduledAt *time.Time `json:"scheduled_at,omitempty"`

    // Moderation
    Flagged    bool   `json:"flagged,omitempty"`
    FlagReason string `json:"flag_reason,omitempty"`

    // Edit tracking
    EditHistory []EditEntry `json:"edit_history,omitempty"`
}

type Submission struct {
    ID           uuid.UUID              `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    OwnerID      uuid.UUID              `gorm:"type:uuid;not null" json:"owner_id"`
    LocationID   uuid.UUID              `gorm:"type:uuid;not null;index" json:"location_id"`
    ContinentID  *uuid.UUID             `gorm:"type:uuid;index" json:"continent_id,omitempty"`
    CountryID    *uuid.UUID             `gorm:"type:uuid;index" json:"country_id,omitempty"`
    RegionID     *uuid.UUID             `gorm:"type:uuid;index" json:"region_id,omitempty"`
    CityID       *uuid.UUID             `gorm:"type:uuid;index" json:"city_id,omitempty"`
    Lat          *float64               `json:"lat,omitempty"`
    Lng          *float64               `json:"lng,omitempty"`
    Title        string                 `gorm:"type:varchar(300);not null;default:''" json:"title"`
    Description  string                 `gorm:"type:text;not null;default:''" json:"description"`
    Tags         int64                  `gorm:"default:0" json:"tags"`
    Status       int16                  `gorm:"default:0;index" json:"status"`
    Error        int16                  `gorm:"default:0" json:"error"`
    Views        int                    `gorm:"default:0" json:"views"`
    ShareCount   int                    `gorm:"default:0" json:"share_count"`
    Reactions    JSONB[map[string]int]  `gorm:"type:jsonb;default:'{}'" json:"reactions"`
    Meta         JSONB[SubmissionMeta]  `gorm:"type:jsonb;default:'{}'" json:"meta"`
    SearchVector string                 `gorm:"type:tsvector" json:"-"`
    Timestamps
}

type SubmissionContributor struct {
    SubmissionID uuid.UUID `gorm:"type:uuid;not null;primaryKey" json:"submission_id"`
    ProfileID    uuid.UUID `gorm:"type:uuid;not null;primaryKey;index:idx_sub_contrib_profile" json:"profile_id"`
    Role         int16     `gorm:"default:0" json:"role"`
    CreatedAt    time.Time `gorm:"autoCreateTime" json:"created_at"`
}
```

#### File (`internal/models/file.go`)

```go
type FileMeta struct {
    MimeType     string `json:"mime_type,omitempty"`
    Width        int    `json:"width,omitempty"`
    Height       int    `json:"height,omitempty"`
    DurationSecs int    `json:"duration_secs,omitempty"`
    Thumbnail    string `json:"thumbnail,omitempty"`
}

type File struct {
    ID             uuid.UUID       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    EntityID       uuid.UUID       `gorm:"type:uuid;not null" json:"entity_id"`
    EntityCategory int16           `gorm:"not null" json:"entity_category"`
    SubmissionID   uuid.UUID       `gorm:"type:uuid;not null;index" json:"submission_id"`
    ContributorID  uuid.UUID       `gorm:"type:uuid;not null" json:"contributor_id"`
    FileType       int16           `gorm:"not null;index" json:"file_type"`
    Name           string          `gorm:"type:varchar(300);not null" json:"name"`
    Size           int64           `gorm:"not null" json:"size"`
    UploadedAt     time.Time       `gorm:"autoCreateTime" json:"uploaded_at"`
    Meta           JSONB[FileMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
}
```

#### Tag (`internal/models/tag.go`)

```go
type Tag struct {
    ID        uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    Name      string    `gorm:"type:varchar(100);not null" json:"name"`
    Slug      string    `gorm:"type:varchar(100);uniqueIndex;not null" json:"slug"`
    CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
}

type EntityTag struct {
    EntityID       uuid.UUID `gorm:"type:uuid;primaryKey" json:"entity_id"`
    EntityCategory int16     `gorm:"not null;index:idx_entity_tags_entity" json:"entity_category"`
    TagID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"tag_id"`
}
```

#### Follow (`internal/models/follow.go`)

```go
type Follow struct {
    ID         uuid.UUID `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    ProfileID  uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_follows_unique;index" json:"profile_id"`
    TargetID   uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_follows_unique" json:"target_id"`
    TargetType int16     `gorm:"not null;uniqueIndex:idx_follows_unique" json:"target_type"`
    CreatedAt  time.Time `gorm:"autoCreateTime" json:"created_at"`
}
```

#### Reply (`internal/models/reply.go`)

```go
type ReplyMeta struct {
    Reactions  map[string]int `json:"reactions,omitempty"`
    EditedAt   *time.Time     `json:"edited_at,omitempty"`
    EditedBody string         `json:"edited_body,omitempty"`
}

type Reply struct {
    ID           uuid.UUID        `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    SubmissionID uuid.UUID        `gorm:"type:uuid;not null;index" json:"submission_id"`
    ProfileID    uuid.UUID        `gorm:"type:uuid;not null;index" json:"profile_id"`
    ParentID     *uuid.UUID       `gorm:"type:uuid;index" json:"parent_id,omitempty"`
    Body         string           `gorm:"type:text;not null" json:"body"`
    Status       int16            `gorm:"default:0" json:"status"`
    Meta         JSONB[ReplyMeta] `gorm:"type:jsonb;default:'{}'" json:"meta"`
    CreatedAt    time.Time        `gorm:"autoCreateTime" json:"created_at"`
}
```

#### Advertiser (`internal/models/advertiser.go`)

```go
type AdvertiserMeta struct {
    // Contact
    ContactName  string `json:"contact_name,omitempty"`
    ContactEmail string `json:"contact_email,omitempty"`
    ContactPhone string `json:"contact_phone,omitempty"`

    // Branding
    Logo        string `json:"logo,omitempty"`
    Website     string `json:"website,omitempty"`
    Description string `json:"description,omitempty"`

    // Billing
    BillingEmail   string `json:"billing_email,omitempty"`
    BillingAddress string `json:"billing_address,omitempty"`
    VatID          string `json:"vat_id,omitempty"`
}

type Advertiser struct {
    ID          uuid.UUID              `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    Name        string                 `gorm:"type:varchar(300);not null" json:"name"`
    Status      int16                  `gorm:"default:0" json:"status"`
    Permissions int64                  `gorm:"default:0" json:"permissions"`
    Tags        int64                  `gorm:"default:0" json:"tags"`
    Meta        JSONB[AdvertiserMeta]  `gorm:"type:jsonb;default:'{}'" json:"meta"`
    Timestamps
}
```

#### Embedding (`internal/models/embedding.go`)

```go
import "github.com/pgvector/pgvector-go"

type Embedding struct {
    ID             uuid.UUID       `gorm:"type:uuid;primaryKey;default:gen_random_uuid()" json:"id"`
    EntityID       uuid.UUID       `gorm:"type:uuid;not null;index:idx_embeddings_entity" json:"entity_id"`
    EntityCategory int16           `gorm:"not null;index:idx_embeddings_entity" json:"entity_category"`
    ChunkIndex     int16           `gorm:"not null;default:0" json:"chunk_index"`
    ChunkText      string          `gorm:"type:text;not null" json:"chunk_text"`
    Vector         pgvector.Vector `gorm:"column:embedding;type:vector(768);not null" json:"embedding"`
}
```

### Migrations

GORM AutoMigrate handles schema creation during development. For production, use raw SQL migration files in `backend/migrations/` applied with a migration tool like `golang-migrate/migrate` or manual `psql` execution. The full-text search triggers and extensions (below) must be applied via raw SQL since GORM doesn't manage triggers.

### Full-Text Search

PostgreSQL full-text search with precalculated `tsvector` columns and GIN indexes for efficient keyword search. Extension required:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- trigram fuzzy matching
```

#### How it works

1. **Write time** — a `BEFORE INSERT OR UPDATE` trigger fires when the row changes. The trigger extracts raw text from the source fields (for submissions: iterates `meta->'blocks'` JSONB array and concatenates each block's `content` field; for profiles: reads `profile_name` and `email`). PostgreSQL's `to_tsvector('english', text)` then normalizes this text into lexemes: tokenize into words → lowercase → remove stop words ("the", "and", "is") → stem to root forms ("running" → "run", "cities" → "citi"). The result is stored in the `search_vector TSVECTOR` column. Blocks are weighted: heading blocks get weight A (highest rank), all other block types get weight B, so matches in titles rank higher.
2. **GIN index** — a Generalized Inverted Index maps each lexeme to the set of row IDs containing it. Searching for a term is an index lookup, not a table scan. The `@@` operator checks if a query matches a vector in O(1) per term.
3. **Query time** — the user's search string goes through the same normalization via `plainto_tsquery('english', query)`. PostgreSQL intersects the matching row sets from the GIN index and ranks results using `ts_rank()`, which scores based on lexeme frequency, weight, and proximity.

#### Triggers

```sql
-- Submissions: index title (weight A), description + heading blocks (weight B), other blocks (weight C)
CREATE FUNCTION submissions_search_update() RETURNS trigger AS $$
DECLARE
  headings TEXT := '';
  body_text TEXT := '';
BEGIN
  SELECT
    coalesce(string_agg(CASE WHEN b->>'type' = 'heading' THEN b->>'content' END, ' '), ''),
    coalesce(string_agg(CASE WHEN b->>'type' != 'heading' THEN b->>'content' END, ' '), '')
  INTO headings, body_text
  FROM jsonb_array_elements(coalesce(NEW.meta->'blocks', '[]'::jsonb)) AS b
  WHERE b->>'content' IS NOT NULL;

  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '') || ' ' || headings), 'B') ||
    setweight(to_tsvector('english', body_text), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_submissions_search
  BEFORE INSERT OR UPDATE OF title, description, meta
  ON submissions
  FOR EACH ROW EXECUTE FUNCTION submissions_search_update();

-- Profiles: index profile_name and email
CREATE FUNCTION profiles_search_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.profile_name, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.email, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_search
  BEFORE INSERT OR UPDATE OF profile_name, email
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
-- Trigram indexes for fuzzy search
CREATE INDEX idx_profiles_name_trgm ON profiles USING GIN (profile_name gin_trgm_ops);
CREATE INDEX idx_submissions_title_trgm ON submissions USING GIN (title gin_trgm_ops);
```

```go
// Fuzzy search example (for autocomplete)
var submissions []models.Submission
h.db.Where("similarity(title, ?) > 0.3", q).
    Order("similarity(title, ?) DESC", q).
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

        // Step 4: Embed
        c.SSEvent("status", gin.H{"step": "embedding", "message": "Indexing for search..."})
        c.Writer.Flush()
        chunks := services.ChunkBlocks(article.Blocks, services.ChunkConfig{})
        if err := h.embeddingService.EmbedChunks(c, submissionID, models.EntitySubmission, chunks); err != nil {
            // Non-fatal — log but don't fail the pipeline
            log.Printf("embedding failed for %s: %v", submissionID, err)
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

Single Gemini call with JSON structured output. System prompt defines the output format. User message contains the raw inputs.

Uses `ResponseMIMEType: "application/json"` for guaranteed valid JSON output. See `backend/internal/services/gemini_generation.go` for the full implementation with system prompt and temperature settings.

### 5. Quality Review (`services/review.go`)

Second Gemini call. Compares generated article against source inputs.

Uses the same model as generation with a lower temperature (0.2) for more consistent editorial judgment. See `backend/internal/services/gemini_review.go` for the full implementation.

### 6. Pipeline Orchestration

Two-request pattern with SSE for real-time progress:

```
1. POST /api/submissions  →  save files + DB row → return { submission_id }

2. GET /api/submissions/{id}/stream  →  SSE connection opens
   → transcribe audio (ElevenLabs)     → event: status "transcribing"
   → generate article (Gemini)         → event: status "generating"
   → review article (Gemini)           → event: status "reviewing"
   → save article to DB                → event: complete { article, review }
```

The full pipeline takes ~20-30 seconds. The frontend shows real-time step progress via the SSE stream. If any step fails, the submission is marked `failed` with an error message, and an error event is sent.

---

## Embedding System — Semantic Search & Similarity

Complements the full-text search with vector similarity for "find articles like this" and semantic queries where keyword matching fails. Uses Gemini's embedding model via the Google GenAI Go SDK, with a two-stage retrieval pipeline: fast vector recall followed by cross-encoder reranking for precision.

### Dependencies

```
// go.mod
google.golang.org/genai              latest   // Gemini API (embeddings + cross-encoder reranking)
github.com/pgvector/pgvector-go      latest   // pgvector Go bindings
```

### Environment Variables

```bash
GEMINI_API_KEY=...                     # Google AI API key
EMBEDDING_MODEL=gemini-embedding-001   # default model
EMBEDDING_DIMENSIONS=768               # 768 | 1536 | 3072 (768 = good quality/storage tradeoff)
```

### Architecture

```
Submission created/updated
    │
    ▼
Semantic Chunker (split blocks into meaningful chunks)
    │
    ▼
Gemini EmbedContent API (batch embed all chunks)
    │
    ▼
pgvector (store + index)

Query time:
    User query → embed query → pgvector ANN recall (top 50) → cross-encoder rerank (top 10) → return
```

### Semantic-Aware Chunking (`internal/services/chunker.go`)

Content blocks from `SubmissionMeta.Blocks` are not chunked naively by character count. The chunker respects content boundaries:

```go
package services

// Chunk represents a semantically coherent piece of content.
type Chunk struct {
    Index int    // position in the original document
    Text  string // chunk content
    Type  string // source block type: "heading+body", "quote", "text"
}

// ChunkConfig controls chunking behavior.
type ChunkConfig struct {
    MaxTokens   int // soft limit per chunk (default 300)
    OverlapSent int // sentence overlap between adjacent chunks (default 1)
}

// ChunkBlocks splits submission blocks into semantic chunks.
func ChunkBlocks(blocks []models.Block, cfg ChunkConfig) []Chunk
```

**Chunking rules:**

1. **Heading + following body** — a heading block and the text blocks immediately after it form one chunk. This preserves "section" semantics. If the combined text exceeds `MaxTokens`, split the body at sentence boundaries.
2. **Quotes** — each quote block is its own chunk (attribution + quote text together). Quotes are short and semantically self-contained.
3. **Consecutive text blocks** — merge until `MaxTokens` is reached, then split at the nearest sentence boundary. Adjacent chunks overlap by `OverlapSent` sentences so that context isn't lost at split points.
4. **Media blocks** (image, audio, video) — skip for embedding. Captions and alt text are included as part of the surrounding text chunk.
5. **Minimum chunk size** — chunks under 20 tokens are merged with the previous chunk rather than embedded standalone (avoids noisy short vectors).

**Example:** A submission with `[heading, text, text, quote, text, heading, text]` blocks produces:

```
Chunk 0: "heading + text + text"     (section 1, merged)
Chunk 1: "quote with attribution"    (standalone)
Chunk 2: "text"                      (bridge paragraph)
Chunk 3: "heading + text"            (section 2)
```

### Embedding Service (`internal/services/embedding.go`)

```go
package services

import (
    "context"
    "google.golang.org/genai"
    "github.com/pgvector/pgvector-go"
)

type EmbeddingService struct {
    client     *genai.Client
    model      string  // "gemini-embedding-001"
    dimensions int32   // 768
    db         *gorm.DB
}

func NewEmbeddingService(apiKey string, model string, dims int32, db *gorm.DB) (*EmbeddingService, error) {
    client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
        APIKey:  apiKey,
        Backend: genai.BackendGeminiAPI,
    })
    if err != nil {
        return nil, err
    }
    return &EmbeddingService{client: client, model: model, dimensions: dims, db: db}, nil
}

// EmbedChunks embeds a batch of chunks and stores them in the database.
// Deletes any existing embeddings for the entity first (re-embed on update).
func (s *EmbeddingService) EmbedChunks(ctx context.Context, entityID uuid.UUID, category int16, chunks []Chunk) error {
    // Build contents for batch embedding
    contents := make([]*genai.Content, len(chunks))
    for i, chunk := range chunks {
        contents[i] = genai.NewContentFromText(chunk.Text)
    }

    // Call Gemini embedding API
    dims := s.dimensions
    result, err := s.client.Models.EmbedContent(ctx, s.model, contents, &genai.EmbedContentConfig{
        OutputDimensionality: &dims,
        TaskType:             genai.TaskTypeRetrievalDocument,
    })
    if err != nil {
        return fmt.Errorf("embed content: %w", err)
    }

    // Delete old embeddings for this entity
    s.db.Where("entity_id = ? AND entity_category = ?", entityID, category).Delete(&models.Embedding{})

    // Store new embeddings
    embeddings := make([]models.Embedding, len(result.Embeddings))
    for i, emb := range result.Embeddings {
        embeddings[i] = models.Embedding{
            EntityID:       entityID,
            EntityCategory: category,
            ChunkIndex:     int16(chunks[i].Index),
            ChunkText:      chunks[i].Text,
            Vector:         pgvector.NewVector(emb.Values),
        }
    }
    return s.db.Create(&embeddings).Error
}

// EmbedQuery embeds a search query using the RETRIEVAL_QUERY task type.
func (s *EmbeddingService) EmbedQuery(ctx context.Context, query string) (pgvector.Vector, error) {
    dims := s.dimensions
    result, err := s.client.Models.EmbedContent(ctx, s.model, []*genai.Content{
        genai.NewContentFromText(query),
    }, &genai.EmbedContentConfig{
        OutputDimensionality: &dims,
        TaskType:             genai.TaskTypeRetrievalQuery,
    })
    if err != nil {
        return pgvector.Vector{}, err
    }
    return pgvector.NewVector(result.Embeddings[0].Values), nil
}
```

**Task types used:**
- `TaskTypeRetrievalDocument` — when embedding submission content (optimized for document storage)
- `TaskTypeRetrievalQuery` — when embedding a user's search query (optimized for query matching)

Using asymmetric task types improves retrieval quality — the model learns that queries are short/intent-driven while documents are longer/information-dense.

### Cross-Encoder Reranking (`internal/services/reranker.go`)

Vector similarity (ANN) is fast but approximate — it retrieves candidates based on geometric distance, which can miss nuance. A cross-encoder reranker takes the top-N candidates and scores each (query, document) pair jointly, capturing token-level interactions that bi-encoder embeddings lose.

**Model:** [`cross-encoder/ms-marco-MiniLM-L6-v2`](https://huggingface.co/cross-encoder/ms-marco-MiniLM-L6-v2) — 22.7M parameters, 6-layer MiniLM. Runs as a quantized ONNX model on CPU via [`onnxruntime_go`](https://github.com/yalue/onnxruntime_go). The int8-quantized ONNX file is ~80MB, scores 50 candidates in <100ms on a modern CPU.

**Two-stage pipeline:** vector recall (fast, coarse) → cross-encoder rerank (slow, precise).

**Setup:** Export the quantized ONNX model and tokenizer once:

```bash
# Download quantized model + tokenizer to backend/models/reranker/
pip install optimum[onnxruntime]
optimum-cli export onnx --model cross-encoder/ms-marco-MiniLM-L6-v2 \
    --optimize O3 --device cpu backend/models/reranker/
```

Files needed at runtime:
```
backend/models/reranker/
├── model.onnx            # quantized ONNX model (~80MB)
├── tokenizer.json        # HuggingFace fast tokenizer
└── special_tokens_map.json
```

**Dependencies:**

```
// go.mod
github.com/yalue/onnxruntime_go   latest   // ONNX Runtime Go bindings
github.com/AlanVerbner/go-tokenizer latest  // HuggingFace tokenizer in Go (or similar)
```

Also requires the ONNX Runtime shared library installed on the system:
```bash
# macOS
brew install onnxruntime
# Linux
apt install libonnxruntime-dev  # or download from https://github.com/microsoft/onnxruntime/releases
```

```go
package services

import (
    "sort"
    ort "github.com/yalue/onnxruntime_go"
)

type RerankerService struct {
    session   *ort.AdvancedSession
    tokenizer *Tokenizer  // wraps tokenizer.json for WordPiece encoding
    maxLen    int          // max token length (default 512)
}

type RankedResult struct {
    EntityID       uuid.UUID
    EntityCategory int16
    ChunkText      string
    Score          float64 // cross-encoder relevance score
}

func NewRerankerService(modelDir string) (*RerankerService, error) {
    ort.SetSharedLibraryPath(findOrtLib()) // path to libonnxruntime.so / .dylib
    if err := ort.InitializeEnvironment(); err != nil {
        return nil, err
    }

    // Load ONNX model session
    session, err := ort.NewAdvancedSession(
        filepath.Join(modelDir, "model.onnx"),
        []string{"input_ids", "attention_mask", "token_type_ids"},
        []string{"logits"},
        nil, // default session options (CPU)
    )
    if err != nil {
        return nil, err
    }

    tokenizer, err := LoadTokenizer(filepath.Join(modelDir, "tokenizer.json"))
    if err != nil {
        return nil, err
    }

    return &RerankerService{session: session, tokenizer: tokenizer, maxLen: 512}, nil
}

// Rerank scores each (query, chunk) pair through the cross-encoder
// and returns the top-K results sorted by relevance.
func (r *RerankerService) Rerank(query string, candidates []models.Embedding, topK int) ([]RankedResult, error) {
    results := make([]RankedResult, len(candidates))

    for i, cand := range candidates {
        // Tokenize as a sentence pair: [CLS] query [SEP] document [SEP]
        ids, mask, typeIDs := r.tokenizer.EncodePair(query, cand.ChunkText, r.maxLen)

        // Create input tensors
        inputIDs, _ := ort.NewTensor(ort.NewShape(1, int64(len(ids))), ids)
        attnMask, _ := ort.NewTensor(ort.NewShape(1, int64(len(mask))), mask)
        tokenTypes, _ := ort.NewTensor(ort.NewShape(1, int64(len(typeIDs))), typeIDs)
        output, _ := ort.NewEmptyTensor[float32](ort.NewShape(1, 1))

        // Run inference
        err := r.session.Run(
            []ort.ArbitraryTensor{inputIDs, attnMask, tokenTypes},
            []ort.ArbitraryTensor{output},
        )
        inputIDs.Destroy()
        attnMask.Destroy()
        tokenTypes.Destroy()

        score := float64(0)
        if err == nil {
            score = float64(output.GetData()[0])
        }
        output.Destroy()

        results[i] = RankedResult{
            EntityID:       cand.EntityID,
            EntityCategory: cand.EntityCategory,
            ChunkText:      cand.ChunkText,
            Score:          score,
        }
    }

    sort.Slice(results, func(i, j int) bool { return results[i].Score > results[j].Score })
    if len(results) > topK {
        results = results[:topK]
    }
    return results, nil
}

func (r *RerankerService) Close() {
    r.session.Destroy()
    ort.DestroyEnvironment()
}
```

**Why this model:**
- **22.7M params** — small enough for CPU, no GPU needed
- **ONNX int8 quantized** — ~80MB, fits in memory on any server
- **~2ms per pair** on CPU — 50 candidates reranked in <100ms
- **MiniLM-L6** — 6 transformer layers, trained on MS MARCO passage ranking. Good enough for local news content where queries and documents share a language domain

**Why a cross-encoder on top of vector search:**
- Vector search finds chunks that are geometrically close to the query — good recall but can surface false positives (similar words, different meaning)
- The cross-encoder sees query and document tokens together, understanding relationships like "school budgets" matching "education funding" even when few words overlap
- Cost tradeoff: we only run the cross-encoder on 50 candidates, not the entire corpus. No API calls, no latency — it runs locally

### Semantic Search Handler (`handlers/search.go`)

Integrates with the existing search endpoint. When `mode=semantic` is passed, uses the two-stage vector + rerank pipeline instead of full-text search:

```go
// GET /api/search?q=...&mode=semantic&location_id=...&limit=10

func (h *Handler) SemanticSearch(c *gin.Context) {
    q := c.Query("q")
    limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
    locationID := c.Query("location_id")

    // Stage 1: Embed query
    queryVec, err := h.embeddingService.EmbedQuery(c, q)
    if err != nil {
        c.JSON(500, gin.H{"error": "embedding failed"})
        return
    }

    // Stage 2: ANN recall — top 50 candidates from pgvector
    var candidates []models.Embedding
    stmt := h.db.Order("embedding <=> ?", queryVec).Limit(50)
    if locationID != "" {
        // Join submissions to filter by location hierarchy
        stmt = stmt.Joins("JOIN submissions ON submissions.id = embeddings.entity_id").
            Where("embeddings.entity_category = ? AND (submissions.city_id = ? OR submissions.region_id = ? OR submissions.country_id = ?)",
                models.EntitySubmission, locationID, locationID, locationID)
    }
    stmt.Find(&candidates)

    // Stage 3: Cross-encoder rerank — top K
    ranked, err := h.reranker.Rerank(c, q, candidates, limit)
    if err != nil {
        c.JSON(500, gin.H{"error": "reranking failed"})
        return
    }

    c.JSON(200, ranked)
}
```

### Pipeline Integration

Embeddings are generated as part of the submission pipeline, after the article is generated and reviewed:

```
POST /api/submissions → save files → return { submission_id }
GET  /api/submissions/{id}/stream → SSE connection:
  → ElevenLabs transcribe → event: status "transcribing"
  → Gemini generate       → event: status "generating"
  → Gemini review         → event: status "reviewing"
  → Gemini embed chunks   → event: status "embedding"
  → save to DB            → event: complete { article, review }
```

The embedding step runs after review because it needs the final article content. It adds ~1-2 seconds to the pipeline.

### When Embeddings Are Created / Updated

| Event | Action |
|-------|--------|
| Pipeline completes (article generated) | Chunk + embed all blocks |
| Article edited by contributor | Re-chunk + re-embed (delete old, insert new) |
| Article deleted | Delete all embeddings for that entity |

### Project Structure (additions)

```
backend/
├── models/
│   └── reranker/
│       ├── model.onnx               # MiniLM-L6 quantized ONNX (~80MB, not in git)
│       ├── tokenizer.json           # HuggingFace fast tokenizer
│       └── special_tokens_map.json
├── internal/services/
│   ├── chunker.go                   # semantic-aware block chunking
│   ├── embedding.go                 # Gemini embedding + pgvector storage
│   └── reranker.go                  # ONNX cross-encoder reranking (CPU)
```

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

export async function publishSubmission(submissionId: string) {
  const res = await fetch(`${API_BASE}/api/submissions/${submissionId}/publish`, {
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
| Article generation (Gemini) | Backend dev | 2-3h |
| Quality review (Gemini) | Backend dev | 2-3h |
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
- Gemini generation + review services
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
| Gemini Pro — generation | ~$0.01-0.03 | $0.50-1.50 |
| Gemini Pro — review | ~$0.005-0.015 | $0.25-0.75 |
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
