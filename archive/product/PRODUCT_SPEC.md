# PRODUCT SPEC: Preflight

## What It Does

Run all your content quality checks in one click -- perspectives, evidence, logic, framing, stakeholders, manipulation -- before you publish. Paste your draft or a URL. Get a 6-dimension quality dashboard in 3 seconds for 10 cents. See what you're missing. Fix before your audience does. Share the results as a card. Badge your best work. The substantive quality layer for all written communication: Grammarly owns "does it read well?", SEMrush owns "will people find it?", nobody owns "is it actually good?" -- until now.

---

## Competitive Position

```
                    ONE DIMENSION          MULTI-DIMENSIONAL

REACTIVE           Ground News (coverage)  NewsGuard (9 criteria, manual)
(after publish)    AllSides (left/right)   Ad Fontes (2 axes, hybrid)
                   PolitiFact (facts)      [NOBODY -- no automated multi-dim]

PREVENTIVE         Grammarly (grammar)     [THE GAP -- our position]
(before publish)   Hemingway (readability) [NOBODY]
                   Clearscope (SEO)        [NOBODY]
```

We are the ONLY product that is simultaneously:
1. Multi-dimensional (6 checks at once)
2. Preventive (before publication)
3. Per-article (specific to YOUR draft, not your outlet)

No existing product occupies this position. The gap is verified empty.

### Complements (things users already buy that we pair with)

- Grammarly ($700M ARR) -- surface quality. We add substantive quality. Together: complete pre-publish stack.
- SEMrush ($330M ARR) -- search quality. We add audience quality. Together: complete content optimization.
- Turnitin -- originality. We add completeness. Together: academic quality.
- Canva -- visual creation quality. We add written content quality.

### Substitutes (things that partially replace us)

- Asking a colleague to review your draft -- free, slow, limited perspectives, doesn't scale
- Googling "perspectives on [topic]" -- free, slow, requires synthesis, no score
- ChatGPT freeform "what am I missing?" -- free, unstructured, no score, no sharecard, no badge
- Hiring an editor -- expensive ($50-100/hr), high quality, doesn't scale

**The ChatGPT counter:** "For the same reason you use Grammarly instead of asking ChatGPT to fix your grammar. The structured, integrated, always-there experience is worth $15/month. ChatGPT is a kitchen knife. We're a food processor."

### The CI/CD for Content Analogy

Software engineering solved the same problem: code quality verification was expensive and reactive (manual code review after writing). Resolution:

1. **Linters** (during writing): Real-time feedback on style, potential bugs
2. **Type systems** (during writing): Structural correctness enforced by compiler
3. **CI/CD** (before deployment): Automated test suite runs before merge
4. **Code review** (before deployment): Human review, now augmented by AI
5. **Monitoring** (after deployment): Continuous quality signals in production

Content has NONE of this. The content lifecycle has:
- During writing: Grammarly (grammar only), Hemingway (readability only)
- Before publish: Nothing
- After publish: Community Notes (declining), fact-checkers (reactive, slow)

We're building CI/CD for content. The automated quality pipeline that runs before publication.

### Contradiction Resolutions

| Question | Resolution |
|----------|------------|
| Reactive or preventive? | **Pitch preventive, build hybrid.** Build the reactive demo (paste -> score -> gaps). Pitch the preventive vision (embedded in every editor). |
| Score or map? | **Score first, map behind "show why."** Score is the hook, list is the value, map is the proof. |
| Single number or perspective list? | **Both.** Score is hook, list is value, map is proof. |
| Browser extension or web app? | **Build web app, pitch extension as roadmap.** |
| Strip theory or keep temperature? | **Keep the concept** (verified/contested/unsourced). Temperature here means content verification level. |

**Core principle: Build reactive, pitch preventive, demo the working version.**

---

## The Output Format (6 Dimensions + Overall Score)

**Tier 1 -- The Score (0.5 seconds to understand)**
```
Publication Readiness: 58/100
Biggest gap: Disability community perspective absent
```

