# Local News Platform — Technical Specification

**Stack:** Python (FastAPI) · PostgreSQL · Vite + React · ElevenLabs STT · Claude API
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
             │     Backend (FastAPI)                 │
             │     Python 3.12+                     │
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
   │            │          ┌──────────────┐
   └────────────┘          │ File Storage │
                           │ (local / S3) │
                           └──────────────┘
```

### Stateless Backend

The backend holds zero in-memory state between requests. All state lives in PostgreSQL and external services:

- **No sessions** — no server-side user state, no login for MVP
- **No in-process queues** — pipeline progress is driven by the SSE connection, but each step's result is persisted to the DB (submission status, transcript, article row) as it completes. If the connection drops mid-pipeline, the data written so far is not lost.
- **No local file coupling** — media files go to a storage layer (local disk for hackathon, S3/R2 for production). The backend only stores paths/keys, never holds files in memory.
- **Any instance can serve any request** — since all state is external, multiple backend instances can run behind a load balancer with no sticky sessions or shared memory.

This means the backend is a pure function layer: request comes in → read/write DB + call external APIs → response goes out.

---

## Backend — Python / FastAPI

### Project Structure

```
backend/
├── main.py                  # FastAPI app, CORS, lifespan
├── config.py                # env vars, API keys, DB URL
├── db.py                    # SQLAlchemy engine + session
├── models/
│   ├── article.py           # Article ORM model
│   ├── submission.py        # Raw submission (audio, photos, notes)
│   └── location.py          # Location model (hierarchical)
├── routers/
│   ├── submissions.py       # POST raw content (audio + photos + notes)
│   ├── articles.py          # GET/list published articles
│   ├── review.py            # GET review results, POST approve/fix
│   └── locations.py          # GET location newspaper data
├── services/
│   ├── transcription.py     # ElevenLabs STT integration
│   ├── generation.py        # Claude API — article generation
│   ├── review.py            # Claude API — editorial quality review
│   └── media.py             # File upload handling
├── alembic/                 # DB migrations
│   └── versions/
├── alembic.ini
└── requirements.txt
```

### Dependencies

```
# requirements.txt
fastapi==0.115.*
uvicorn[standard]==0.34.*
sqlalchemy==2.0.*
alembic==1.14.*
psycopg2-binary==2.9.*
python-multipart==0.0.*
anthropic==0.49.*
elevenlabs==1.*            # for Speech-to-Text
python-dotenv==1.1.*
httpx==0.28.*
pillow==11.*              # image processing
```

### Key Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/localnews
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...          # Speech-to-Text
MEDIA_STORAGE_PATH=./uploads    # local for hackathon, S3 later
ALLOWED_ORIGINS=http://localhost:5173
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

Manage migrations with Alembic. Run `alembic init alembic` once, then create revisions as the schema evolves.

### Full-Text Search

PostgreSQL full-text search with precalculated `tsvector` columns and GIN indexes for efficient keyword search. Two extensions required:

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

```python
# routers/search.py
from sqlalchemy import func

@router.get("/api/search")
async def search(q: str, type: str = None, location_id: UUID = None,
                 limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    query = func.plainto_tsquery("english", q)
    results = {}

    if type in (None, "submissions"):
        stmt = (
            select(Submission, func.ts_rank(Submission.search_vector, query).label("rank"))
            .where(Submission.search_vector.op("@@")(query))
            .order_by(text("rank DESC"))
            .limit(limit).offset(offset)
        )
        if location_id:
            stmt = stmt.where(Submission.location_id == location_id)
        results["submissions"] = db.execute(stmt).all()

    if type in (None, "profiles"):
        stmt = (
            select(Profile, func.ts_rank(Profile.search_vector, query).label("rank"))
            .where(Profile.search_vector.op("@@")(query))
            .order_by(text("rank DESC"))
            .limit(limit).offset(offset)
        )
        results["profiles"] = db.execute(stmt).all()

    return results
```

#### Fuzzy matching with pg_trgm

For typo-tolerant "search as you type", use trigram similarity on specific columns:

```sql
-- Optional: add trigram indexes for fuzzy headline/name search
CREATE INDEX idx_submissions_headline_trgm ON submissions USING GIN (headline gin_trgm_ops);
CREATE INDEX idx_profiles_name_trgm ON profiles USING GIN (display_name gin_trgm_ops);
```

```python
# Fuzzy search example (for autocomplete)
stmt = (
    select(Submission)
    .where(func.similarity(Submission.headline, q) > 0.3)
    .order_by(func.similarity(Submission.headline, q).desc())
    .limit(10)
)
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
{ "submission_id": 7, "status": "pending" }
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

FastAPI implementation uses `StreamingResponse` with `media_type="text/event-stream"`. The pipeline function yields SSE-formatted strings as each step completes.

### 3. Transcription (`services/transcription.py`)

ElevenLabs Speech-to-Text API. Audio file in, transcript text out.

```python
from elevenlabs.client import ElevenLabs

def transcribe(audio_path: str) -> str:
    client = ElevenLabs()
    with open(audio_path, "rb") as f:
        result = client.speech_to_text.convert(
            file=f,
            model_id="scribe_v1",
        )
    return result.text
```

### 4. Article Generation (`services/generation.py`)

Single Claude call. System prompt defines the output format. User message contains the raw inputs.

```python
from anthropic import Anthropic

SYSTEM_PROMPT = """You are a local news editor. Given raw inputs from a community
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
- Structure: lead paragraph, body with context, quotes, closing."""

def generate_article(transcript: str, notes: str, photo_count: int) -> dict:
    client = Anthropic()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"Transcript:\n{transcript}\n\nNotes:\n{notes}\n\nPhotos attached: {photo_count}"
        }]
    )
    return json.loads(message.content[0].text)
```

### 5. Quality Review (`services/review.py`)

Second Claude call. Compares generated article against source inputs.

```python
REVIEW_PROMPT = """You are an editorial reviewer. Compare the article against the
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
- Anything potentially defamatory"""

def review_article(article: dict, transcript: str, notes: str) -> dict:
    client = Anthropic()
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1000,
        system=REVIEW_PROMPT,
        messages=[{
            "role": "user",
            "content": f"Article:\n{json.dumps(article)}\n\nSource transcript:\n{transcript}\n\nSource notes:\n{notes}"
        }]
    )
    return json.loads(message.content[0].text)
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
│       └── index.css           # Tailwind or plain CSS
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
  submissionId: number,
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

export async function publishArticle(articleId: number) {
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

- Python 3.12+
- Node.js 20+
- PostgreSQL 16+

### Quick Start

```bash
# 1. Database
createdb localnews

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in API keys
alembic upgrade head
uvicorn main:app --reload --port 8000

# 3. Frontend
cd frontend
npm install
npm run dev                    # runs on :5173
```

### CORS

Configure in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Hackathon Scope — What to Build vs Skip

### Build (MVP)

| Feature | Owner | Est. Hours |
|---------|-------|-----------|
| FastAPI skeleton + DB setup + models | Backend dev | 2-3h |
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
- FastAPI app, DB models, Alembic migrations
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

- **Backend:** Run locally on a laptop, or deploy to Railway / Render (free tier)
- **Frontend:** `npm run build` → serve from the same machine, or Vercel
- **Database:** Local PostgreSQL or Railway managed Postgres
- **Domain:** Optional — a free `.vercel.app` or `.up.railway.app` subdomain works for judges scanning a QR code

Production deployment is a post-hackathon concern.
