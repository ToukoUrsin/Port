# How Does It Work?

---

## System Overview

```
CONTRIBUTOR (phone browser)          READER (any browser)
       |                                    |
       v                                    v
+----------------------------------------------------+
|            Next.js App (Vercel)                     |
|  /contribute  — capture + review UI                 |
|  /[town]      — newspaper reader site               |
|  /api/*       — serverless backend                  |
+----------------------------------------------------+
       |              |              |
       v              v              v
  Whisper API    Claude API      Database
  (transcribe)   (generate +     (Supabase or
                  review)        SQLite)
       |
       v
   File Storage
   (Supabase Storage / S3)
```

**One app, not two.** Next.js serves both contributor and reader. API routes are serverless functions. No separate backend.

Alternative: FastAPI backend on Railway + Next.js frontend on Vercel, if team is faster in Python. Decide in first meeting based on skills.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (React) | One codebase for contributor + reader. Vercel deploys in seconds. |
| Backend | Next.js API routes | Zero infrastructure. OR: FastAPI if team prefers Python. |
| Database | Supabase (Postgres) | Free tier, hosted, includes file storage. Fallback: SQLite. |
| Transcription | OpenAI Whisper API | $0.006/min. 10s turnaround. Battle-tested. |
| Generation | Claude API (Sonnet) | Fast, cheap, good structured output. |
| Review | Claude API (Sonnet) | Same model, different prompt. |
| File storage | Supabase Storage | Audio + photos. Or local filesystem for hackathon. |
| Deployment | Vercel | Free tier, instant deploys, real URLs for judges. |

---

## Data Model

Three tables. That's it.

### towns
```
id          TEXT PRIMARY KEY
name        TEXT NOT NULL           -- "PORT_2026"
slug        TEXT UNIQUE NOT NULL    -- "port-2026"
created_at  TIMESTAMP
```

### articles
```
id                TEXT PRIMARY KEY
town_id           TEXT REFERENCES towns(id)
title             TEXT
body              TEXT               -- markdown or HTML
status            TEXT               -- draft | review | published
contributor_name  TEXT               -- just a name, no auth
source_audio_url  TEXT
source_transcript TEXT               -- Whisper output
source_notes      TEXT
source_photos     JSON               -- array of photo URLs
quality_review    JSON               -- full review output
quality_score     INTEGER            -- 0-100
created_at        TIMESTAMP
published_at      TIMESTAMP
```

No users table. Contributors type a name. Demo mode.

---

## The AI Pipeline

Two Claude API calls. This is the core.

### Call 1: Generate Article

**In:** transcript + photo descriptions + notes + town context
**Out:** structured JSON — headline, body, quotes, photo captions, category

Prompt rules:
- NEVER invent information not in source material
- Structure and clean up, don't embellish
- Pull direct quotes, attribute them
- Local news tone: clear, direct, informative
- Incomplete info → say so, don't make it up

Cost: ~$0.01-0.03 | Latency: 3-8 seconds

### Call 2: Quality Review

**In:** generated article + original source material + town context
**Out:** structured JSON — scores, flags, coaching suggestions

```json
{
  "overall_score": 72,
  "dimensions": {
    "factual_accuracy":  { "score": 85, "flags": [...] },
    "quote_attribution": { "score": 90, "flags": [...] },
    "perspectives":      { "score": 60, "present": [...], "missing": [...] },
    "representation":    { "score": 55, "flags": [...], "suggestion": "..." },
    "ethical_framing":   { "score": 80, "flags": [] },
    "completeness":      { "score": 65, "missing_context": [...] }
  },
  "coaching": ["...", "...", "..."],
  "blocking_flags": []
}
```

Prompt rules:
- Compare article against source material, NOT world knowledge
- Core question: "did the AI add anything not in the input?" + "what's missing?"
- Coaching suggestions must be specific and actionable
- Blocking flags only for serious issues (defamation, extreme factual errors)
- Tone: helpful editor, not gatekeeper

Cost: ~$0.01-0.03 | Latency: 3-8 seconds

### Total pipeline: 15-25 seconds
Whisper (5-10s) + Generation (3-8s) + Review (3-8s)

See [PROMPTS.md](PROMPTS.md) for the exact prompts.

---

## Deployment

```
Vercel (free tier)
├── Next.js app
├── API routes (serverless)
└── Connected to:
    ├── Supabase — Postgres + file storage
    ├── OpenAI — Whisper
    └── Anthropic — Claude
```

Setup: ~30 minutes to a live URL.
Demo URL: judges open `port2026-news.vercel.app` on their phones.

---

## What We Don't Build

- No WebSocket / real-time (manual refresh fine)
- No image processing (photos as-is)
- No search, pagination, caching, rate limiting
- No error tracking (console.log for 48 hours)
- No tests (hackathon)

---

## Open Technical Questions

**One codebase or two?** Next.js only vs. Next.js + FastAPI. Decide based on team skills.

**Database?** Supabase (proposed). Fall back to SQLite if setup takes >30 min.

**Audio recording in mobile browser?** MediaRecorder API works in modern browsers. Test on both Chrome and Safari early. Fallback: upload voice memo from phone's recorder.

**Structured JSON from Claude?** Yes — we need programmatic access to scores for the UI. Mitigate malformed JSON with retry + repair.
