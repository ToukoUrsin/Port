# Architecture Decision: Why Three Calls, Not Five
# Date: 2026-03-07 UTC+3

Documents the decision to fold faithfulness verification into the review call rather than running it as a separate pipeline stage. Analyzed using SIMPLE_UNIVERSAL_NAVIGATOR.logos bidirectional search.

---

## The Five Options Considered

| Option | Calls | Cost | Latency | Complexity |
|---|---|---|---|---|
| 1. Trust the prompt | transcribe, generate, review (quality only) | $0.03 | ~18s | Minimal |
| 2. Fold verify into review | transcribe, generate, review (verify+quality+coach) | $0.04 | ~22s | Low |
| 3. Separate verify, no retry | transcribe, generate, verify, review | $0.05 | ~26s | Moderate |
| 4. Inner loop (verify -> retry) | transcribe, generate, verify, (retry), review | $0.06-0.08 | ~28-34s | High |
| 5. Specialized model + LLM judge | transcribe, generate, HHEM, (Claude verify), review | $0.04-0.05 | ~24s | High (2nd model) |

## Decision: Option 2

## Navigator Analysis

**TARGET (backward beam):** Faithful journalism-quality article, contributor feels proud, under 3 minutes, no harmful content, buildable in a hackathon.

**SUPERPOSE (forward beam):** Short transcript (200-600 words), short article (200-800 words), Claude API, editorial rules that work in prompts, ~22s latency budget.

**REVERSE from target — prerequisites:**
- Faithfulness must be checked (non-negotiable)
- Check must not add significant latency
- Check must not create contributor anxiety
- Must be hackathon-buildable

**PROPAGATE from axioms — what follows:**
- Claude can hold article + transcript in one context trivially
- The review call already reads both documents
- One prompt can do verify + score + gate + coach in sequence

**BRIDGE:** Both beams converge on the review call. Verification embedded in a call that's already happening.

**Interference check on each option:**

| Option | Forward beam | Backward beam | Interference |
|---|---|---|---|
| 1. Trust prompt | Possible | 8% hallucination rate unacceptable | **Destructive** |
| 2. Fold into review | Simple, fast, one call | Verification happens, low latency, low anxiety | **Constructive** |
| 3. Separate verify | Better accuracy (focused prompt) | Adds 4s, adds complexity | **Mixed** |
| 4. Inner loop | Best output quality | 28-34s, retry logic, hackathon timeline | **Destructive (for hackathon)** |
| 5. Specialized model | Cheapest at scale | Deployment complexity, second model | **Destructive (for hackathon)** |

## The Structural Argument (UP from options to generator)

Going UP one level: what is the article engine analogous to?

A **small-newsroom editor**. At a weekly paper with one editor, that person reads the article once. In that single read they check facts against notes, assess quality, and give feedback. They don't have a separate fact-checking department.

The separate verify stage models a large newsroom's division of labor. That's the wrong analogy. We're the solo editor who reads the piece, catches the errors, checks the quotes, and says "this is great, but did you get the vote count?"

## The Prompt Order Solution (CURVATURE resolution)

The tension: the review prompt has two emotional registers. Adversarial checking ("is this faithful?") and celebratory coaching ("your quote is excellent!").

Resolution: **order within the prompt matters.**

1. VERIFY — adversarial, clinical. The model hunts for unsupported claims.
2. SCORE — analytical. 6 dimensions evaluated.
3. GATE — deterministic. Matrix applied, triggers collected.
4. COACH — warm, celebratory. By now the clinical work is done. The model shifts register.

Coaching comes last so the model can be adversarial first and warm second. A hallucinated claim becomes a red trigger with a specific fix — the coaching doesn't mention it anxiously, the gate handles it structurally.

## What We Give Up

- **Verification thoroughness.** A focused verify-only prompt (Option 3) would catch more edge cases than a verify-phase-within-a-larger-prompt. Estimated: ~80% catch rate for Option 2 vs ~90% for Option 3.
- **Self-correction.** The inner loop (Option 4) means the contributor never sees hallucinations. With Option 2, hallucinations become red triggers the contributor has to address.
- **Pre-filter economics.** At scale (1000+ articles/day), HHEM pre-filtering (Option 5) saves ~60% on verification cost. Irrelevant at 50 articles.

## What We Gain

- **4 fewer seconds of latency** vs Option 3 (22s vs 26s)
- **One fewer API call** to manage, debug, and monitor
- **Simpler code** — the pipeline is literally: gather, generate, review
- **Hackathon velocity** — less plumbing, more time on prompt engineering
- **The prompts are the product** — and we get more time to tune them

## When to Revisit

Upgrade to Option 3 (separate verify) if:
- Testing shows the combined review misses hallucinations that a focused verify catches
- Hallucination rate in generated articles exceeds 5% of claims

Upgrade to Option 4 (inner loop) if:
- Contributors consistently complain about seeing hallucination flags
- The refinement-to-fix-hallucination pattern is more than 10% of all refinements

Upgrade to Option 5 (HHEM pre-filter) if:
- Volume exceeds 100+ articles/day and verification cost matters
