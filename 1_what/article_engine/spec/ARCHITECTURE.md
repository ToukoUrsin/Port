# Article Engine Architecture — The Build Plan
# Date: 2026-03-07 UTC+3

The locked-in architecture for the hackathon. Three API calls: transcribe, generate, review. The review does everything — faithfulness verification, quality scoring, gate classification, coaching — because that's what a small-newsroom editor does. One read, one assessment, one response.

Decision rationale in ARCHITECTURE_DECISION.md.

---

## The Analogy That Drives the Design

The article engine is a **small-newsroom editor**. At a weekly paper with one editor, that person reads the article once. In that single read they check facts against their notes, assess quality, check tone, and give feedback. They don't decompose it into separate passes. The decomposition (fact-checker -> copy editor -> section editor) only happens at large outlets with multiple staff.

We're not the New York Times with a fact-checking department. We're the solo editor at a community paper who reads the piece, catches the errors, checks the quotes, and says "this is great, but did you get the vote count?"

The same analogy applies to agentic coding tools: gather context -> plan -> generate -> verify+review -> human feedback -> loop. The verify and review are one step, not two.

---

## The Pipeline: Three Calls

```
STAGE 1: GATHER (parallel)        ~8s
  transcribe audio (ElevenLabs)  ──┐
  describe photos (Claude vision) ──┤── goroutines, wait for all
  parse notes (local)             ──┘

STAGE 2: GENERATE (Claude)        ~8s
  One call with extended thinking.
  Internally: extract -> classify -> draft.
  Output: article_markdown + metadata_sidecar.

STAGE 3: REVIEW (Claude)          ~6s
  One call, four phases in sequence within the prompt:
  1. VERIFY — check every claim against transcript
  2. SCORE — evaluate 6 quality dimensions
  3. GATE — apply evidence-severity matrix
  4. COACH — celebrate what's good, ask 1-2 questions
  Output: JSON with scores, gate, triggers, coaching.

TOTAL: ~22s, 3 API calls, ~$0.04
```

---

## Stage 1: GATHER (parallel)

Transcription, photo description, and note parsing are independent. Run simultaneously.

```go
// All three run as goroutines, results collected via channels
transcript, language := elevenlabs.Transcribe(audio)    // ~5-10s
photoDescs := claude.DescribePhotos(photos)              // ~3-5s
parsedNotes := parseNotes(notes)                         // instant
```

Total: ~5-10s (limited by the slowest call, not the sum).

Cost: ~$0.02 (transcription + vision).

---

## Stage 2: GENERATE (Claude with extended thinking)

One Claude call. Extended thinking handles the extract -> classify -> draft chain internally without separate API calls.

### System prompt encodes:

- 10 editorial rules from EDITORIAL_RULES.md
- Structure selection guidance from OUTPUT_FORMAT.md (news_report, feature, photo_essay, brief, narrative)
- Quote extraction rules (source/cue/content decomposition from PRIOR_ART_LESSONS.md)
- Few-shot editorializing-to-facts transformations (from JOURNALISM_CRAFT.md Section 6D)
- Anti-hallucination constraints: "ONLY include information from the source material. If unclear, say so. NEVER invent details."
- Faithfulness rules: every claim must be traceable to transcript, notes, or photos

### User prompt:

```
Transcript: {transcript}
Notes: {parsed_notes}
Photos: {photo_descriptions}
Town context: {town_context}
[If refinement: Previous draft: {previous_article}]
[If refinement: Contributor says: {direction}]

Write a local news article in markdown. Choose the structure
that fits the content. After the article, output a metadata block.
```

### Extended thinking internally does:

