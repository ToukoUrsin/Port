# Local News Platform

AI-powered local news platform that turns citizen contributions (audio, photos, notes) into quality-reviewed articles. Tackles the news desert crisis — 50M+ Americans lack local news coverage.

## Project Structure

```
LOCAL_NEWS_PLATFORM.md   Product vision, market analysis, business model
TECH_SPEC.md             Technical specification (FastAPI + React + PostgreSQL)
UI_DESIGN_SYSTEM.md      Design tokens, components, layout system
archive/                 Previous project (Preflight — content quality tool)
```

## Tech Stack

- **Backend:** Python 3.12+, FastAPI, PostgreSQL
- **Frontend:** Vite + React (PWA), CSS custom properties (design tokens)
- **AI:** Whisper API (transcription), Claude API (article generation + review)

## Key Conventions

- All styles use CSS custom properties from `frontend/src/styles/tokens.css` — never raw values
- Spacing and sizing follow the defined scale — no arbitrary pixel values
- Components reference tokens via `var(--token-name)`
- New tokens go in `tokens.css` first, then get used in components

## Architecture

Two frontend apps (contributor PWA + public reader site) talking to a single FastAPI backend. AI pipeline: raw input -> transcription -> article generation -> quality review -> publish.

## Git Workflow

- Push features frequently — commit and push small, working increments rather than large batches
- Pull before starting work — other agents may have pushed changes
- Keep the repo clean: no dead code, no leftover debug logs, no unrelated changes in commits

## Context

This is a hackathon project for PORT 2026 / GSSC. The `archive/` folder contains the earlier "Preflight" project (content quality infrastructure) and related research.
