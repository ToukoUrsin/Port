# Local News Platform — Technical Specification

**Stack:** Python (FastAPI) · PostgreSQL · Vite + React · Whisper API · Claude API
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
                            │ REST / JSON
                            v
             ┌──────────────────────────────┐
             │     Backend (FastAPI)         │
             │     Python 3.12+             │
             ├──────────────────────────────┤
             │  /api/submissions   POST     │
             │  /api/articles      GET/POST │
             │  /api/articles/{id} GET      │
             │  /api/review/{id}   GET/POST │
             │  /api/towns/{slug}  GET      │
             │  /api/upload        POST     │
             └──────┬───────┬───────┬───────┘
                    │       │       │
          ┌─────────┘       │       └─────────┐
          v                 v                  v
   ┌────────────┐   ┌─────────────┐   ┌──────────────┐
   │ PostgreSQL │   │ Claude API  │   │ Whisper API  │
   │            │   │ (generate + │   │ (transcribe) │
   │ articles   │   │  review)    │   └──────────────┘
   │ submissions│   └─────────────┘
   │ towns      │
   │ media      │          ┌──────────────┐
   └────────────┘          │ File Storage │
                           │ (local / S3) │
                           └──────────────┘
```

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
│   └── town.py              # Town configuration
├── routers/
│   ├── submissions.py       # POST raw content (audio + photos + notes)
│   ├── articles.py          # GET/list published articles
│   ├── review.py            # GET review results, POST approve/fix
│   └── towns.py             # GET town newspaper data
├── services/
│   ├── transcription.py     # Whisper API integration
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
openai==1.66.*            # for Whisper API only
python-dotenv==1.1.*
httpx==0.28.*
pillow==11.*              # image processing
```

### Key Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/localnews
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...           # Whisper only
MEDIA_STORAGE_PATH=./uploads    # local for hackathon, S3 later
ALLOWED_ORIGINS=http://localhost:5173
```

---

## Database — PostgreSQL

### Schema

```sql
CREATE TABLE towns (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(100) UNIQUE NOT NULL,   -- e.g. "espoo-otaniemi"
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE submissions (
    id              SERIAL PRIMARY KEY,
    town_id         INTEGER REFERENCES towns(id),
    audio_path      TEXT,                        -- path to uploaded audio
    transcript      TEXT,                        -- Whisper output
    notes           TEXT,                        -- contributor's typed notes
    photo_paths     TEXT[],                      -- array of photo file paths
    status          VARCHAR(20) DEFAULT 'pending',  -- pending | processing | ready
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE articles (
    id              SERIAL PRIMARY KEY,
    submission_id   INTEGER REFERENCES submissions(id),
    town_id         INTEGER REFERENCES towns(id),
    headline        VARCHAR(300) NOT NULL,
    body            TEXT NOT NULL,
    summary         VARCHAR(500),
    category        VARCHAR(50),                 -- council, schools, business, events, sports, community
    photo_paths     TEXT[],
    photo_captions  TEXT[],
    status          VARCHAR(20) DEFAULT 'draft', -- draft | review | published | rejected
    review_result   JSONB,                       -- AI review output (flags, suggestions, score)
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

Manage migrations with Alembic. Run `alembic init alembic` once, then create revisions as the schema evolves.

---

## Core Pipeline

### 1. Submission Intake (`POST /api/submissions`)

Accepts `multipart/form-data`:
- `audio` — audio file (webm/mp4a from browser MediaRecorder)
- `photos[]` — up to 5 image files
- `notes` — optional text
- `town_id` — integer

Saves files to disk, creates a `submissions` row with status `pending`, then kicks off the pipeline.

### 2. Transcription (`services/transcription.py`)

```python
from openai import OpenAI

def transcribe(audio_path: str) -> str:
    client = OpenAI()
    with open(audio_path, "rb") as f:
        result = client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            response_format="text"
        )
    return result
```

Cost: ~$0.006/min. A 2-minute recording returns in ~10 seconds.

### 3. Article Generation (`services/generation.py`)

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

### 4. Quality Review (`services/review.py`)

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

### 5. Pipeline Orchestration

For the hackathon, run synchronously in the request handler. The full pipeline (transcribe → generate → review) takes ~20-30 seconds. Show a loading state on the frontend.

```
POST /api/submissions  →  save files + DB row
                       →  transcribe audio (Whisper)
                       →  generate article (Claude)
                       →  review article (Claude)
                       →  save article to DB
                       →  return article + review to frontend
```

Post-hackathon: move to background tasks with Celery or `asyncio.create_task`.

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
│   │   ├── NewspaperPage.tsx    # public reader view for a town
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
3. **Generating** — POST to `/api/submissions`, show pipeline progress
4. **Review & Publish** — show generated article + review flags. Contributor can edit, then publish.

**NewspaperPage** — fetches `GET /api/articles?town=<slug>`, renders a newspaper-style feed. Reverse chronological. Category tabs.

### API Client

```typescript
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function submitContribution(formData: FormData) {
  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: "POST",
    body: formData,  // multipart: audio, photos[], notes, town_id
  });
  return res.json();  // returns { article, review }
}

export async function publishArticle(articleId: number) {
  const res = await fetch(`${API_BASE}/api/articles/${articleId}/publish`, {
    method: "POST",
  });
  return res.json();
}

export async function getArticles(townSlug: string) {
  const res = await fetch(`${API_BASE}/api/towns/${townSlug}/articles`);
  return res.json();
}
```

### Routing

```
/                    → landing / town selector (hardcoded for hackathon)
/contribute          → ContributePage (the main flow)
/t/:townSlug         → NewspaperPage (public reader view)
/t/:townSlug/:id     → ArticlePage (single article)
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
| Whisper transcription endpoint | Backend dev | 1-2h |
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
- Multi-town admin
- Native mobile app
- Push notifications
- Comment system
- Background task queue

---

## Task Split (3-Person Team)

**Person A — Backend Core**
- FastAPI app, DB models, Alembic migrations
- Submission endpoint (file upload + save)
- Whisper integration
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
| Whisper (2 min audio) | $0.012 | $0.60 |
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
