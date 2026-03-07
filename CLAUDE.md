# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered local news platform that turns citizen contributions (audio, photos, notes) into quality-reviewed articles. Hackathon project for PORT 2026 / GSSC.

## Repository Structure

```
LOCAL_NEWS_PLATFORM.md      Product vision, market analysis, pitch structure
3_how/TECH_SPEC.md          Technical spec — architecture, API endpoints, DB schema, pipeline details
local-news-app.md           Early idea draft (superseded by above docs)
archive/                    Previous project (Preflight) and research reports — reference only
```

The `backend/` and `frontend/` directories don't exist yet — they need to be created following the structure defined in `TECH_SPEC.md`.

## Tech Stack

- **Backend:** Go 1.22+, Gin, PostgreSQL, GORM + GORM migrations
- **Frontend:** Vite + React (TypeScript, PWA), CSS custom properties (design tokens)
- **AI:** ElevenLabs STT (transcription), Claude API via Anthropic Go SDK (article generation + review)

## Architecture

Two frontend apps (contributor PWA + public reader site) talking to a single Gin backend. Core AI pipeline runs synchronously for the hackathon:

```
POST /api/submissions → save files → return { submission_id }
GET  /api/submissions/{id}/stream → SSE connection:
  → ElevenLabs transcribe → event: status "transcribing"
  → Claude generate       → event: status "generating"
  → Claude review         → event: status "reviewing"
  → save to DB            → event: complete { article, review }
```

Two-request pattern: POST saves files and returns immediately, then frontend opens SSE stream for real-time pipeline progress (~20-30 seconds). See `3_how/TECH_SPEC.md` for detailed API endpoints, DB schema, and service structure.

## Build & Run Commands

```bash
# Backend
cd backend
go mod download
go run cmd/server/main.go    # runs on :8000 (with hot-reload via air if installed)

# Frontend
cd frontend
npm install
npm run dev   # runs on :5173
```

## Key Conventions

- All frontend styles use CSS custom properties from `frontend/src/styles/tokens.css` — never raw color/spacing values
- Spacing and sizing follow the design token scale — no arbitrary pixel values
- Components reference tokens via `var(--token-name)`
- New tokens go in `tokens.css` first, then get used in components

## Environment Variables

Backend requires a `.env` file (see `TECH_SPEC.md` for full list):
- `DATABASE_URL` — PostgreSQL connection string
- `ANTHROPIC_API_KEY` — for Claude article generation + review
- `ELEVENLABS_API_KEY` — for speech-to-text transcription
- `MEDIA_STORAGE_PATH` — local file uploads (default `./uploads`)
- `ALLOWED_ORIGINS` — CORS origins (default `http://localhost:5173`)

## Git Workflow

- Pull before starting work — other agents may have pushed changes
- Push features frequently — small, working increments rather than large batches
- Keep the repo clean: no dead code, no leftover debug logs, no unrelated changes in commits