1. Extract facts and label sources (from transcript / from photo / from notes)
2. Identify and structure quotes as {source, cue, content, confidence}
3. Classify article type
4. Plan the structure (which facts lead, where quotes go, what's missing)
5. Draft the article

### Output:

```
article_markdown + metadata {
  chosen_structure,
  category,
  confidence,
  missing_context[]
}
```

Cost: ~$0.02. Latency: ~5-10s.

---

## Stage 3: REVIEW (Claude, one call, four phases)

The editor reads the piece. One call does everything. The prompt is structured so the model works through four phases in order — verification first (clinical), coaching last (warm). The order matters: by the time the model generates coaching, it has already done the adversarial work and can shift register.

### System prompt:

```
You are the editor at a community newspaper. You review articles
submitted by community contributors. You do four things in order:

PHASE 1 — VERIFY FAITHFULNESS
For each factual claim in the article, find supporting evidence
in the source transcript and notes. Flag any claim where:
- No supporting evidence exists in the source ("NOT IN SOURCE")
- The article adds specificity not in the source — exact numbers,
  full names, dates, titles that the contributor didn't mention
  ("POSSIBLE HALLUCINATION")
- A quote appears that isn't in the transcript ("FABRICATED QUOTE")

PHASE 2 — SCORE QUALITY
Evaluate the article across 6 dimensions. For each, score 0.0-1.0
and note specific observations from THIS article:

1. EVIDENCE — Are claims attributed? Are quotes from the transcript?
2. PERSPECTIVES — How many stakeholder voices are represented?
3. REPRESENTATION — Are communities discussed given their own voice?
4. ETHICAL FRAMING — Privacy, dignity, power dynamics respected?
5. CULTURAL CONTEXT — Cultural references explained? Respectful terminology?
6. MANIPULATION — Does it read like advertising, campaigning, or targeting?

[Operationalized checklists from QUALITY_PROBLEM.md for each dimension]

PHASE 3 — DETERMINE GATE
Apply the evidence-severity matrix:

                    EVIDENCE STRENGTH
                    Low       Medium     High
               +----------+----------+----------+
    Low        |  GREEN   |  GREEN   |  GREEN   |
    (bakery)   |          |          |          |
               +----------+----------+----------+
 SEVERITY Med  |  YELLOW  |  GREEN   |  GREEN   |
    (vote)     |          |          |          |
               +----------+----------+----------+
    High       |  RED     |  YELLOW  |  GREEN   |
    (accuse)   |          |          |          |
               +----------+----------+----------+

Red triggers (any of these = gate RED):
- Hallucinated claim flagged in Phase 1
- Fabricated quote flagged in Phase 1
- Unattributed accusation against a named person
- Hate speech, slurs, calls for violence
- Naming minors in sensitive contexts
- Publishing private addresses/phone numbers

For each red trigger, provide:
  dimension, trigger_type, paragraph, sentence,
  specific explanation, and 2-3 fix_options.

Gate is deterministic: any red trigger = RED.
Any yellow flag but no red = YELLOW. Otherwise GREEN.

PHASE 4 — COACHING
Now, as the contributor's mentor — not their critic:

1. First, celebrate what's good. Reference specific content.
   "The quote from Maria really captures the frustration."
2. Then, ask at most 2 questions that would make it better.
   Phrase as curiosity, not criticism:
   "Do you remember roughly how many people were there?"
   NOT "The article is missing attendance numbers."
3. If the article hit a red gate, frame the fix as making
   the story bulletproof, not as a failure:
   "This is a strong story. To publish the claim about Virtanen,
   we need to say who told you — that makes it airtight."
```

### User prompt:

```
Article: {article_markdown}
Source transcript: {transcript}
Source notes: {notes}
Photo descriptions: {photo_descriptions}
```

### Output:

```json
{
  "verification": [
    {"claim": "...", "evidence": "...", "status": "SUPPORTED|NOT_IN_SOURCE|POSSIBLE_HALLUCINATION|FABRICATED_QUOTE"}
  ],
  "scores": {
    "evidence": 0.8,
    "perspectives": 0.6,
    "representation": 0.7,
    "ethical_framing": 0.9,
    "cultural_context": 0.8,
    "manipulation": 0.95
  },
  "gate": "GREEN|YELLOW|RED",
  "red_triggers": [],
  "yellow_flags": [],
  "coaching": {
    "celebration": "The quote from Maria...",
    "suggestions": ["Do you remember...", "Were any parents..."]
  }
}
```

Cost: ~$0.01. Latency: ~5-8s.

### What the contributor sees vs. what the system stores

The review JSON contains scores, verification details, gate, triggers, and coaching. Not all of it is contributor-facing. The split:

**Contributor sees:**
- The gate (GREEN / YELLOW / RED) — as a simple status, not a traffic light of shame
- The coaching text (celebration + 1-2 questions)
- If RED: the specific fix needed, framed warmly ("To publish the claim about Virtanen, we need to say who told you — that makes it airtight")
- If YELLOW: optional suggestions for improvement

**Contributor does NOT see:**
- The six numerical scores (0.0-1.0). These are internal editorial data. Showing `perspectives: 0.4` turns mentoring into grading. The mission says "the score is a guide, not a grade" — so the guide is the coaching text, not six labeled numbers.
- The raw verification array. The contributor doesn't need to see "SUPPORTED" / "NOT_IN_SOURCE" for every claim. They need to see the coaching that results from it.

**Frontend can use scores for:**
- A single, unlabeled quality indicator (a progress ring, a "getting stronger" animation between rounds) — but never as labeled dimensions
- Showing improvement across refinement rounds ("your article got stronger") without exposing the axis

**The system stores everything.** The full review JSON goes to the database for analytics, A/B testing prompts, and detecting quality trends. The API returns it all; the frontend decides what to render. But the architecture's intent is clear: scores power the gate and coaching, they don't face the contributor directly.

### Why verification lives inside the review

The navigator analysis (bidirectional search from SIMPLE_UNIVERSAL_NAVIGATOR.logos) converged on this: the backward beam (what we need: faithful articles, fast, pride-preserving) and the forward beam (what we have: Claude can hold article + transcript in one context, review already reads both) meet at the same node — the review call.

A separate verify stage models a large newsroom's division of labor. The article engine is a small newsroom. One editor, one read, one response.

Hallucinations caught in Phase 1 become red triggers in Phase 3. The contributor sees "this claim wasn't in your recording" as a specific, actionable gate — not a separate error screen. One refinement round fixes it. Same outcome as a separate verify step, half the API calls, 4 seconds less latency.

---

## Phase Mapping

How the pipeline maps to THE_CONTRIBUTOR_CYCLE.md's 7 phases:

| Contributor Cycle Phase | Pipeline Action |
|---|---|
| Phase 1: WITNESS | Not in pipeline — the contributor decides to act |
| Phase 2: CAPTURE | POST /submissions (save audio + photos + notes) |
| Phase 3: DRAFT | Initial pipeline: GATHER → GENERATE → REVIEW |
| Phase 4: REFINE | 0-N rounds of POST /refine → GET /stream (GENERATE → REVIEW) |
| Phase 5: PUBLISH | POST /publish (blocked if gate == RED) |
| Phase 6: IMPACT | Post-pipeline (read counts, shares — not covered here) |
| Phase 7: RETURN | Product-level (lower barrier next time — not covered here) |

---

## The Refinement Loop (Outer Loop)

The contributor drives 0-N refinement rounds. Each round reruns GENERATE + REVIEW (~14s, ~$0.03).

```
submission = save(audio, photos, notes)

// --- Initial pipeline ---
context = GATHER(submission)                    // parallel, ~8s
article, meta = GENERATE(context)               // ~8s
review = REVIEW(article, context)               // ~6s
send_to_frontend(article, meta, review)         // SSE

// --- Refinement loop (0-N rounds) ---
while contributor has not published or abandoned:
    wait for contributor action:

        case PUBLISH:
            if review.gate == RED:
                reject_with_coaching(review.coaching, review.red_triggers)
                // Response includes the warm coaching text + specific fixes,
                // not a mechanical "resolve red triggers first."
                // The contributor sees: "This is a strong story. To publish
                // the claim about Virtanen, we need to say who told you."
            else:
                publish(article)
                break

        case REFINE(input):
            if input.voice_clip:
                new_transcript = transcribe(input.voice_clip)
                direction = new_transcript
            else:
                direction = input.text_note

            article, meta = GENERATE(context + direction + previous_article)
            review = REVIEW(article, context)
            send_to_frontend(article, meta, review)

        case APPEAL_RED:
            escalate_to_human_review(submission)
```

### Version history

Each refinement round stores the previous version. The submission has a `versions[]` array:

```
{article, metadata, review, contributor_input, timestamp}
```

Two purposes:
1. **Show improvement** — frontend can highlight what changed between rounds
2. **Rollback** — contributor can go back if a refinement made the article worse

---

## API Shape

```
POST /api/submissions
  -> save audio + photos + notes to disk + DB
  -> return {submission_id}

GET /api/submissions/{id}/stream  (SSE)
  -> run pipeline (GATHER -> GENERATE -> REVIEW)
  -> stream events:
       transcribing -> generating -> reviewing -> complete
  -> final event: {article, metadata, review}

POST /api/submissions/{id}/refine
  -> accept voice_clip (multipart) OR text_note OR both
  -> mark submission as "pending refinement"
  -> return {status: "ready_to_stream"}
  -> frontend opens /stream again

POST /api/submissions/{id}/publish
  -> if gate != RED: publish, return {status: "published", article_id}
  -> if gate == RED: return {coaching, red_triggers, fix_options}
     // No mechanical "error" — the response carries the warm coaching
     // text so the frontend can show "This is a strong story. To publish..."
     // alongside the specific fix needed.

POST /api/submissions/{id}/appeal
  -> escalate to human review queue
  -> return {status: "under_review"}
```

---

## SSE Events

```
event: status    data: {"stage": "transcribing"}
event: status    data: {"stage": "generating"}
event: status    data: {"stage": "reviewing"}
event: complete  data: {
  "article": "# Council Approves Budget...\n\n...",
  "metadata": {"structure": "news_report", "category": "council", ...},
  "review": {
    "gate": "GREEN",
    "coaching": {"celebration": "...", "suggestions": [...]},
    "scores": {...},           // internal — frontend renders gate + coaching,
    "verification": [...],     // not raw scores or verification array
    "red_triggers": [],
    "yellow_flags": []
  }
}
```

---

## Latency and Cost

### Per article (initial pipeline)

```
GATHER (parallel):  ~8s     $0.02
GENERATE:           ~8s     $0.02
REVIEW:             ~6s     $0.01
────────────────────────────────
Total:              ~22s    $0.05
```

### Per refinement round

```
GENERATE:           ~8s     $0.02
REVIEW:             ~6s     $0.01
(+ transcribe if voice clip: ~5s, $0.01)
────────────────────────────────
Total:              ~14s    $0.03-0.04
```

### Demo budget

```
Typical article (0-1 refinement):  $0.05 - $0.09
Heavy refinement (3 rounds):       $0.14
50-article demo:                    $2.50 - $4.50
```

---

## Context Gathering: The Most Important Lesson

From agentic coding tools: **the quality of the output is determined by the quality of the context, not the quality of the generation.** A coding agent that reads the right files before editing produces dramatically better code than one that generates blind.

For the article engine: invest prompt engineering time in the generation system prompt (editorial rules, structure selection, quote handling, anti-hallucination constraints, few-shot examples) rather than in pipeline complexity. A well-prompted single call outperforms a poorly-prompted multi-step chain.

### Hackathon context

The `town_context` parameter is a static blob — basic information about the town. Sufficient for the demo.

### Production context (future)

The generation call could dynamically gather:
- Previous articles about the same topic/location
- Public meeting agendas to cross-reference the contributor's account
- Correct spelling of council members' names from municipal records
- Background context ("third time the budget has been contested")

This is tool use in the agentic sense. The architecture leaves room for it.

---

## Why No Framework

The pipeline is a **fixed graph**, not a dynamic agent. Three calls in sequence with some parallelism. Go handles this natively:

```go
// The entire pipeline
ctx := gather(audio, photos, notes)     // parallel goroutines
article := generate(ctx)                 // one Claude call
review := review(article, ctx)           // one Claude call
stream(article, review)                  // SSE to frontend
```

No LangGraph, no Guardrails AI, no workflow engine. The sophistication lives in the prompts, not the orchestration. The 15+ research files in `article_engine/` ARE the framework — they get distilled into two system prompts (generation + review).

### When to add infrastructure (production)

- **Observability** — trace each call, token counts, latency, cost
- **State persistence** — resume after crash
- **A/B testing** — compare prompt variants
- **Rate limiting** — handle concurrent submissions
- **Monitoring** — detect hallucination rate spikes

---

## Production Upgrades (Not Now)

Documented for future reference. None of these are needed for the hackathon.

### Inner loop (generate -> verify -> retry)

If the combined review isn't catching enough hallucinations, split verification into a separate call that runs before the review. If it finds hallucinations, regenerate before the contributor sees the draft. Adds ~4-12s latency and one API call, but the contributor sees a cleaner first draft.

### Separate coaching call

If coaching quality suffers from sharing a prompt with adversarial review, split coaching into its own parallel call with a mentor-toned prompt. Adds ~$0.01 per article but the coaching is warmer and more specific.

### Tier 2 pre-filter (HHEM / MiniCheck)

For high volume: run a 770M parameter faithfulness model (~1.5s, CPU, free) before the Claude review. Clean articles skip the expensive review call. Cuts verification cost ~60% at scale. See FACT_CHECKING_LANDSCAPE.md.

### Transcript confirmation

Before generation, show the transcript to the contributor. Let them fix obvious transcription errors. Breaks the SSE stream into two async steps but significantly improves faithfulness. Design the data model to support this (transcript as a separate editable entity).

### Dynamic context gathering

Equip the generation call with tools: search previous articles, look up public records, verify proper nouns against municipal databases. Richer context -> better articles -> less contributor effort.

---

## Data Flow

```
[Contributor]
    |
    | voice memo + photos + notes
    v
[POST /submissions] ——> save to DB + disk
    |
    v
[GET /stream] ———————————————————————————————+
    |                                         |
    v                                         |
[GATHER] parallel:                            |
    transcribe (ElevenLabs, ~8s)              |
    describe photos (Claude vision)           |
    parse notes                               |
    |                                         |
    v                                         |
[GENERATE] Claude + extended thinking (~8s)   |
    extract -> classify -> draft internally   |
    |                                         |
    | article_markdown + metadata             |
    v                                         |
[REVIEW] Claude, 4 phases (~6s)              |
    verify -> score -> gate -> coach          |
    |                                         |
    v                                         |
[SSE: complete] ——————————————————————————————+
    |
    v
[Frontend: show draft + coaching + gate]
    |
    +——> [Publish] ——> POST /publish ——> article live
    |
    +——> [Refine] ——> POST /refine (voice/text)
    |       |
    |       v
    |    [GET /stream] ——> GENERATE ——> REVIEW ——> updated draft
    |       |
    |       +——> back to [Frontend]
    |
    +——> [Appeal red gate] ——> POST /appeal ——> human queue
```

---

## What This Does NOT Cover

- Post-publication moderation / community flagging
- Embedding / semantic search
- Coverage map / geographic visualization
- Multi-contributor stories
- Pattern-level manipulation detection (requires corpus)
- Phase 6 (IMPACT) metrics and Phase 7 (RETURN) engagement loops

---

## Summary

Three calls. Transcribe, generate, review. The review is the editor — it verifies, scores, gates, and coaches in one read. The contributor sees a draft and coaching in ~22 seconds for 5 cents. The prompts encode the journalism craft. Everything else is plumbing.

```
GATHER ──parallel──> GENERATE ──> REVIEW ──> FRONTEND
  |                    |             |
  transcribe           extended      one call, four phases:
  describe photos      thinking      1. verify claims
  parse notes          handles       2. score 6 dimensions
                       extract/      3. determine gate
                       classify/     4. coach contributor
                       draft
```
