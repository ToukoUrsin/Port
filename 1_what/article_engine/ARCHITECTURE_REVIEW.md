# Architecture Review — Does It Serve the Mission?
# Date: 2026-03-07 UTC+3

Assessment of ARCHITECTURE.md against MISSION.md and THE_CONTRIBUTOR_CYCLE.md.

---

## Verdict: Yes, with two tensions to watch

The architecture is well-aligned. The "small-newsroom editor" analogy isn't just a metaphor — it drove real structural decisions (combined review, coaching tone, gate-not-grade). The pipeline is minimal where it should be (3 API calls, no framework) and sophisticated where it matters (the prompts encode 15+ research files). The refinement loop matches the contributor cycle's conversational model.

The two things that could undermine the mission live at the seam between architecture and UX.

---

## What's Right

### The combined review serves the mission better than a split pipeline

MISSION.md says the AI is "the best editor you've ever worked with." An editor reads once, responds once. The architecture models exactly that — verify, score, gate, coach in one call, in that order. The ordering is deliberate and correct: adversarial work first (verification), warm mentoring last (coaching). By the time the model writes "The quote from Maria really captures the frustration," it has already done the clinical fact-checking. The register shift happens naturally within a single context.

A split pipeline (separate verify call + separate review call + separate coaching call) would model the New York Times, not the community paper. It would also cost more, take longer, and fragment the feedback the contributor sees. The architecture correctly chose the small-newsroom model.

### Latency fits the pride moment timing

THE_CONTRIBUTOR_CYCLE.md identifies two pride moments:
1. Phase 3: "it made my words sound professional" (~15s)
2. Phase 4: "I shaped it into exactly what I wanted" (refinement rounds)

The architecture delivers: GATHER(8s) + GENERATE(8s) = 16s to first draft. Close enough. The SSE status events ("transcribing" → "generating" → "reviewing") give the contributor a sense of progress during the wait, which matters more than shaving 2 seconds. Each refinement round is ~14s. A two-round article is under 3 minutes total. This matches the cycle's target.

### The refinement loop is correctly open-ended

The contributor cycle defines 5 modes (correction, direction, addition, removal, tone) but the architecture's POST /refine endpoint just accepts voice_clip or text_note. This is right. The AI infers the mode from natural language — "don't include the part about the neighbor" is obviously removal; "focus more on the kids" is obviously direction. Encoding 5 separate endpoints or mode selectors would add friction and contradict the "feels like a conversation, not an editing interface" requirement.

### Gate > Score for the mission

The architecture uses a three-level gate (GREEN/YELLOW/RED) as the primary quality signal, not a numeric score. This aligns with MISSION.md's "quality is visible but not shaming." GREEN means publishable. YELLOW means "could be better." RED means "one specific thing needs fixing." The contributor never sees "you scored 58/100." They see "this is ready" or "this needs one fix to be bulletproof."

### Anti-hallucination is integrated, not bolted on

The architecture's key insight: hallucinations caught in verification (Phase 1 of review) become red triggers in the gate (Phase 3 of review). The contributor sees "this claim wasn't in your recording" as a specific, actionable fix — not a separate error screen, not a scary "AI hallucination detected" warning. The coaching (Phase 4) frames it warmly: "This is a strong story. To publish the claim about Virtanen, we need to say who told you — that makes it airtight." This is exactly the mission's additive-not-critical principle in action.

### Version history enables "show improvement"

The contributor cycle requires showing what changed between rounds ("not a diff view — too technical"). The architecture stores versions with `{article, metadata, review, contributor_input, timestamp}`. The data is there. The UX for surfacing it is a frontend concern, but the architecture supports it.

### No-framework philosophy is correct

The pipeline is a fixed graph. Three calls in sequence, some parallelism. Go handles this natively. Adding LangGraph or a workflow engine would add complexity without adding capability. The architecture correctly identifies that "the sophistication lives in the prompts, not the orchestration." The 15+ research files distilled into two system prompts ARE the intelligence. The Go code is just plumbing.

---

## Tension 1: The Six Scores Could Become a Report Card

