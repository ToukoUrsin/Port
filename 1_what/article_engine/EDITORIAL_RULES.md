# Editorial Rules — What Good Local Journalism Actually Means
# Date: 2026-03-07 UTC+3

These are the journalistic principles that the AI must follow. They define what separates our output from "paste into ChatGPT." Every rule here becomes a constraint in the generation prompt and a check in the review prompt.

---

## 1. THE INVERTED PYRAMID

The most important information comes first. Not chronological. Not "setting the scene." The news.

```
BAD (ChatGPT default):
  "On a beautiful Tuesday evening, the town council gathered in
  the historic Kirkkonummi town hall for their monthly meeting.
  The agenda included several items..."

GOOD (journalism):
  "The Kirkkonummi town council voted 5-2 Tuesday to approve a
  budget that cuts school funding by 12%, drawing protests from
  parents who packed the chamber."
```

Rule: Paragraph 1 = who did what, when, and why it matters. Everything else follows in decreasing order of importance. A reader who reads only the first paragraph gets the essential news.

## 2. THE LEAD

One sentence. The whole story compressed. Should answer at least 3 of: Who, What, When, Where, Why, How.

```
BAD: "The council had a meeting about the budget."
GOOD: "Kirkkonummi council approved a $4.2M budget Tuesday in a
      contentious 5-2 vote that cuts school funding by 12%."
```

Rule: The lead must contain the most newsworthy fact. Not the most recent event — the most important one.

## 3. THE NUT GRAF

Paragraphs 2-3. Answers "why should I care?" and "why now?" Provides context that makes the lead matter.

```
"The budget has been contentious since January when the finance
committee first proposed education cuts. Tuesday's vote followed
three hours of public comment from more than 30 residents."
```

Rule: The nut graf connects the specific event to the bigger picture. Without it, the article is a fact without a frame.

## 4. QUOTES — EXTRACTION AND PLACEMENT

Quotes come from the source transcript. Never invented. Always attributed to a named speaker. Placed for maximum impact — after the context that makes them meaningful.

```
BAD: She said, "Our children deserve better than this." Mrs.
     Korhonen was upset about the cuts.

GOOD: Council member Korhonen, one of two dissenting votes,
      called the cuts unacceptable. "Our children deserve
      better than this," she said.
```

Rules:
- Every quote must exist in the transcript (verbatim or lightly cleaned for grammar)
- Every quote has a speaker name and relevant context ("council member," "local parent")
- Quotes follow context, not precede it
- Partial quotes are fine: Korhonen called the decision "a betrayal of our community's values"
- If the transcript is unclear about who said something, don't attribute it

## 5. NEUTRAL TONE — DE-EDITORIALIZING

The contributor's voice comes through in the facts they chose to report. The article's tone stays neutral. Strip adjectives that express judgment.

```
BAD (contributor's words leaked into article):
  "The terrible decision to cut school funding..."
  "An exciting new business opened..."
  "The controversial mayor..."

GOOD (neutral):
  "The decision to cut school funding, which drew criticism from..."
  "A new coffee shop opened Monday on Main Street..."
  "Mayor Virtanen, whose housing policy has divided the council..."
```

Rule: The article never tells the reader how to feel. It presents facts and quotes. The reader decides.

## 6. ATTRIBUTION — EVERY CLAIM HAS A SOURCE

In journalism, nothing floats. Every factual claim is either:
- From the contributor's direct observation ("according to [contributor name]")
- From a quoted source ("Korhonen said")
- From a document or public record ("according to council minutes")

```
BAD: "The budget will hurt families."
GOOD: "The budget will hurt families, according to Korhonen."
  or: "Parents at the meeting said the budget would hurt families."
```

Rule: If a claim can't be attributed, it gets flagged. "The contributor mentioned a $10M budget but did not name the source."

## 7. WHAT'S MISSING — ACKNOWLEDGED, NOT HIDDEN

When the contributor didn't cover something important, the article acknowledges it rather than pretending it's complete.

```
"The council did not respond to questions about implementation
 timelines. School administrators were not available for comment."
```

This is what separates journalism from content. Content pretends to be complete. Journalism tells you what it doesn't know.

Rule: If a major stakeholder perspective is absent, note it. "This article is based on observations from the public session. Council members' reasoning for their votes was not available."

## 8. CONTEXT FROM THE CONTRIBUTOR'S OWN INPUT

The AI should pull contextual details from across the entire input — not just the main narrative. Contributors often drop important background in asides, in their notes, in descriptions of photos.

```
Transcript: "...and yeah they voted 5-2, oh by the way this is
the same council that approved the new sports center last year,
some people are saying why do we have money for sports but not
for schools..."

Article: "The vote comes months after the same council approved
a $1.5M sports center, a contrast that several residents noted
during public comment."
```

Rule: Scan ALL input (transcript, notes, photo descriptions) for contextual details. Weave them in where they add meaning. But never invent context that isn't in the source.

## 9. PHOTO INTEGRATION

Photos aren't decorations. They're evidence. Captions should be informative, not descriptive.

```
BAD caption: "A photo of the council meeting."
GOOD caption: "Residents filled the Kirkkonummi council chamber
              Tuesday for the budget vote. Photo: Samu Lehtonen"
```

Rule: Caption = what's happening + why it matters + credit. If the contributor described the photo in their notes or recording, use that context.

## 10. LOCAL NEWS SPECIFICS

Local journalism has different conventions than national reporting:
- Use full names on first reference, last names after
- Include specific locations ("at the corner of Kauppalankatu and Kirkkotie")
- Include relevant small details ("the meeting ran 45 minutes past schedule")
- Community impact is always the lead angle, not policy abstraction
- Numbers should be concrete ("12% cut" not "significant reduction")

---

## HOW THESE RULES BECOME PROMPTS

Each rule above maps to:
1. A **generation constraint** — instruction in the article generation prompt
2. A **review check** — something the quality review verifies

Example mapping:
```
Rule 4 (Quotes):
  Generation: "Extract direct quotes from the transcript. Attribute
              each quote to the named speaker. Place quotes after
              the context that makes them meaningful."
  Review:     "For each quote in the article, verify it appears in
              the source transcript. Flag any quote not found in
              the transcript."
```

See GENERATION.md and REVIEW.md for the full prompt implementations.

---

## THE STANDARD

When a judge reads the output, they should not think "AI wrote this." They should think "a journalist wrote this." The rules above are what make that happen. They're not novel — they're journalism school basics. But encoding them into a pipeline that runs in 15 seconds is the product.
