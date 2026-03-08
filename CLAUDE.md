# CLAUDE.md

WHEN YOU HAVE IMPLEMENTED A PLAN, ALWAYS COMMIT AND PUSH. DON'T BE DESTRUCTIVE.

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
  PROMPTS.md                      Prompt templates for article generation + review
  UI_DESIGN_SYSTEM.md             Design tokens, component specs, typography, layout
  CORS_SPEC.md                    CORS configuration
  NGINX_SPEC.md                   Nginx reverse proxy setup
  AD_SPEC.md                      Advertising spec
  ARCHITECTURE.md                 Early architecture draft (OUTDATED — superseded by TECH_SPEC.md)
4_proof/                        Gate test: can Claude detect representation gaps?
5_pitch/                        Demo script and pitch
frontend/                       Vite + React app
backend/                        Go + Gin API server
archive/                        Previous project (Preflight) and research reports — reference only
```

## Tech Stack

- **Backend:** Go 1.24+, Gin, PostgreSQL, GORM, pgvector, Redis (cache, 30min TTL)
- **Frontend:** Vite 7 + React 19 (TypeScript), Tailwind CSS v4 (via `@tailwindcss/vite` plugin), shadcn/ui (base-nova style), react-router-dom v7, Lucide React icons, Leaflet maps
- **AI:** ElevenLabs STT (transcription), Gemini API via `google.golang.org/genai` SDK (article generation + review + embeddings)
- **Auth:** JWT (HS256, 15min access / 30d refresh), bcrypt passwords, Google OAuth, Redis-backed cache

## Architecture

Single Gin backend serving a React SPA frontend. Core AI pipeline uses SSE for real-time progress:

```
POST /api/submissions -> save files -> return { submission_id }
GET  /api/submissions/{id}/stream -> SSE connection:
  -> GATHER     (parallel: transcribe audio + describe photos + resolve location)
  -> RESEARCH   (web search via Gemini function calling)
  -> QUESTIONING (generate follow-up questions if gaps found)
  -> GENERATE   (article from PipelineContext, with language following)
  -> REVIEW     (editorial quality gate: GREEN/YELLOW/RED)
  -> AUTO-FIX   (up to 2 rounds if fixable red triggers like hallucinations)
  -> save to DB -> event: complete { article, review }
```

Two-request pattern: POST saves files and returns immediately, then frontend opens SSE stream for real-time pipeline progress. Pipeline stages share state via `PipelineContext` struct. See `3_how/TECH_SPEC.md` for detailed API endpoints, DB schema, and service structure.

**Current state:** Generation, review, and research use Gemini with function calling when `GEMINI_API_KEY` is set. Transcription uses ElevenLabs when `ELEVENLABS_API_KEY` is set, otherwise stub.

### Backend Structure

Go module: `github.com/localnews/backend`

```
backend/
  cmd/server/main.go              Entry point — wires config, DB, Redis, services, routes
  internal/
    config/config.go               Env-based config with defaults
    database/database.go           GORM connection, AutoMigrate, SQL migration runner
    cache/cache.go                 Redis wrapper
    middleware/auth.go             JWT auth, OptionalAuth, RequireRole, RequirePerm
    middleware/cors.go             CORS setup
    models/                        GORM models + constants (status codes, tag bitmasks, permission flags)
    handlers/                      Gin route handlers (one file per domain: articles, auth, submissions, reactions, bookmarks, follows, etc.)
    services/                      Business logic (pipeline, generation, review, research, questioning, transcription, embedding, chunker, reranker, auth, media, access, notification, stats, georesolver, etc.)
  migrations/                      SQL seed files (run on startup after GORM AutoMigrate)
```

Key patterns:
- All handlers live on a single `Handler` struct that holds DB, cache, and service references
- Auth middleware sets `profile_id`, `role`, and `perm` on the Gin context via JWT claims
- Roles: 0 = user, 1 = editor, 2 = admin. Permissions use a bitfield (`models.Perm*` constants)
- Route groups: public (no auth), authed (any logged-in user), editor (role >= 1), admin (role >= 2), mod (PermModerate flag)
- Database uses GORM AutoMigrate for schema + `migrations/` dir for SQL seeds (extensions, triggers, seed data)
- PostgreSQL extensions: `vector` (pgvector for embeddings) and `pg_trgm` (trigram search)

### Frontend Structure

```
frontend/src/
  App.tsx                          Router with auth-guarded routes
  contexts/AuthContext.tsx          Auth state, login/signup/logout, silent refresh on mount
  contexts/LanguageContext.tsx      i18n / language selection
  lib/api.ts                       API client with auto-refresh on 401, token in memory (not localStorage)
  lib/types.ts                     TypeScript types mirroring Go backend structs + display helpers
  lib/sse.ts                       SSE stream helper for pipeline events
  lib/utils.ts                     cn() for Tailwind class merging
  pages/                           Page components
  components/                      Shared components (Navbar, BottomBar, Toast, ProtectedRoute, ConfirmDialog)
  components/ui/                   shadcn components
  styles/                          tokens.css, components.css, index.css (Tailwind theme), reset.css
```

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

# Backend
cd backend
go mod download
go run cmd/server/main.go    # runs on :8000 (with hot-reload via air if installed)
go test ./...                # run all tests
go test ./internal/services/ # run tests for a single package

# Infrastructure (local dev)
docker run -d --name redis -p 6379:6379 redis:7-alpine
# PostgreSQL: use local install or Docker (needs vector and pg_trgm extensions)
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
/                  HomePage
/article/:id       ArticlePage
/search            SearchPage
/tag/:slug         TagPage
/explore           ExplorePage (with Leaflet map)
/login             LoginPage (public-only, redirects if logged in)
/signup            SignupPage (public-only, redirects if logged in)
/auth/callback     AuthCallbackPage (Google OAuth)
/onboarding        OnboardingPage (protected)
/post              PostPage (protected, requires auth)
/post/:id          PostPage edit mode (protected)
/profile           ProfilePage (own profile, protected)
/profile/:slug     ProfilePage (other user, public)
/admin/dashboard   AdminDashboardPage (admin-only)
/design-system     DesignSystem (token reference page)
```

## Environment Variables

Backend reads from `.env` (loaded via godotenv). All have defaults for local dev:
- `DATABASE_URL` — PostgreSQL connection string (default `postgresql://user:pass@localhost:5432/localnews`)
- `PORT` — server port (default `8000`)
- `GEMINI_API_KEY` — for Gemini article generation, review, and embeddings
- `GENERATION_MODEL` — Gemini model for generation/review (default `gemini-3.1-pro-preview`)
- `ELEVENLABS_API_KEY` — for speech-to-text transcription
- `MEDIA_STORAGE_PATH` — local file uploads (default `./uploads`)
- `REDIS_URL` — Redis connection (default `redis://localhost:6379/0`)
- `ALLOWED_ORIGINS` — CORS origins (default `http://localhost:5173,http://localhost:5174`)
- `JWT_SECRET` — signing key for access tokens (min 32 bytes, random)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URL` — for OAuth (optional)

Frontend uses `VITE_API_URL` to override the backend base URL (default `http://localhost:8000`).

## Git Workflow

- Pull before starting work — other agents may have pushed changes
- Push features frequently — small, working increments rather than large batches
- Keep the repo clean: no dead code, no leftover debug logs, no unrelated changes in commits
- Commit in a way that makes sense for the project, but not too often
- Try not to be destructive, no rebasing, no force pushing, no deleting branches, be graceful and careful