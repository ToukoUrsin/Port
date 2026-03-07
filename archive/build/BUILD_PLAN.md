# Blind Spot — 30-Hour Build Plan

> Scope: working demo that survives a 3-minute pitch + live Q&A.
> Principle: every hour must produce something demo-able. No hour is "setup only."

---

## Phase 0: Foundation (Hours 0-2)

**Goal:** Skeleton running. Input box -> API call -> JSON response -> rendered on screen.

- [ ] `npm create vite@latest blind-spot -- --template react-ts`
- [ ] Express backend with single `/api/analyze` endpoint
- [ ] Claude API integration (Sonnet, JSON mode)
- [ ] Hardcoded prompt, hardcoded topic
- [ ] Raw JSON rendered on screen

**Demo-able after Phase 0:** Ugly but functional — type topic, get perspective JSON.

## Phase 1: Core Prompt Engineering (Hours 2-6)

**Goal:** The LLM consistently produces high-quality perspective decompositions.

- [ ] Iterate prompt until output is consistently good across 10+ topics
- [ ] Test edge cases: polarizing topics, niche topics, ambiguous topics
- [ ] Calibrate quality scores: test against known-verified and known-contested claims
- [ ] Structured JSON schema validation (zod or similar)
- [ ] Pre-cache 3 demo topics (AI in education, climate policy, social media regulation)

**Demo-able after Phase 1:** Paste topic, get clean structured output. The intelligence works.

## Phase 2: Frontend v1 — Cards (Hours 6-12)

**Goal:** Clean card-based UI that displays perspectives, quality scores, connections, gaps.

- [ ] Topic input with search-bar UX
- [ ] Loading state (progress indicator, not spinner)
- [ ] Perspective cards: label, claim, quality bar (color gradient), blind spots
- [ ] Connection display between cards (agreement/divergence)
- [ ] Gap card(s): ghost styling, subtle animation
- [ ] "Flat feed" view toggle (for the before/after demo moment)
- [ ] Responsive layout (judges may use phones)

**Demo-able after Phase 2:** The full demo flow works. This is the minimum viable pitch.

## Phase 3: Visual Upgrade — Graph (Hours 12-18)

**Goal:** D3.js perspective graph that makes judges go "wow."

- [ ] Force-directed graph: perspectives as nodes, connections as edges
- [ ] Quality score -> node color (blue...yellow...red gradient)
- [ ] Agreement edges: solid, weighted by strength
- [ ] Divergence edges: dashed
- [ ] Gap nodes: outlined, pulsing glow
- [ ] Click node -> expand to card detail
- [ ] Smooth animated transition: "flat feed" -> "perspective graph" (THE demo moment)
- [ ] OPTIONAL: Hyperbolic layout (only if D3 integration works cleanly, otherwise skip)

**Demo-able after Phase 3:** Visually impressive. The transformation animation is the jaw-drop.

## Phase 4: URL Comparison (Hours 18-22)

**Goal:** Second input mode — paste 2 URLs, see the bridge between them.

- [ ] URL input mode (toggle from topic mode)
- [ ] Fetch article text from URLs (simple fetch + readability extraction)
- [ ] `/api/compare` endpoint: two texts -> perspective comparison
- [ ] Bridge visualization: two main nodes + shared/divergent sub-nodes
- [ ] Fallback: if URL fetch fails, user can paste text directly

**Demo-able after Phase 4:** Two input modes. Topic exploration + URL comparison.

## Phase 5: Demo Hardening (Hours 22-26)

**Goal:** Nothing breaks during the pitch.

- [ ] Pre-cache all demo topics (instant response, no API wait)
- [ ] Graceful error states (API timeout -> "analyzing..." -> cached fallback)
- [ ] Test on projector resolution (large fonts, high contrast)
- [ ] Test on mobile (judges' phones)
- [ ] Test with slow/no wifi (cached mode works offline)
- [ ] One-click demo reset between topics
- [ ] Remove all debug UI, console logs, placeholder text

## Phase 6: Pitch Prep (Hours 26-30)

**Goal:** 3-minute pitch that lands.

- [ ] Rehearse full script 5+ times
- [ ] Time each section (0:30 hook, 1:00 demo, 1:00 market, 0:30 close)
- [ ] Assign roles: who pitches, who runs the demo, who handles Q&A
- [ ] Prepare Q&A answers (see PITCH_SCRIPT.md)
- [ ] Print backup: screenshots of demo in case of total tech failure
- [ ] Final run-through with timer

---

## Decision Points

| Hour | Decision | If YES | If NO |
|------|----------|--------|-------|
| 6 | Prompt quality good enough? | Proceed to frontend | More prompt iteration |
| 12 | Cards UI clean? | Proceed to graph | Polish cards (skip graph) |
| 16 | D3 graph working? | Proceed to animation | Stay with cards layout |
| 18 | Hyperbolic layout working? | Use it | Force-directed (already works) |
| 22 | URL comparison done? | Polish | Cut it, focus on topic mode |
| 26 | Demo stable? | Pitch prep | Fix bugs (cut pitch rehearsal short) |

## Kill List (Cut in Order if Behind Schedule)

1. Hyperbolic layout (force-directed is fine)
2. URL comparison mode (topic mode is the primary demo)
3. Graph visualization (cards are sufficient)
4. Click-to-expand detail view (show the overview only)
5. Mobile responsiveness (demo on laptop only)

**Never cut:** Core prompt quality, quality score colors, gap detection, flat->structured transition, pre-cached demo topics.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + TypeScript + Vite | Fast dev, team likely knows it |
| Visualization | D3.js (force-directed, optionally hyperbolic) | Industry standard, flexible |
| Styling | Tailwind CSS | Fast, responsive, consistent |
| Backend | Express.js | Thin layer, just proxies to Claude |
| LLM | Claude Sonnet (via Anthropic SDK) | Fast, structured output, our API |
| Deployment | Vercel or local | Vercel for URL sharing, local for demo reliability |
