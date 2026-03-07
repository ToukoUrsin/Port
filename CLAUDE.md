# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered local news platform that turns citizen contributions (audio, photos, notes) into quality-reviewed articles. Hackathon project for PORT 2026 / GSSC.

Start with `VISION.md` for the idea, then read the numbered directories in order (0-5). Each answers one question about the project.

## Repository Structure

```
VISION.md                       Product vision (read first)
0_why/                          Why this needs to exist
1_what/                         What we're building (PRODUCT.md, DEEP_SYNTHESIS.md)
2_who/                          Market & TAM analysis
3_how/                          Technical specs (the implementation bible)
  TECH_SPEC.md                    API endpoints, DB schema, SSE pipeline, backend structure
  AUTH_SPEC.md                    JWT auth, OAuth, Redis cache, middleware, permissions
  PROMPTS.md                      Claude prompt templates for article generation + review
  UI_DESIGN_SYSTEM.md             Design tokens, component specs, typography, layout
  CORS_SPEC.md                    CORS configuration
  NGINX_SPEC.md                   Nginx reverse proxy setup
  AD_SPEC.md                      Advertising spec
  ARCHITECTURE.md                 Early architecture draft (OUTDATED — superseded by TECH_SPEC.md)
4_proof/                        Gate test: can Claude detect representation gaps?
5_pitch/                        Demo script and pitch
frontend/                       Vite + React app (scaffolded, pages exist)
archive/                        Previous project (Preflight) and research reports — reference only
```

The `backend/` directory does not exist yet — create it following `3_how/TECH_SPEC.md`.

## Tech Stack

- **Backend:** Go 1.22+, Gin, PostgreSQL, GORM, Redis (cache, 30min TTL)
- **Frontend:** Vite 7 + React 19 (TypeScript), Tailwind CSS v4 (via `@tailwindcss/vite` plugin), shadcn/ui (base-nova style), react-router-dom v7, Lucide React icons, Leaflet maps
- **AI:** ElevenLabs STT (transcription), Claude API via Anthropic Go SDK (article generation + review)
- **Auth:** JWT (HS256, 15min access / 30d refresh), bcrypt passwords, Google OAuth, Redis-backed cache

## Architecture

Two frontend apps (contributor PWA + public reader site) talking to a single Gin backend. Core AI pipeline runs synchronously for the hackathon:

```
POST /api/submissions -> save files -> return { submission_id }
GET  /api/submissions/{id}/stream -> SSE connection:
  -> ElevenLabs transcribe -> event: status "transcribing"
  -> Claude generate       -> event: status "generating"
  -> Claude review         -> event: status "reviewing"
  -> save to DB            -> event: complete { article, review }
```

Two-request pattern: POST saves files and returns immediately, then frontend opens SSE stream for real-time pipeline progress (~20-30 seconds). See `3_how/TECH_SPEC.md` for detailed API endpoints, DB schema, and service structure.

Auth uses stateless JWT with Redis-cached profile lookups and refresh token rotation. Public endpoints (articles, search) need no auth. Submissions require auth. Publishing requires editor role. See `3_how/AUTH_SPEC.md`.

## Build & Run Commands

```bash
# Frontend
cd frontend
npm install
npm run dev                  # dev server on :5173
npm run build                # tsc -b && vite build
npm run lint                 # eslint
npm run preview              # preview production build

# Backend (does not exist yet — create per TECH_SPEC.md)
cd backend
go mod download
go run cmd/server/main.go    # runs on :8000 (with hot-reload via air if installed)
go test ./...                # run all tests
go test ./internal/services/ # run tests for a single package

# Infrastructure (local dev)
docker run -d --name redis -p 6379:6379 redis:7-alpine
# PostgreSQL: use local install or Docker
```

## Frontend: Two CSS Systems

The frontend has **two coexisting CSS systems** — understand both before writing styles:

1. **shadcn/Tailwind** — Used for shadcn UI components (`frontend/src/components/ui/`). Tailwind v4 runs via the Vite plugin (not PostCSS). Theme variables are in `frontend/src/styles/index.css` using oklch colors. shadcn components use `cn()` from `@/lib/utils` for class merging.

2. **Custom design tokens** — The project's own design system in `frontend/src/styles/tokens.css` (colors, typography, spacing, shadows) and `frontend/src/styles/components.css` (`.btn-*`, `.card`, `.input`, `.badge-*`, `.flag-*` classes). Page-level styles (e.g., `HomePage.css`) use these tokens via `var(--token-name)`.

**Rule:** For new shadcn components, use Tailwind classes. For page layouts and custom UI, use design token CSS custom properties. Never use raw color/spacing values in either system.

### Frontend Conventions

- Path alias: `@/` maps to `./src/` (configured in both `vite.config.ts` and `tsconfig.json`)
- Add shadcn components via `npx shadcn@latest add <component>` (configured in `components.json`)
- Article content uses `--font-serif`; all UI chrome uses `--font-sans`; headings use `--font-heading` (Playfair Display)
- Icons: Lucide React (`lucide-react`), 20px inline / 24px buttons / 32px empty states
- Mobile-first CSS: base styles = mobile, add `@media (min-width: ...)` for larger breakpoints
- Spacing follows the design token scale (`--space-1` through `--space-24`) — no arbitrary pixel values

### Frontend Routes

```
/              HomePage
/explore       ExplorePage (with Leaflet map)
/login         LoginPage
/signup        SignupPage
/post          PostPage (contribution form)
/design-system DesignSystem (token reference page)
```

## Environment Variables

Backend requires a `.env` file (see `TECH_SPEC.md` and `AUTH_SPEC.md` for full list):
- `DATABASE_URL` — PostgreSQL connection string
- `ANTHROPIC_API_KEY` — for Claude article generation + review
- `ELEVENLABS_API_KEY` — for speech-to-text transcription
- `MEDIA_STORAGE_PATH` — local file uploads (default `./uploads`)
- `REDIS_URL` — Redis connection (default `redis://localhost:6379/0`)
- `ALLOWED_ORIGINS` — CORS origins (default `http://localhost:5173`)
- `JWT_SECRET` — signing key for access tokens (min 32 bytes, random)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — for OAuth (optional)

## Git Workflow

- Pull before starting work — other agents may have pushed changes
- Push features frequently — small, working increments rather than large batches
- Keep the repo clean: no dead code, no leftover debug logs, no unrelated changes in commits
