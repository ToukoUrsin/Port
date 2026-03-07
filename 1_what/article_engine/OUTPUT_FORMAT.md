# Output Format — Why JSON Was Wrong, What's Right Instead
# Date: 2026-03-07 UTC+3

The earlier design locked into JSON as the primary article output: `headline`, `lead`, `body`, `quotes[]`, rigid schema. This was premature and wrong. Here's why, and what replaces it.

---

## The Problem with JSON-Primary Output

Every article rendered from the same JSON schema looks IDENTICAL. Same headline position, same lead style, same body flow, same quote card placement. That's not a newspaper — it's a database with a skin.

This directly hurts the mission:

**Contributor pride:** A template-rendered article feels generic. "My story about grandma's bakery reads exactly like a council meeting report." The contributor didn't write a template fill — they told a story. The output should reflect THEIR story's shape, not a universal schema.

**Reader interest:** Readers get bored when every article looks the same. Real newspapers have visual variety — a news brief, a photo feature, a profile with a pull quote, a long-form narrative. JSON templates kill that variety.

**Community representation:** A newspaper with structural variety signals editorial care. Every story treated differently because every story IS different. A template newspaper signals automation.

---

## What Lovable Teaches

Lovable (the AI app builder) doesn't output JSON that gets rendered by templates. It writes the FINAL ARTIFACT directly — React components, HTML, CSS. Each output is structurally unique. That's why Lovable outputs feel crafted, not generated.

The key insight isn't "write HTML." It's: **let the AI make creative structural decisions that make each output feel unique, within a consistent quality framework.**

Lovable has PRINCIPLES (responsive design, clean CSS, component architecture) and applies them differently every time based on what the user asked for.

For articles: the AI has PRINCIPLES (lead with the news, attribute quotes, neutral tone, acknowledge gaps) and applies them differently based on the raw material. A photo-heavy submission becomes a photo-led article. A quote-heavy recording becomes a quote-driven feature. A thin 30-second clip becomes a 3-sentence brief.

---

## The Right Split: Markdown Article + Structured Metadata

**The article itself = markdown.** The AI writes the article as a reader would read it. It makes structural choices — where to place photos, whether to use pull quotes, how to break sections. Each article is structurally appropriate to its content.

**The metadata = structured.** Category, confidence score, coaching suggestions, missing context — these are system data that the UI needs to parse. They travel alongside the article, not as the article.

**The review output = structured.** Scores, flags, coaching — the UI renders these programmatically.

Why markdown specifically:
- Renders to HTML trivially (one library call)
- Constrains enough to prevent broken layouts
- Allows structural freedom (headings, blockquotes, emphasis, image placement, section breaks)
- Human-readable in raw form (contributor can see and edit it)
- Streams naturally (word by word, renders incrementally)

### The Separation Principle

**The AI is the writer. CSS is the typesetter.**

The AI decides: structure, emphasis, quote placement, photo position, article length, pacing, which details to highlight.

CSS decides: typography, colors, margins, columns, responsive layout, font sizes.

A writer decides what goes where. A typesetter makes it look good on the page. These are different jobs.

---

## Fixed Structure Was Wrong Too

Inverted pyramid is NOT always the right structure. Local news has many natural forms:

| Content Type | Best Structure | Example |
|-------------|---------------|---------|
| Council vote, decision | Inverted pyramid | Most important fact first |
| New business opening | Feature / profile | The person and their dream, not just the fact |
| Community event | Narrative | "The kids lined up at 8am..." — the experience IS the story |
| Meeting summary | Takeaways + details | Quick bullet points, then depth for those who want it |
| Photo-heavy contribution | Photo-led | Photos are the content, text provides captions and context |
| Opinion / reaction piece | Argument | Claim, evidence, conclusion |
| 30-second voice clip | News brief | 2-3 sentences. Done. |

**If the AI always writes inverted pyramid, a feature story about a grandmother's bakery reads like a council meeting report.** That kills pride ("my story sounds like a press release") and interest ("every article reads the same").

**The right approach: the AI CHOOSES the structure based on the content.** The editorial rules become guidelines, not a rigid schema. A real editor looks at the raw material and decides what kind of article it wants to be. The AI should do the same.

---

## What the Output Actually Looks Like

### Example 1: News Report (council meeting)

```markdown
# Council Approves Budget 5-2 Amid School Funding Protests

The Kirkkonummi town council voted 5-2 Tuesday evening to approve
the school budget, drawing protests from dozens of parents who
packed the chamber with signs.

Council members Korhonen and Laaksonen cast the two dissenting
votes in a meeting that ran roughly an hour past its scheduled end.

> "Our children deserve better than this."
> — Korhonen, council member

Approximately 30 to 40 parents attended the session, some holding
signs, according to the contributor present at the meeting.

The budget's specific provisions were not immediately available.
```

### Example 2: Feature Story (new business)

```markdown
# Marja's Bakery Brings Karelian Pies Back to Kirkkonummi

For 30 years, Marja Korhonen baked Karelian pies for her family
every Sunday. Last week, she started baking them for the whole town.

![Marja behind the counter on opening day](photo1)
*Marja Korhonen arranges pastries at her new bakery on Kauppalankatu.
The shop opened Saturday. Credit: contributor*

The small bakery at the corner of Kauppalankatu and Kirkkotie opened
Saturday to a line of nearly 20 people — most of them, Korhonen said,
drawn by word of mouth alone.

> "I never planned to open a business. But my daughter said, 'Mom,
> everyone asks for your recipe. Just sell them.'"

The shop serves traditional Karelian pies, cinnamon rolls, and
coffee. Korhonen sources her flour from a farm in Lohja.

---

**Hours:** Tuesday through Saturday, 7am to 3pm.
```

