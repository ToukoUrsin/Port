# Before Code — What the Architecture Hasn't Resolved
# Date: 2026-03-07 UTC+3

Navigator analysis: BIDIRECTIONAL SEARCH.
TARGET: "ready to code the article engine."
SUPERPOSE: what exists — ARCHITECTURE.md, TECH_SPEC.md, EDITORIAL_RULES.md, OUTPUT_FORMAT.md, QUALITY_PROBLEM.md, THE_CONTRIBUTOR_CYCLE.md, MISSION.md.

The beams meet in some places (pipeline shape, API surface, gate logic). They don't meet in others. This file names the gaps.

---

## GAP 1: The Prompts Don't Exist (BRIDGE_NEEDED — highest priority)

ARCHITECTURE.md says "the 15+ research files ARE the framework — they get distilled into two system prompts (generation + review)." EDITORIAL_RULES.md says "See GENERATION.md and REVIEW.md for the full prompt implementations." Those files don't exist.

The architecture is a vessel. The prompts are the contents. The mission (pride, mentoring, warmth) lives or dies in the exact wording of two system prompts. Without them, a developer coding the pipeline will write placeholder prompts that miss the editorial rules, the tone calibration, the few-shot examples, the anti-hallucination constraints, the coaching register shift.

**What's needed:**
- `GENERATION_PROMPT.md` — the actual system prompt for article generation. Encodes all 10 editorial rules, structure selection, quote handling, anti-hallucination constraints, few-shot editorializing-to-facts transformations. This is the single highest-leverage artifact in the entire project.
- `REVIEW_PROMPT.md` — the actual system prompt for the 4-phase review. The Phase 4 coaching tone is especially critical — it must shift register from adversarial (verification) to warm (mentoring) within one prompt.

These are not "nice to have." They are the product. The pipeline without these prompts is an empty pipe.

**Why before code:** A developer can code the HTTP handler, the SSE streaming, the DB operations without the prompts. But they can't test the pipeline. They can't iterate on quality. They can't verify the mission is served. The prompts should be drafted, tested against 5-10 varied inputs (council meeting, bakery opening, thin clip, accusation edge case), and refined BEFORE the pipeline code wraps around them. Prompt-first, plumbing-second.

---

## GAP 2: TECH_SPEC and ARCHITECTURE.md Disagree on Data Model

The backward beam (what the architecture needs) and the forward beam (what TECH_SPEC defines) collide at the data model.

### Article format conflict

ARCHITECTURE.md + OUTPUT_FORMAT.md: the article is **markdown**. The AI writes prose. Each article has unique structure. "JSON as primary article output format" is explicitly listed under "What Dies."

TECH_SPEC.md: the submission uses `Block` structs — `{type: "text", content: "..."}`, `{type: "heading", level: 2}`, `{type: "quote", author: "..."}`. This IS the structured JSON that OUTPUT_FORMAT.md killed.

**Resolution needed:** One format wins. The research says markdown. The data model should store `article_markdown TEXT` (the generated article) alongside the `meta JSONB` (metadata sidecar, review results). The `Block` struct either dies or becomes a post-render concern (markdown → blocks for frontend rendering).

### Review model conflict

ARCHITECTURE.md: review output is `{verification[], scores{6 dimensions}, gate, red_triggers[], yellow_flags[], coaching{celebration, suggestions[]}}`.

TECH_SPEC.md: review is `ReviewResult{Score int, Flags []ReviewFlag, Approved bool}`. Single integer score. Boolean approved. No dimensions, no gate, no coaching, no verification array.

**Resolution needed:** TECH_SPEC's `ReviewResult` struct must be rewritten to match ARCHITECTURE.md's review output. This is not a minor update — it changes the submission model, the SSE complete event payload, and the frontend's review rendering.

### Missing submission states

ARCHITECTURE.md defines: initial pipeline, refinement rounds, RED gate appeal. TECH_SPEC defines states: `Draft(0) → Transcribing(1) → Generating(2) → Reviewing(3) → Ready(4) → Published(5) → Archived(6)`.

Missing from TECH_SPEC:
- `Refining` — submission is in a refinement round (GENERATE + REVIEW rerunning)
- `Appealed` — contributor appealed a RED gate, awaiting human review
- No way to track which refinement round the submission is on
- No `versions[]` array for rollback (ARCHITECTURE.md specifies this)

**Resolution needed:** Add states, add a versions table or JSONB array, add refinement tracking.

---

## GAP 3: Submission State Machine Not Explicit

ARCHITECTURE.md describes the flow narratively. But the valid state transitions aren't enumerated. In code, this becomes race conditions.

What happens if:
- The contributor hits "publish" while a refinement round is still processing?
- The contributor starts a new refinement before the previous one completes?
- The SSE connection drops mid-pipeline — does reopening `/stream` restart or resume?
- Two browser tabs open on the same submission?

**What's needed:** An explicit state machine diagram:

