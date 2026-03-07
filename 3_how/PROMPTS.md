# Prompts — The Core IP

The exact Claude prompts for article generation and quality review. These are the product. Write and test these before any UI code.

---

## Prompt 1: Article Generation

_(To be written and tested as part of the gate test. Design the prompt, run it against real inputs, iterate until output quality is consistent.)_

**Input variables:**
- `{transcript}` — Whisper output
- `{notes}` — contributor's free text
- `{photo_descriptions}` — descriptions of uploaded photos (or count)
- `{town_name}` — name of the town
- `{town_context}` — brief description, recent articles for context

**Output schema:**
```json
{
  "headline": "string",
  "body": "string (markdown, 3-6 paragraphs)",
  "quotes": [
    { "text": "string", "speaker": "string", "context": "string" }
  ],
  "photo_captions": ["string"],
  "category": "council|schools|business|events|sports|community|culture"
}
```

**Prompt rules to encode:**
- Only use information from the provided source material
- Never invent quotes, facts, or details
- Pull direct quotes from transcript, attribute clearly
- If information is incomplete, say so
- Local news tone: clear, direct, informative
- Structure: headline, lead paragraph, body with quotes woven in, closing

---

## Prompt 2: Quality Review

_(To be written and tested during the gate test. This prompt determines whether the 6-dimension engine works or we fall back to factual-only.)_

**Input variables:**
- `{article}` — the generated article (from Prompt 1)
- `{transcript}` — original Whisper output
- `{notes}` — original contributor notes
- `{photo_descriptions}` — original photos

**Output schema:**
```json
{
  "overall_score": 72,
  "dimensions": {
    "factual_accuracy": {
      "score": 85,
      "flags": ["string"]
    },
    "quote_attribution": {
      "score": 90,
      "flags": ["string"]
    },
    "perspectives": {
      "score": 60,
      "present": ["string"],
      "missing": ["string"],
      "note": "string"
    },
    "representation": {
      "score": 55,
      "flags": ["string"],
      "suggestion": "string"
    },
    "ethical_framing": {
      "score": 80,
      "flags": ["string"]
    },
    "completeness": {
      "score": 65,
      "missing_context": ["string"]
    }
  },
  "coaching": ["string", "string", "string"],
  "blocking_flags": ["string"]
}
```

**Prompt rules to encode:**
- Compare article against source material, NOT world knowledge
- Core check: did the AI add anything not in the source?
- Score each dimension 0-100 independently
- Coaching suggestions must be specific and actionable ("add X", not "improve quality")
- Blocking flags only for: potential defamation, fabricated quotes, extreme factual errors
- Tone: helpful editor suggesting improvements, not gatekeeper blocking publication

---

## Testing Plan

1. Find 5 real local news articles (mix of quality levels)
2. For each: create a fake "transcript + notes" that a contributor might have provided
3. Run Prompt 1 → generated article
4. Run Prompt 2 → quality review
5. Grade: are the flags accurate? Are coaching suggestions useful? Any false positives?
6. Iterate prompts until 4/5 produce good results
7. Lock prompts, move to code
