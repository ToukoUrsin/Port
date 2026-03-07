# The Article Engine — How to Turn Anyone into a Pro Journalist
# Date: 2026-03-07 UTC+3

This is the moat. The prompts, the pipeline design, the editorial intelligence that makes the output *journalism* instead of *blog posts*. Everything else (UI, deployment, even the quality review) is replicable. This isn't.

---

## The Problem

Anyone can paste a transcript into ChatGPT and get an article. The result reads like a blog post: chronological, editorializing, no structure, quotes dropped in randomly, no sense of what matters. That's not journalism. The gap between "AI-generated article" and "AI-generated journalism" is enormous, and closing it is the core technical challenge.

## What Makes Journalism Different from Blog Posts

| Element | Blog Post (ChatGPT default) | Journalism |
|---------|----------------------------|------------|
| Structure | Chronological or rambling | Inverted pyramid — most important fact first |
| Opening | "Today we're going to talk about..." | Lead: the news in one sentence |
| The "so what" | Buried or missing | Nut graf: paragraph 2-3, why this matters |
| Quotes | Dropped in, sometimes invented | Extracted from transcript, attributed, placed for impact |
| Tone | Editorializing ("amazing event!") | Neutral, factual ("the event drew 200 attendees") |
| Opinion | Mixed with facts | Clearly separated or removed entirely |
| Context | Assumed or absent | Background woven in ("the first such event since 2019") |
| Missing info | Ignored | Acknowledged ("the council did not respond to requests for comment") |
| Sources | Vague | Every claim tied to a specific source |

## What the Engine Must Do

```
RAW INPUT (messy, human, real):
  - Voice transcript: "so yeah the council meeting was pretty wild,
    they voted on the budget, it was like 5-2, and Mrs. Korhonen was
    really upset about the school funding cuts, she said something
    like 'our children deserve better than this'..."
  - 2 photos of the council chamber
  - Notes: "budget vote, school cuts, heated"

OUTPUT (professional local journalism):
  HEADLINE: Council Approves Budget 5-2 Amid School Funding Protests

  LEAD: The Kirkkonummi town council voted 5-2 Tuesday evening to
  approve the 2026 municipal budget, drawing sharp criticism from
  residents over proposed cuts to school funding.

  NUT GRAF: The budget, which reduces education spending by [X]%,
  has been contentious since its first reading in January. Tuesday's
  vote followed three hours of public comment.

  BODY: "Our children deserve better than this," said council member
  Korhonen, one of two dissenting votes. [...]

  CONTEXT: The budget vote comes as Kirkkonummi faces [relevant
  background the contributor mentioned elsewhere in their recording].
```

---

## Contents

### spec/ — Build from these (locked-in design decisions)

| File | What |
|------|------|
| **MISSION.md** | The soul: contributor feels proud, reader feels interested, community feels represented |
| **THE_CONTRIBUTOR_CYCLE.md** | The ideal human experience: 7 phases from witness to return. Pride cycle flywheel. Refinement modes. |
| **QUALITY_PROBLEM.md** | What must not be published. 7 problem levels, proportional evidence model, 6 quality dimensions, GREEN/YELLOW/RED gate. |
| **OUTPUT_FORMAT.md** | Why JSON was wrong. Markdown article + metadata sidecar. Flexible structure selection. |
| **EDITORIAL_RULES.md** | The 10 journalistic principles that become prompt constraints and review checks. |
| **ARCHITECTURE.md** | The build plan. 3 calls (gather, generate, review). Extended thinking. Review = verify+score+gate+coach. ~22s, $0.05/article. Data flow. API shape. |
| **ARCHITECTURE_DECISION.md** | Why 3 calls not 5. Navigator analysis. Small-newsroom-editor analogy. When to revisit. |

### spec/build/ — Implementation specs (bridge from research to code)

Read in order: PROMPTS_SPEC → BACKEND_UPDATE_SPEC → FRONTEND_CONTRACT. Each is self-contained.

| File | What |
|------|------|
| **PROMPTS_SPEC.md** | The two system prompts (generation + review), photo vision prompt, town context, output schemas, 7 test cases. Root dependency for implementation. |
| **BACKEND_UPDATE_SPEC.md** | Go model changes, new service interfaces, pipeline updates, new endpoints (refine, appeal), state machine. References PROMPTS_SPEC.md. |
| **FRONTEND_CONTRACT.md** | TypeScript type changes (old → new), API client updates, PostPage rewrite (block editor → markdown + coaching), SSE payload changes. |

### Research — Informed the decisions above

| File | What |
|------|------|
| LANDSCAPE.md | Prior art: who else does this (nobody does all three) |
| PRIOR_ART_LESSONS.md | What to steal from existing tools (22 actionable lessons) |
| HOW_PROS_MAKE_NEWS.md | Professional journalism workflows, small newsroom reality, Finnish journalism. 60+ sources. |
| HOW_PEOPLE_WANT_NEWS.md | News consumption & sharing patterns, community reporting motivations, Finnish/Nordic specifics. 70+ sources. |
| JOURNALISM_CRAFT.md | Rules, structures, and techniques of professional journalism |
| VOICE_TO_ARTICLE.md | Technical challenges: Whisper, quotes, Finnish, faithfulness |
| TOP_5_CHALLENGES.md | The 5 hard problems (hallucination, quotes, journalism vs blog, Finnish, specific review) |
| MISSION_QUESTIONS.md | Open questions about the mission |
| FACT_CHECKING_LANDSCAPE.md | Hallucination detection: 3 tiers, tools evaluated, hackathon vs production strategy |

### Build specs

See `spec/build/` above. Read in order: PROMPTS_SPEC → BACKEND_UPDATE_SPEC → FRONTEND_CONTRACT.

---

## Read Order

For understanding: start with research, then spec.

1. **spec/MISSION.md** — what we're optimizing for (read first, drives everything)
2. HOW_PROS_MAKE_NEWS.md + HOW_PEOPLE_WANT_NEWS.md — the reality of news
3. JOURNALISM_CRAFT.md — the craft itself
4. LANDSCAPE.md + PRIOR_ART_LESSONS.md — what exists, what to steal
5. VOICE_TO_ARTICLE.md + TOP_5_CHALLENGES.md — the hard problems
6. **spec/EDITORIAL_RULES.md** — rules that become prompts
7. **spec/OUTPUT_FORMAT.md** — the output format decision
8. **spec/THE_CONTRIBUTOR_CYCLE.md** — the human experience
9. **spec/QUALITY_PROBLEM.md** — the quality gate
10. **spec/ARCHITECTURE.md** — how it all becomes code

For building: read only `spec/`. Everything in spec/ is self-contained — the research conclusions are already absorbed into these documents.

---

## The Thesis

The moat is not "we use AI to write articles" — everyone can do that. The moat is "we use AI to produce *journalism*" — articles with proper structure, real attribution, neutral tone, identified gaps, and editorial review. The prompts that achieve this are the core IP. They encode decades of journalism training into a pipeline that runs in 22 seconds for 5 cents.