**Tier 2 -- The Dashboard (10 seconds to read)**
```
PERSPECTIVES    ||||......  4/9    <- Your draft covers 4 of 9 relevant viewpoints
EVIDENCE        ||||||....  6/10   <- 3 claims lack supporting evidence
LOGIC           ||||||||..  8/10   <- One argument has a gap in reasoning
FRAMING         |||||.....  5/10   <- Headlines promise more than body delivers
STAKEHOLDERS    |||.......  3/8    <- 5 affected groups not represented
MANIPULATION    |||||||||.  9/10   <- Clean: no detected dark patterns

RISKY CLAIMS:
- "AI will replace 40% of jobs by 2030" -- source is a 2017 McKinsey estimate,
  revised downward in 2023 to 15-30%
- "Studies show" without citing which studies -- 2 instances

MISSING PERSPECTIVES (by surprise value):
***** Disability community -- 26% of Americans, disproportionately filtered
      by AI screening. Completely absent from your draft.
****  Environmental cost -- AI compute uses 700K+ liters water/day.
      Mentioned nowhere in the hiring bias discussion.
***   Small business owners -- different constraints than enterprise.
      Your draft generalizes from Fortune 500 examples only.
```

**Tier 3 -- The Map (proof it's structural, not a GPT wrapper)**
Visual perspective map with covered/missing/ghost nodes. Force-directed graph showing the structure of the topic.

### Why Multi-Dimensional Changes the Game

| Property | One Dimension (perspectives) | Six Dimensions (full stack) |
|----------|----------------------------|-----------------------------|
| Moat | None -- any wrapper replicates it | Strong -- the COMBINATION is hard |
| Value per check | Medium (interesting but limited) | High (comprehensive quality picture) |
| Pricing ceiling | $5-15/mo | $15-50/mo creators, $500-2000/mo teams |
| Institutional sale | Hard ("you need more perspectives") | Easy ("your content quality score is 58") |
| Standard potential | Low (perspective is one signal) | High (multi-dimensional = comprehensive standard) |
| Retelling test | "showed missing perspectives" | "showed our article scores 58 out of 100 on quality" |

---

## User Flows

### Flow 1: Draft Check (primary)

1. User pastes article text or enters a URL
2. Loading state (~3 seconds): dimension bars fill one by one as the LLM streams results
3. Result: 6-dimension dashboard with overall score
4. Each dimension shows: score, specifics (covered items, gaps, risky claims)
5. "Biggest Blind Spot" callout with surprise rating and explanation
6. User can click "Show Map" to see perspective structure visualization
7. User edits draft, clicks "Check Again" -- scores update visibly

### Flow 2: URL Comparison (secondary)

1. User pastes 2 URLs (articles, op-eds, posts)
2. System reads both, identifies their perspectives across 6 dimensions
3. Shows: where they agree, where they diverge, what both miss
4. Bridge visualization: the space BETWEEN the two views

### Flow 3: Topic Exploration (tertiary)

1. User types a topic: "AI in education"
2. System identifies 4-5 perspectives with claims, evidence, verification level, and blind spots
3. Visual map: solid nodes = identified perspectives, ghost/pulsing nodes = missing perspectives
4. Edges between nodes: solid = agreement, dashed = divergence

---

## UI Screens

### Screen 1: Landing Page

```
+----------------------------------------------------------+
|                                                          |
|         Check your blind spots                           |
|         before you publish.                              |
|                                                          |
|         6 quality dimensions. 3 seconds. 10 cents.       |
|                                                          |
|  +----------------------------------------------------+  |
|  |                                                    |  |
|  |  Paste your text here, or enter a URL...           |  |
|  |                                                    |  |
|  +----------------------------------------------------+  |
|                                                          |
|                    [ CHECK ]                              |
|                                                          |
|  --- Recent checks by the community ---                  |
|                                                          |
|  "AI Will Replace Your Job"        58/100    [->]        |
|  "Why Housing Costs Keep Rising"   71/100    [->]        |
|  "The TikTok Ban Explained"        44/100    [->]        |
|                                                          |
+----------------------------------------------------------+
```

Key decisions:
- Text input AND URL input (URL enables the "score anything" viral mechanic)
- Recent community checks = social proof + content discovery
- No signup required for first check (reduces friction to zero)

### Screen 2: Loading (3 seconds)

```
+----------------------------------------------------------+
|                                                          |
|    Analyzing your content...                             |
|                                                          |
|    ..........  Perspectives                              |
|    ..........  Evidence                                   |
|    ||||||....  Logic           <- bars fill one by one   |
|    ..........  Framing                                    |
|    ..........  Stakeholders                               |
|    ..........  Manipulation                               |
|                                                          |
+----------------------------------------------------------+
```

Bars fill one by one as the LLM streams results. Creates anticipation. The score reveal is the moment.

### Screen 3: Results Dashboard

```
+----------------------------------------------------------+
|                                                          |
|  "AI Hiring Bias: What You Need to Know"                 |
|                                                          |
|              +---------+                                 |
|              |   58    |  Publication Readiness           |
|              |  /100   |                                  |
|              +---------+                                 |
|                                                          |
|  PERSPECTIVES   ||||......  4/9                          |
|  EVIDENCE       ||||||....  6/10                         |
|  LOGIC          ||||||||..  8/10                         |
|  FRAMING        |||||.....  5/10                         |
|  STAKEHOLDERS   |||.......  3/8                          |
|  MANIPULATION   |||||||||.  9/10                         |
|                                                          |
|  --- Biggest Blind Spot ---                              |
|                                                          |
|  DISABILITY COMMUNITY                                    |
|  26% of Americans have a disability. AI hiring           |
|  screens disproportionately filter them out.             |
|  Your article: zero mentions.                            |
|                                                          |
|  --- Risky Claims ---                                    |
|                                                          |
|  ! "AI will replace 40% of jobs by 2030"                 |
|    Source: 2017 McKinsey estimate.                        |
|    Updated 2023: revised to 15-30%.                      |
|                                                          |
|  ! "Studies show" (line 14, line 38)                     |
|    No specific studies cited. 2 instances.                |
|                                                          |
|  --- Missing Perspectives ---                            |
|                                                          |
|  ***** Disability community                              |
|  ****  Environmental cost of AI compute                  |
|  ***   Small business (vs enterprise only)               |
|  **    Labor unions                                      |
|  *     International / non-US context                    |
|                                                          |
|  [SHARE CARD]  [CHECK AGAIN]  [SEE MAP]                  |
|                                                          |
+----------------------------------------------------------+
```

### Screen 4: Sharecard (generated image)

```
+--------------------------------------+
|                                      |
|  "AI Hiring Bias: What You          |
|   Need to Know"                      |
|                                      |
|  QUALITY: 58/100                     |
|                                      |
|  ||||......  Perspectives  4/9       |
|  ||||||....  Evidence      6/10      |
|  ||||||||..  Logic         8/10      |
|  |||||.....  Framing       5/10      |
|                                      |
|  Biggest blind spot:                 |
|  Disability community                |
|  26% of Americans, zero mentions.    |
|                                      |
|  Check YOUR blind spots at           |
|  preflight.ai                        |
|                                      |
+--------------------------------------+
```

One-click generates this as a PNG. Share to X/LinkedIn/etc. Every share is an ad.

### Screen 5: Map View ("Show me why")

Force-directed graph with:
- Solid colored nodes = covered perspectives
- Ghost/pulsing nodes = missing perspectives
- Edges = relationships between perspectives
- Node size = relevance to the topic
- Click any node for detail

This is the proof layer. "Not just a score -- structural understanding."

---

## API Specification

### Endpoint

```
POST /v1/check
Content-Type: application/json

{
  "text": "Your article text here...",
  "url": "https://example.com/article",  // alternative to text
  "dimensions": ["perspectives", "evidence", "logic", "framing",
                  "stakeholders", "manipulation"],  // optional filter
  "mode": "standard"  // or "opinion" for op-eds
}
```

### Response Schema

```json
{
  "overall_score": 58,
  "article_title": "AI Hiring Bias: What You Need to Know",
  "dimensions": {
    "perspectives": {
      "score": 4,
      "total": 9,
      "covered": [
        {"name": "Tech industry", "evidence": "Paragraphs 2, 5, 7"},
        {"name": "Legal/regulatory", "evidence": "Paragraphs 3, 8"},
        {"name": "Affected workers", "evidence": "Paragraphs 4, 6"},
        {"name": "Academic research", "evidence": "Paragraph 9"}
      ],
      "missing": [
        {
          "name": "Disability community",
          "surprise": 5,
          "why": "26% of Americans have a disability. AI screening disproportionately filters disabled applicants. Completely absent.",
          "what_reader_misses": "The largest affected demographic is invisible in this analysis."
        },
        {
          "name": "Environmental cost",
          "surprise": 4,
          "why": "AI compute for hiring tools uses significant energy/water. Never mentioned in the bias discussion."
        }
      ]
    },
    "evidence": {
      "score": 6,
      "total": 10,
      "well_sourced": ["Paragraph 3: EEOC data cited correctly"],
      "risky_claims": [
        {
          "claim": "AI will replace 40% of jobs by 2030",
          "location": "Paragraph 1",
          "issue": "Source is 2017 McKinsey estimate, revised downward in 2023 to 15-30%",
          "severity": "high"
        }
      ]
    },
    "logic": {
      "score": 8,
      "total": 10,
      "gaps": [
        {
          "issue": "Conclusion assumes all AI screening is biased, but evidence only covers resume screening",
          "location": "Paragraph 10"
        }
      ]
    },
    "framing": {
      "score": 5,
      "total": 10,
      "issues": [
        {"issue": "Headline implies certainty but body contains significant uncertainty", "severity": "medium"},
        {"issue": "Emotional language in opening paragraph not matched by evidence until paragraph 5", "severity": "low"}
      ]
    },
    "stakeholders": {
      "score": 3,
      "total": 8,
      "covered": ["Job applicants", "HR departments", "Tech companies"],
      "missing": ["Disability community", "Small businesses", "Gig workers", "International applicants", "AI ethics researchers"]
    },
    "manipulation": {
      "score": 9,
      "total": 10,
      "detected": [
        {"pattern": "mild_urgency", "location": "Opening paragraph", "severity": "low", "detail": "'Right now, AI is deciding...' creates urgency without data on prevalence"}
      ]
    }
  },
  "sharecard_url": "https://preflight.ai/card/abc123.png",
  "checked_at": "2026-03-07T14:30:00Z"
}
```

---

## Data Model

```
Topic
  |-- perspectives: Perspective[]
  |     |-- label: string
  |     |-- core_claim: string
  |     |-- evidence: string[]
  |     |-- temperature: number (0-100)   // content verification level
  |     |-- blind_spots: string[]
  |     |-- sources: string[]
  |-- connections: Connection[]
  |     |-- from: Perspective
  |     |-- to: Perspective
  |     |-- agreements: string[]
  |     |-- divergences: string[]
  |-- gaps: Gap[]
        |-- label: string
        |-- description: string
        |-- why_it_matters: string
```

Temperature here is a product concept: 0 = established consensus, 100 = pure speculation. Based on source quality, evidence basis, expert agreement, and whether the claim has survived scrutiny.

---

## Technical Architecture

```
+--------------+     +---------------+     +---------------+
|   React UI   |---->|   FastAPI     |---->|  Claude API   |
|  + D3.js     |<----|   /v1/check   |<----|  (sonnet)     |
+--------------+     |   /v1/compare |     +---------------+
                     +---------------+
                           |
                     +---------------+
                     |  PostgreSQL   |
                     +---------------+
```

**Frontend:** React + D3.js (force-directed graph for map view). Vite for fast dev.
**Backend:** FastAPI (thin). Routes call Claude API with structured prompts.
**LLM:** Claude Sonnet for speed. Structured output (JSON mode).
**Database:** PostgreSQL for analysis history and data flywheel.
**Fallback:** 3 pre-cached topics/articles if API is slow during demo.

### The Core Prompt

```
You are a content quality analyzer. Your job is to find what the author
DOESN'T KNOW they're missing. Generic feedback is worthless. The value
is in SURPRISE -- gaps the author genuinely didn't think of.

ARTICLE TO ANALYZE:
---
{text}
---

Analyze across 6 dimensions. For each, be SPECIFIC -- name perspectives,
quote claims, cite paragraphs.

1. PERSPECTIVES
   - What distinct stakeholder groups have a material stake in this topic?
   - List 7-12 relevant perspectives (not left/right -- specific groups).
   - For each: is it COVERED (substantive voice), MENTIONED (named but
     shallow), or MISSING (absent)?
   - For each MISSING: rate surprise 1-5 (5 = "most readers wouldn't
     think of this") and explain why it matters in one sentence.

2. EVIDENCE
   - For each factual claim: is it sourced? Is the source current?
   - Flag claims stated as fact that are actually contested or outdated.
   - Flag "studies show" without specific citations.

3. LOGIC
   - Is the argument internally consistent?
   - Do conclusions follow from the evidence presented?
   - Any logical fallacies (straw man, false dichotomy, slippery slope)?

4. FRAMING
   - Does the headline match the body's actual claims?
   - Does the tone suggest more certainty than the evidence supports?
   - Are emotional appeals backed by evidence?

5. STAKEHOLDERS
   - Who is materially affected by this topic?
   - Which affected groups are given voice? Which are absent?

6. MANIPULATION
   - Any dark patterns? Manufactured urgency? Cherry-picked statistics?
   - Appeal to fear without evidence? Misleading comparisons?
   - Rate 1-10 (10 = completely clean).

Return valid JSON matching this schema: {schema}

CRITICAL: Your most valuable output is the MISSING perspectives with
high surprise ratings. A perspective the author genuinely didn't think
of -- that's the moment that makes the tool worth using. Generic gaps
like "consider more perspectives" are WORTHLESS. Be specific.
```

---

## Demo Script (3 minutes)

```
(0:00) HOOK -- 10 seconds
"Every creator checks grammar before publishing. Nobody checks whether
their article is actually GOOD -- complete perspectives, solid evidence,
sound logic. We built the pre-flight check for content."

(0:10) THE COST INSIGHT -- 8 seconds
"Checking what you're missing used to cost $100 and hours of research.
We do it in 3 seconds for 10 cents."

(0:18) DEMO: PASTE -- 10 seconds
[Screen: landing page. Paste 2,000-word article on AI hiring bias.]
"Here's a well-written article about AI hiring bias. Twenty hours of work."
[Click CHECK.]

(0:28) DEMO: SCORE REVEAL -- 20 seconds
[Bars fill one by one. Overall: 58/100.]
"58 out of 100. Perspectives: 4 of 9. Evidence: 6 of 10.
The biggest blind spot: disability. 26% of Americans have a
disability. AI screening disproportionately filters them out.
Zero mentions in the article."

(0:48) DEMO: RISKY CLAIMS -- 12 seconds
"And here -- 'AI will replace 40% of jobs by 2030.' That's a 2017
McKinsey estimate. Revised down to 15-30% in 2023. The author
didn't know. Now they do."

(1:00) DEMO: FIX + RE-CHECK -- 15 seconds
[Add two paragraphs. Click CHECK again.]
"Two paragraphs added. 58 to 71. Two blind spots closed.
Published with confidence."

(1:15) WHY IT SPREADS -- 15 seconds
"Every check generates a shareable card. People share them like
Spotify Wrapped. 'My article scored 82. What's yours?' Both sides
of every political argument want to use this -- to prove the other
side is blind. The disagreement IS the distribution."

(1:30) MARKET -- 20 seconds
"50 million content creators. They pay $15/month for grammar.
Nobody sells substantive quality checks. Ground News has 250,000
paying users for a simpler version. We go deeper -- 6 dimensions,
not one. Grammarly owns 'does it read well?' SEMrush owns 'will
people find it?' Nobody owns 'is it actually good?' We do."

(1:50) WHY NOW -- 12 seconds
"LLMs crossed the threshold for reliable quality assessment last
year. And on the other side: Google killed fact-check labels.
Community Notes is declining. The old infrastructure is collapsing.
The replacement doesn't exist yet."

(2:02) THE ENDGAME -- 15 seconds
"Creators are the wedge. Marketing teams and newsrooms are the
business at $500/month. Platform API for DSA compliance at 2 cents
per article. The endgame: content without a quality score looks
as suspicious as a website without HTTPS."

(2:17) HONESTY -- 10 seconds
"The AI is 80% accurate. Spell-check flags correct words sometimes.
You override it. Same here. Imperfect automatic verification beats
no verification."

(2:27) PERSONAL -- 12 seconds
"I ran this on my own [article/post]. Scored [number]. I thought I
understood [topic]. I was missing [specific perspective]. I didn't
know. Now I do."

(2:39) CLOSE -- 15 seconds
"Creating content is free. Checking it used to be expensive. We
made it free too. The blind spot dies at birth because the writer
never starts blind. This is Preflight."

(2:54) OPTIONAL LIVE -- 6 seconds
"Want to try? Pick a topic."
```

### Target Audiences by Pain Intensity

| Audience | Volume | Pain Intensity | WTP | Viral Potential | Role |
|----------|--------|---------------|-----|----------------|------|
| Newsletter creators | 50M | HIGH | $15/mo | VERY HIGH | **Wedge** |
| Marketing managers | 10M | HIGH | $30/mo | MEDIUM | Expansion |
| Students | 200M | MEDIUM | $0-5/mo | VERY HIGH | Free tier / viral |
| PR professionals | 5M | VERY HIGH | $50/mo | LOW | Sales-driven |
| Newsroom editors | 500K | HIGH | $500/mo | MEDIUM | Sales-driven |
| Executives | 50M | MEDIUM | $100/mo | LOW | Enterprise sale |
| Policy staffers | 100K | VERY HIGH | $500/mo | LOW | Niche |

### TAM Narrative

```
Layer 1: Content creators         50M x $15/mo  = $9B addressable
Layer 2: Marketing teams          10M x $30/mo  = $3.6B
Layer 3: Enterprise professionals 50M x $10/mo  = $6B
Layer 4: Platform API             $0.02/article = $7B+ at scale
                                                  -----
                                  Total:          $25B+

The quality stack:
  Grammarly:  "Does it read well?"     <- surface
  SEMrush:    "Will people find it?"   <- discovery
  Preflight:  "Is it actually good?"   <- substance

Nobody owns the substance layer. We do.
```