### Example 3: News Brief (thin input)

```markdown
# New Coffee Shop Opens on Main Street

A new coffee shop opened on Main Street on Friday. The shop's name,
owners, and hours were not immediately available.
```

### Example 4: Photo Essay (multiple photos, short audio)

```markdown
# Saturday Market Returns to Kirkkonummi Square

![Vendors setting up at dawn](photo1)
*Vendors set up stalls before dawn at Kirkkonummi Square on Saturday.
The weekly market returned after a winter break. Credit: contributor*

The first Saturday market of the season drew an early crowd despite
temperatures near freezing.

![A family browsing vegetable stalls](photo2)
*A family browses vegetable stalls. The market featured about 15
vendors, according to the contributor. Credit: contributor*

About 15 vendors offered produce, baked goods, and crafts. The
contributor noted that attendance seemed higher than last year's
opening weekend.

![Handmade crafts display](photo3)
*Handmade wooden crafts at one of the market stalls. Credit: contributor*
```

Notice: these four articles look DIFFERENT. Different structures, different rhythms, different photo placements. That's the point. They share quality standards (attribution, neutrality, acknowledged gaps) but not structural templates.

---

## The Metadata Sidecar

The AI outputs the article PLUS a small metadata block. This can be structured however is cleanest for parsing — JSON after the article, a YAML frontmatter block, or a separate API field.

```json
{
  "article_markdown": "# Council Approves Budget...\n\n...",
  "metadata": {
    "chosen_structure": "news_report",
    "category": "council",
    "confidence": 0.8,
    "missing_context": [
      "What specifically does the budget cut?",
      "What were the signs saying?"
    ]
  }
}
```

Or simpler — the generation call returns markdown with metadata at the end:

```
[article in markdown]

---METADATA---
structure: news_report
category: council
confidence: 0.8
missing:
- What specifically does the budget cut?
- What were the signs saying?
```

The exact format is an implementation detail. The principle is: **the article is prose, the metadata is structured.**

---

## How This Changes the Review

The review doesn't need the article in JSON to work. A real editor reviews a WRITTEN ARTICLE against source material. Give the reviewer the article text and the transcript. Done.

What the reviewer gets:
- The article (markdown text)
- The original transcript
- The contributor's notes
- Photo descriptions

What the reviewer does:
- Reads the article
- Compares every claim against the source
- Checks quotes against the transcript
- Evaluates journalism quality (does it have a lead? neutral tone? proper attribution?)
- Evaluates completeness (what's missing?)

What the reviewer outputs:
- Structured scores and flags (the UI needs these)
- Specific coaching suggestions

The review OUTPUT is structured (JSON). The review INPUT is prose. These are different things. The earlier design conflated them — it made the article JSON because the review needed structured data. But the review produces its OWN structured data. The article doesn't need to be structured for the review to work.

---

## How This Changes the Generation Prompt

Instead of "output valid JSON matching this schema," the prompt becomes:

```
Write a local news article from this contribution.

Choose the structure that best fits the material:
- News report (inverted pyramid) for decisions, events, announcements
- Feature or profile for human interest, new businesses, personal stories
- Photo essay when photos tell the primary story
- News brief when the input is thin
- Narrative when the experience itself is the story

Write in markdown. Use headings, blockquotes for pull quotes,
image references where photos strengthen the narrative,
horizontal rules for section breaks.

[editorial rules — tone, attribution, faithfulness, etc.]

After the article, output a metadata block with:
category, confidence, structure used, and missing_context suggestions.
```

This gives the AI CREATIVE LATITUDE on structure while maintaining STRICT RULES on quality (faithfulness, attribution, neutral tone). Structure is creative. Quality is non-negotiable.

---

## What Survives from the Original Design

- The editorial principles (neutral tone, attribution, acknowledged gaps, no hallucination)
- The review producing structured scores and coaching
- The back-and-forth via missing_context / coaching suggestions
- Faithfulness as the top priority
- The adversarial separation (generator doesn't know the scoring rubric)
- The 2-call pipeline (generate + review)
- The mentor tone in coaching

## What Dies

- JSON as primary article output format
- Fixed inverted pyramid structure for all articles
- `headline`, `lead`, `body`, `quotes[]` schema
- `source_in_transcript` field (review reads the article and transcript directly)
- Temperature 0.3 (may need more creative latitude for structural variety)
- The assumption that every article is the same shape

---

## Open Questions (need testing)

1. **How much structural freedom?** Too much = inconsistent quality, some articles look weird. Too little = template feel. Need to test with 10 varied inputs and see if the AI makes good structural choices.

2. **Markdown or HTML?** Markdown is safer for the hackathon (simpler, no layout bugs). HTML gives more control (custom components, pull quote styling). Start with markdown, consider HTML for production.

3. **How to handle the metadata block?** YAML frontmatter? JSON after the article? Separate API field? Implementation detail — test what parses most reliably.

4. **Does structural variety actually improve contributor pride?** The hypothesis: yes, because each article feels crafted for its content. But this needs to be tested with real contributors.

5. **Can the AI reliably choose the right structure?** If 8/10 articles get a structure that fits their content, this works. If the AI keeps choosing inverted pyramid anyway (trained on news), we may need stronger prompt guidance.
