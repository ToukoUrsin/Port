# Does It Actually Work?

---

## The Gate Test (DO FIRST)

Can Claude reliably detect representation gaps in local news?

This is the single highest-risk question. If the quality engine can't flag missing voices, we lose the differentiator ("whose voice is missing?") and fall back to factual-only review.

### How to test

Take 5 real local news articles. Run each through a Claude prompt asking for representation and perspective analysis.

**Grade each result:**
- Does it identify which stakeholder groups are present?
- Does it flag which groups are missing?
- Are coaching suggestions specific and useful?
- Does it avoid false positives?

**Pass:** 4 of 5 produce useful, accurate flags → build the full 6-dimension quality engine.
**Fail:** <3 of 5 → fall back to factual-only review (quote attribution, claim verification, completeness). Still strong, just less differentiated.

**Confidence:** 70% pass.
**Time budget:** 2 hours max.

### Results

_(Run the test. Record results here.)_

---

## What's Validated

| Claim | Status | Evidence |
|---|---|---|
| AI can generate articles from transcripts | Validated | Claude handles this well, standard use case |
| Whisper transcribes voice accurately | Validated | Proven API, millions of users |
| Near-zero cost per article | Validated | $0.02-0.05 per article at API prices |
| Audio recording works in mobile browsers | Needs test | MediaRecorder API should work — test on Chrome + Safari |
| Structured JSON output from Claude | Needs test | Usually reliable — needs retry/repair for edge cases |
| Quality engine catches representation gaps | **UNVALIDATED — GATE TEST** | The critical unknown |

---

## What We Can't Validate Before the Hackathon

- Will people actually contribute? (Requires real deployment)
- Will municipalities pay? (Requires sales conversations)
- Does the cold-start problem kill engagement? (Requires real towns)

These are startup risks, not hackathon risks. For the hackathon, we only need to prove: the pipeline works, the quality engine produces meaningful feedback, and the demo lands.