```
Draft → [stream opened] → Transcribing → Generating → Reviewing → Ready
Ready → [publish, gate != RED] → Published
Ready → [publish, gate == RED] → Ready (return coaching)
Ready → [refine] → Refining → Generating → Reviewing → Ready
Ready → [appeal] → Appealed → [human decision] → Ready or Published
Refining → [abandon/disconnect] → Ready (previous version preserved)

Invalid transitions:
- Published → anything except Archived
- Cannot refine while already Refining (return 409)
- Cannot publish while Generating/Reviewing (return 409)
```

Each pipeline step persists its result before transitioning. If the connection drops after transcription but before generation, the transcript is saved. Reopening `/stream` checks the current state and resumes from where it stopped — doesn't restart transcription.

---

## GAP 4: What Happens When Things Break

The architecture covers the happy path. The contributor cycle's pride depends on the unhappy paths too. A contributor whose pipeline hangs at "generating..." for 60 seconds and then shows nothing loses trust permanently.

**Failure modes that need decisions:**

| Failure | Current spec | Needed |
|---|---|---|
| ElevenLabs down/timeout | Not specified | Retry once, then surface error: "We couldn't transcribe your recording. Try again?" with retry button. Don't lose the upload. |
| Claude API error during generation | `ErrGeneration` status exists | SSE error event with human-readable message. Submission stays at Transcribing (transcript preserved). Retry button. |
| Claude API error during review | `ErrReview` status exists | Show the article without review. "We generated your article but couldn't review it yet. You can preview it while we retry." |
| Audio too short (<5s) | Not specified | Client-side validation. Don't submit. |
| Audio too long (>10min) | Not specified | Client-side limit or server-side rejection with explanation. |
| No audio (notes + photos only) | Not specified | Skip transcription, generate from notes + photos only. This is a valid input. |
| Transcript is gibberish | Not specified | Generate anyway — the AI handles thin/unclear input by producing a brief with acknowledged gaps. The review will flag it. |
| No photos | Not specified | Generate without photos. Photos are optional. |
| Claude returns malformed JSON in review | Not specified | Parse error → retry once → if still fails, treat as review unavailable (show article without review). |

**Key principle:** Never lose the contributor's upload. Every failure should be recoverable without re-recording. The raw files are sacred.

---

## GAP 5: The Town Context Blob

ARCHITECTURE.md says: "The `town_context` parameter is a static blob — basic information about the town. Sufficient for the demo."

But what's in it? The generation prompt references `{town_context}`. The quality of the generated article depends on this context — it's how the AI knows that "Korhonen" is a common Finnish name (not a hallucination), that Kirkkonummi has a town council (not a city council), that Kauppalankatu is a real street.

**What's needed for the hackathon:**

```
Town: Kirkkonummi (Kyrkslätt in Swedish)
Country: Finland
Population: ~40,000
Municipal government: Town council (valtuusto), town board (hallitus)
Key areas: Kirkkonummi center, Masala, Veikkola, Jorvas
Languages: Finnish (majority), Swedish (minority)
Known institutions: Kirkkonummi library, Porkkala school, ...
Local context: [2-3 sentences about current affairs if relevant]
```

This doesn't need to be long. But it needs to exist before the generation prompt is tested, because the prompt template has a `{town_context}` placeholder and the AI's behavior differs with and without it.

---

## GAP 6: Language Decision

The contributor cycle references Finland: Finnish and Swedish speakers. The hackathon demo might be in English (PORT is an English-language event). The architecture notes that ElevenLabs detects language from transcription.

**Undecided:**
- Does the generation prompt change by language? (Yes — Finnish journalism conventions differ from English.)
- Does the review prompt change? (Probably not — quality dimensions are language-independent.)
- What if the contributor speaks Finnish but wants the article in English? (Not for hackathon, but the data model should anticipate it.)
- For the hackathon demo: what language? If English, the town_context and few-shot examples should be in English. If Finnish, the prompts need Finnish few-shots.

**Decision needed:** Pick the demo language. Write the prompts in that language. Note in ARCHITECTURE.md that multi-language is a production feature.

---

## GAP 7: Photo Handling End-to-End

The architecture says photos are described by Claude vision in the GATHER phase and referenced in the generated article. But the full flow has gaps:

- **Max photos?** If someone uploads 20 photos, that's 20 vision API calls. Limit to 5? 10?
- **Resolution/size limits?** Large photos slow the vision call and cost more tokens.
- **How are photo references in the article linked to actual files?** The markdown examples show `![caption](photo1)` — but `photo1` needs to resolve to an actual uploaded file URL. How does the generation prompt know the photo identifiers? How does the frontend render them?
- **Photo placement:** The AI decides where photos go in the markdown. But the frontend needs to render them. Does the frontend parse the markdown image tags and replace `photo1` with the actual URL? Or does the API do this before returning?

**What's needed:** A photo pipeline spec: upload → store → describe (vision) → pass descriptions + IDs to generation → AI references them in markdown → API resolves IDs to URLs before returning → frontend renders.

---

## GAP 8: What the Contributor Sees During the 22 Seconds

