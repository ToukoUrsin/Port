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

## Contents

| File | What |
|------|------|
| **MISSION.md** | **The soul: contributor feels proud, reader feels interested, community feels represented** |
| MISSION_QUESTIONS.md | Top questions about the mission — pride line, asking tone, time pressure |
| JOURNALISM_CRAFT.md | Research: rules, structures, and techniques of professional journalism (the knowledge base) |
| LANDSCAPE.md | Prior art: who else does this (nobody does all three) |
| VOICE_TO_ARTICLE.md | Technical challenges: Whisper, quotes, Finnish, faithfulness |
| TOP_5_CHALLENGES.md | The 5 hard problems to solve before building |
| EDITORIAL_RULES.md | The journalistic principles encoded into the prompts |
| PRIOR_ART_LESSONS.md | What to steal from existing tools (actionable) |
| **OUTPUT_FORMAT.md** | **Why JSON output was wrong. Markdown article + metadata sidecar. Flexible structure, not fixed.** |
| **HOW_PROS_MAKE_NEWS.md** | **Deep research: professional journalism workflows, tools, small newsroom reality, reporter-editor relationship, citizen journalism, Finnish journalism. 60+ sources.** |
| **HOW_PEOPLE_WANT_NEWS.md** | **Deep research: news consumption & sharing patterns, psychology of sharing, community reporting motivations, news deserts, Finnish/Nordic specifics. 70+ sources.** |

**Not yet written** (need proper research first):
- UX design — the contributor experience from "something happened" to "my article is published"
- Pipeline architecture — how many calls, what each does, data flow
- Generation prompt — the actual article generation (must follow OUTPUT_FORMAT decisions)
- Review prompt — the quality review layer
- Prompt testing — gate tests before building UI

## Read Order

1. **MISSION.md** — what we're optimizing for (read this first, it drives everything)
2. **HOW_PROS_MAKE_NEWS.md** + **HOW_PEOPLE_WANT_NEWS.md** — the reality of news production and consumption
3. JOURNALISM_CRAFT.md — the craft of journalism itself (research, examples, rules)
4. LANDSCAPE.md + PRIOR_ART_LESSONS.md — what exists, what to steal
5. VOICE_TO_ARTICLE.md + TOP_5_CHALLENGES.md — the hard problems
6. EDITORIAL_RULES.md — what good journalism actually means (the spec)
7. **OUTPUT_FORMAT.md** — the output format decision (read before writing any prompts)

## The Thesis

The moat is not "we use AI to write articles" — everyone can do that. The moat is "we use AI to produce *journalism*" — articles with proper structure, real attribution, neutral tone, identified gaps, and editorial review. The prompts that achieve this are the core IP. They encode decades of journalism training into a pipeline that runs in 15 seconds for 3 cents.