The review outputs six scores (evidence, perspectives, representation, ethical_framing, cultural_context, manipulation), each 0.0-1.0. These are valuable internally — they drive the gate decision and help the coaching be specific. But if the contributor sees them raw, they become a grade sheet.

MISSION.md is explicit: "58/100 doesn't mean 'you failed.' It means 'here's how to make it even better.'" THE_CONTRIBUTOR_CYCLE.md says "the score is a guide, not a grade."

The architecture doesn't specify what the contributor sees. The review JSON includes both scores and coaching. If the frontend displays `perspectives: 0.4` next to a coaching question, the contributor reads "I failed at perspectives" — exactly the shaming the mission forbids.

**Recommendation:** The architecture should note that scores are internal/editorial data. The contributor-facing output is the gate (GREEN/YELLOW/RED) and the coaching text. Scores can power a subtle quality indicator (a progress bar, a "getting stronger" animation) but should never be shown as labeled numerical dimensions. The frontend receives them for potential use, but the default is: gate + coaching = what the contributor sees.

This isn't a flaw in the architecture — it's an ambiguity that needs resolving before frontend implementation.

---

## Tension 2: RED Gate Framing at the API Level

The publish endpoint returns `reject("resolve red triggers first")` when the gate is RED. The review prompt handles RED gates beautifully in coaching: "This is a strong story. To publish the claim about Virtanen, we need to say who told you." But the API-level response is mechanical.

The contributor cycle says the publish button is "always visible." The architecture says publishing is blocked when gate == RED. These aren't contradictory — the button can be visible but lead to a "fix this first" flow. But the transition from warm coaching to hard block needs care.

The architecture handles this well with the appeal endpoint (POST /appeal → human review queue). A contributor who genuinely disagrees with the gate can escalate. This is the "contributor always has the last word" principle from the cycle, mediated by human review for safety.

**Recommendation:** The API response for a RED-gate publish attempt should include the coaching text, not just the error. The contributor should see "This is a strong story — to publish the claim about Virtanen, we need to say who told you" alongside the block, not "resolve red triggers first." The warmth needs to carry through to the error state.

---

## Coverage of the Contributor Cycle

| Phase | Covered? | Notes |
|---|---|---|
| 1. WITNESS | N/A | Outside the system — the contributor decides to act |
| 2. CAPTURE | Yes | POST /submissions accepts audio + photos + notes |
| 3. DRAFT | Yes | GATHER → GENERATE → first pride moment in ~16s |
| 4. REFINE | Yes | 0-N rounds, voice or text, ~14s each. Coaching limited to 1-2 questions |
| 5. PUBLISH | Yes | POST /publish with gate check |
| 6. IMPACT | No | Explicitly out of scope. Correct for hackathon |
| 7. RETURN | No | Product-level concern. Correct for hackathon |

The architecture is honest about not covering Phases 6-7. These are where the pride cycle compounds (seeing read counts, getting the neighbor comment), but they're post-pipeline features. The architecture leaves room for them without over-designing now.

---

## What Depends Entirely on Prompt Quality

The architecture correctly identifies that "the quality of the output is determined by the quality of the context, not the quality of the generation." But a second truth follows: **the quality of the review is determined by the quality of the review prompt.** The entire mission — pride, mentoring, additive feedback, warm coaching — lives or dies in two system prompts.

The architecture specifies what the review prompt should do (four phases, celebration-first coaching, max 2 questions). But the actual prompt text is where the mission either works or doesn't. The editorial rules, the few-shot examples, the tone calibration — those are the real product.

The architecture is the right vessel. The prompts are the contents. Both matter.

---

## Summary

The architecture serves the mission. The three-call pipeline, combined review, conversational refinement loop, and gate system all trace back to the core feelings: contributor pride, reader interest, community representation. The decisions are principled (small-newsroom analogy → combined review, no-framework → prompt sophistication, gate → not grade) and the tradeoffs are honest (no Phase 6-7, latency vs. cost, prompt dependency).

The two tensions (score visibility, RED gate framing) are seams between architecture and UX. They're easy to resolve if flagged now, harmful if discovered during frontend implementation.

The architecture is ready to build from.