The architecture defines SSE events: `transcribing → generating → reviewing → complete`. But the contributor cycle says "the contributor sees their rambling voice memo become a headline, a lead, proper structure."

**Question:** Does the article text stream word-by-word, or appear all at once in the `complete` event?

Streaming the article text as it generates would dramatically improve perceived speed — the contributor sees the headline forming at second 10 instead of waiting 22 seconds for everything at once. This is how Claude's web interface works and it feels fast.

**But:** The architecture uses extended thinking for generation. Extended thinking output is not streamable (thinking tokens are hidden). The article appears after thinking completes. So streaming might not be possible with the current generation approach.

**Options:**
1. Accept the 22-second wait. Show engaging status messages ("Understanding your recording...", "Crafting the article...", "Reviewing for quality..."). Make the wait feel purposeful.
2. Stream the generation call without extended thinking. Faster perceived latency, but generation quality may drop.
3. Stream generation, then show a "reviewing..." overlay while the review runs. The contributor sees the article forming, then sees the coaching appear alongside it.

**Decision needed** before frontend implementation. Option 1 is safest for hackathon. Option 3 is best for the pride moment but more complex.

---

## GAP 9: Refinement Context Growth

Each refinement round passes `context + direction + previous_article` to the generation call. After 3 rounds, the context includes:
- Original transcript
- Original notes
- Photo descriptions
- Town context
- Previous article (round 1)
- Direction (round 1)
- Previous article (round 2)
- Direction (round 2)
- Previous article (round 3)
- Direction (round 3)

That's a lot of tokens. Extended thinking adds its own token overhead.

**Questions:**
- Does the generation prompt include ALL previous articles and directions, or just the latest?
- If all: does the context window fit? (Claude's context is large, but cost scales with tokens.)
- If latest only: the AI loses the history of what was tried. A direction like "go back to the first version's opening" becomes impossible.

**Recommendation:** Pass only the latest article + the current direction + the original sources. The versions[] array stores history for rollback; the AI doesn't need the full history to generate the next version. If the contributor wants to revert, that's a UI operation (pick a previous version), not a generation operation.

---

## GAP 10: The Refine Endpoint Accepts Voice — But Voice Needs Transcription

ARCHITECTURE.md's refinement pseudocode handles this:
```
if input.voice_clip:
    new_transcript = transcribe(input.voice_clip)
    direction = new_transcript
```

But this isn't in TECH_SPEC.md's API description. The refine endpoint needs to:
1. Accept multipart (voice clip) or JSON (text note) or both
2. If voice clip: transcribe it first (adds ~5s + $0.01)
3. Then pass the resulting text as `direction` to GENERATE

This means the SSE stream for a refinement round could emit: `transcribing_direction → generating → reviewing → complete` (4 events vs. 3 for the initial pipeline).

**Small gap, but needs to be in TECH_SPEC** so the frontend knows to expect the extra status event.

---

## Priority Order

Using the navigator's BRIDGE metric — what has the highest overlap between "blocks coding" and "can be resolved quickly":

1. **TECH_SPEC data model conflicts** (Gap 2) — blocks the very first line of Go code. The Submission struct, ReviewResult, and article format need alignment. ~1 hour to resolve.

2. **State machine** (Gap 3) — blocks handler logic. Can't write the publish or refine handlers without knowing valid transitions. ~30 min to spec.

3. **Failure modes** (Gap 4) — blocks error handling in every handler. Needs decisions, not code. ~30 min.

4. **The prompts** (Gap 1) — doesn't block pipeline plumbing, but blocks testing. Can be written in parallel with pipeline code. This is the highest-leverage work overall but the pipeline can be coded with placeholder prompts and then swapped.

5. **Town context** (Gap 5) — 15 minutes to write a static blob. Needed before prompt testing.

6. **Photo pipeline** (Gap 7) — blocks the GATHER stage implementation. ~30 min to spec.

7. **Language** (Gap 6) — one decision: "demo is in English." 5 minutes.

8. **SSE streaming UX** (Gap 8) — one decision: "articles appear all at once for hackathon." 5 minutes. Revisit for production.

9. **Refinement context** (Gap 9) — one decision: "pass only latest article + current direction." 5 minutes.

10. **Refine transcription** (Gap 10) — minor TECH_SPEC update. 10 minutes.

---

## The Generator Behind These Gaps

UP one level: these 10 gaps share a common parent. The architecture was designed top-down from the mission and the contributor cycle — correctly. But it was designed as a narrative ("here's what happens"), not as a contract ("here's what each component receives and returns"). The narrative is good. The contracts are missing.

The TECH_SPEC tried to be the contract, but it was written before the article engine architecture matured. The two documents diverged. The resolution is to update TECH_SPEC to match ARCHITECTURE.md, not the other way around — the architecture is more thought-through and more aligned with the mission.

Once the contracts are aligned, a developer can implement each stage independently: the GATHER stage doesn't need to know about coaching, the REVIEW service doesn't need to know about SSE, the handler doesn't need to know about editorial rules. The contracts are the seams.
