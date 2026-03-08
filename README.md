# Local News Platform

AI-powered local news platform that turns citizen contributions (audio, photos, notes) into quality-reviewed articles. Record what happened, snap a photo — AI writes a proper news article, reviews it for missing voices, and publishes it to your town's digital newspaper.

Hackathon project for PORT 2026 / GSSC.

---

## Quick Start

```bash
# Frontend
cd frontend && npm install && npm run dev    # :5173

# Backend
cd backend && go run cmd/server/main.go      # :8000

# Infrastructure
docker run -d --name redis -p 6379:6379 redis:7-alpine
# PostgreSQL with vector + pg_trgm extensions
```

Requires `GEMINI_API_KEY` and `ELEVENLABS_API_KEY` in `backend/.env`. See [CLAUDE.md](CLAUDE.md) for full env var list.

---

## Tech Stack

- **Frontend:** Vite 7 + React 19, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend:** Go 1.24+, Gin, PostgreSQL, GORM, pgvector, Redis
- **AI:** ElevenLabs STT (transcription), Gemini API (generation + review + embeddings)
- **Auth:** JWT + Google OAuth, Redis-backed cache

---

## How It Works

```
Record audio / take photos / write notes
  -> POST /api/submissions (save files)
  -> GET  /api/submissions/{id}/stream (SSE)
     -> GATHER      (transcribe + describe photos + resolve location)
     -> RESEARCH    (web search via Gemini function calling)
     -> GENERATE    (article with proper journalism structure)
     -> REVIEW      (6-dimension quality gate: GREEN/YELLOW/RED)
     -> AUTO-FIX    (up to 2 rounds if fixable issues found)
  -> Published article on the town's newspaper
```

Cost per article: $0.02-0.07. Cost per town per year: ~$5.

---

## Repository Structure

| # | Directory | What |
|---|-----------|------|
| — | [VISION.md](VISION.md) | Product vision — read first |
| 0 | [0_why/](0_why/) | Why this needs to exist (the crisis) |
| 1 | [1_what/](1_what/) | What we're building (product + quality engine) |
| 2 | [2_who/](2_who/) | Market, competitors, revenue model |
| 3 | [3_how/](3_how/) | Technical specs (API, DB, auth, prompts, design system) |
| 4 | [4_proof/](4_proof/) | Gate test — can AI detect representation gaps? |
| 5 | [5_pitch/](5_pitch/) | Pitch materials and demo script |

| Directory | What |
|-----------|------|
| `frontend/` | Vite + React app |
| `backend/` | Go + Gin API server |
| `deployment/` | Deployment configuration |
| `scripts/` | Utility scripts |
| `articles/` | Sample/test articles |
| `marketing/` | Marketing materials |
| `archive/` | Previous project (Preflight) and research — reference only |
