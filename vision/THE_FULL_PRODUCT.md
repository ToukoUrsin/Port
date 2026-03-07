# THE FULL PRODUCT
# What Preflight Becomes
# Date: 2026-03-07 UTC+3

---

## The Core Idea

The end product is not a single tool. It is the same measurement instrument experienced at five different integration points — by the writer checking a draft, the editor running a coverage dashboard, the reader annotating an article, the platform scoring millions of pieces per day, and the ecosystem treating quality metadata as infrastructure.

The score means the same thing at every layer. Same corpus. Same methodology. Same hash. That shared meaning is what makes it a standard rather than a service.

---

## The Architecture Principle Behind Everything

The tool is a measurement instrument, not an arbitration system.

Every output is structurally of the form:

> "X exists in published discourse [evidence] and is absent from your draft [measurement]."

Never: "You should cover X." Never: "X is important." Never: "X is missing."

This distinction is not cosmetic. It is the architectural decision that makes the product defensible across political lines, across categories, and across cultures. A measurement instrument has no opinion. You can audit it, dispute its methodology, fork its corpus. You cannot call it biased the way you call a human editor biased.

This is how pH meters stay trusted. This is how weather stations stay trusted. They report measurements. The interpretation is yours.

### The Reference Set

Perspectives are not defined by the team, not by a taxonomy committee, not by the LLM's training data. They are empirically discovered from the published discourse:

```
For any topic:
  Corpus of 50K+ published articles across outlets, countries, political leanings
  → Cluster the actual argument space
  → Discover perspectives from what writers actually write about
  → "Global South regulatory frameworks appear in 61% of published AI regulation articles"
  → "Your draft covers 0% of those arguments"
```

The reference set is the world's published discourse, version-controlled and public. Auditable by anyone. Challenged by publishing the sources, not by trusting the algorithm.

### Multi-Model Consensus

For topics where corpus coverage is thin, perspectives are filtered through consensus across multiple models (Claude, GPT-4o, Gemini, Mistral). Only perspectives flagged by 3+ models independently are surfaced. Idiosyncratic flags — the kind that reflect one model's training bias — are filtered out. The intersection is systematically more neutral than any individual model.

### Framework Routing

"Perspectives" means different things across domains. A single detection model breaks on this diversity. The product routes by topic type:

```
Policy topic        → STAKEHOLDER framework (who has material interests?)
Scientific topic    → EPISTEMIC framework (what does the evidence support?)
Cultural topic      → AFFECTED IDENTITY framework (who is named, quoted, absent?)
Technical topic     → EXPERT DISAGREEMENT framework (what do practitioners debate?)
Values-based topic  → ETHICAL FRAMEWORK analysis (which moral frameworks are present?)
```

A climate article gets stakeholder + epistemic analysis. An abortion article gets ethical framework analysis. A crypto regulation piece gets technical + policy analysis combined. The right lens for the right domain.

### Reproducibility

Every analysis is auditable:

```
Corpus version:   discourse_snapshot_v2.3.1 (2026-02-15)
Prompt version:   perspective_detect_v1.4.7
Models used:      [claude-sonnet-4-6, gpt-4o-2026-01, gemini-pro-2025-12]
Output hash:      sha256(input_text + versions → output_json)
Timestamp:        2026-03-07T14:22:00Z
```

Same article in March and October produces the same result. Organizations can audit their own scores over time. Taxonomy changes are version-bumped; old scores are clearly marked. This is what makes it a standard — standards are auditable, services are trusted on reputation.

---

## The Creator Experience

A journalist finishes a 2,000-word draft. She's writing in her normal environment — Ghost, Substack, Google Docs. The Preflight sidebar sits quietly in the right margin. Not intrusive. Peripheral.

As she wrote, the sidebar tracked quietly. A quality arc, not a score — a soft gradient bar that filled and ebbed as she covered ground. At paragraph 4 she made a claim about job displacement. The bar flickered and a one-line tooltip appeared: *"This figure has been revised since 2023 — flag for review?"* She dismissed it. Her choice.

Now she's done. She clicks **Preflight**. Three seconds.

```
PREFLIGHT REPORT
"AI Regulation in 2026: Who Decides?"

  Publication Readiness    71 / 100

  PERSPECTIVES   ███████░░░  7 of 10
  EVIDENCE       ██████░░░░  6 of 10   ← 2 claims flagged
  LOGIC          █████████░  9 of 10
  FRAMING        ██████░░░░  6 of 10   ← headline overpromises
  STAKEHOLDERS   █████░░░░░  5 of 9    ← 4 groups absent
  MANIPULATION   █████████░  9 of 10

  Biggest gap:
  ┌─────────────────────────────────────────┐
  │  GLOBAL SOUTH REGULATORY BODIES         │
  │  12 African and South American          │
  │  regulatory frameworks enacted in 2025. │
  │  Present in 61% of published work on    │
  │  this topic. Your draft: 0 mentions.    │
  └─────────────────────────────────────────┘
```

She expands Evidence. The flagged claim appears with a note: *"McKinsey 2023 figure — updated to 15-30% in their 2025 report."* One-click citation insert.

She clicks **Map**.

---

## The Map

Not a decoration. The product centerpiece.

A constellation. 10 nodes arranged spatially — some close (related perspectives), some far (in tension). Node size reflects coverage frequency in published discourse: larger nodes are more commonly covered. Her covered nodes glow solid and colored. Uncovered nodes pulse as ghost outlines. Her article's footprint: a coherent cluster on one side of the map, strong in the tech-industry-to-regulatory zone, absent on the civil-society and Global South side.

This map is not generated fresh for her article. It is the **topic map** — the stable structure derived from the corpus of 8,000+ published articles on AI regulation. The nodes are empirically discovered. Her article's coverage is her unique footprint on that stable structure.

She hovers over a ghost node:

> "Global South Regulatory Bodies — 61% coverage frequency. Sources include: The Hindu, Al Jazeera English, Africa Digital Rights Forum, Folha de São Paulo."

She clicks it. Three paragraphs appear — excerpts from the strongest published arguments at that node, so she can understand what the perspective actually argues before deciding whether to cover it.

She adds two paragraphs. Hits **Check Again**.

```
Publication Readiness    79 / 100  (+8)
PERSPECTIVES   ████████░░  8 of 10
STAKEHOLDERS   ███████░░░  7 of 9
```

The ghost node fills in on the map, solid now. She publishes. The article carries a quality metadata badge.

---

## The Sharecard

One click generates a PNG:

```
┌──────────────────────────────────────┐
│                                      │
│  "AI Regulation in 2026: Who        │
│   Decides?"                          │
│                                      │
│  PREFLIGHT: 79 / 100                 │
│                                      │
│  ███████░░  Perspectives   7/10      │
│  ██████░░░  Evidence       6/10      │
│  █████████  Logic          9/10      │
│                                      │
│  Checked before publishing.          │
│  Global South regulatory angle       │
│  added after initial analysis.       │
│                                      │
│  preflight.ai                        │
└──────────────────────────────────────┘
```

Three reasons this spreads:

**The weapon loop.** A reader scores a CNN article. 41/100. Shares it: "Look what they're leaving out." A conservative scores an MSNBC article. 44/100. Different gaps. Shares it. Both sides using the same instrument to prove the other side is blind. Both bring new users to the tool.

**The mirror loop.** A creator checks their own draft. Scores 52. Finds a gap that's genuinely right. Adds it. Scores 74. Shares both cards: "I didn't know I was missing this." Higher engagement than the attack posts. Vulnerability is magnetic. This is the conversion moment — from reader to creator using the tool.

**The competition loop.** "I scored 82 on my housing piece. What did you get?" Wordle energy. Score comparison as social currency among creators.

Each loop feeds the others. The card is the entire ad. The user is the marketing team.

---

## The Creator Dashboard

After 30 articles, the dashboard becomes something different:

```
YOUR COVERAGE SIGNATURE
Past 6 months  |  31 articles

Average score:        74 / 100    (up from 67 six months ago)

Strongest dimension:  Logic        (avg 8.9 / 10)
Consistent blind spot: Global South  (appears in 58% of
                        published work on your topics;
                        appears in 11% of your articles)

Signature coverage:  [constellation showing the discourse
                      regions you habitually cover and
                      the regions you systematically avoid]
```

This is the mirror loop made permanent. Not "your article scored X" — "here is your pattern across time, your intellectual signature, and your recurring gaps." The kind of self-knowledge that changes how writers write, not just how they edit.

---

## The Newsroom

The editorial team opens the Coverage Dashboard on Monday morning.

Their last 30 days of published articles mapped onto the AI regulation topic map. Their footprint is visible. Strong in the tech-company-facing zone. Completely absent in the labor and civil society zones.

```
COVERAGE GAPS  (30-day window)

Underrepresented vs. published discourse:
  Labor / unions           Your coverage: 0%  |  Discourse: 24%
  Disability access        Your coverage: 3%  |  Discourse: 19%
  Small business impact    Your coverage: 8%  |  Discourse: 31%

First-mover opportunities:
  EU AI Act enforcement timeline — not covered by any outlet
  in your competitive set in the past 14 days.
  Coverage frequency in discourse: 38%.
```

This is editorial intelligence. Not "you're biased" — that is a fight. "You have a coverage gap and here is a first-mover opportunity" — that is a tool editors actually use.

A quality floor can be set: no article below 65 publishes without senior review. Not rejection — a trigger for review. The signal informs the editorial judgment; it does not replace it.

Quality history per outlet: average scores by topic, by writer, over time. A publication's quality trend is visible to the team before it becomes visible to the public.

---

## The Reader

The browser extension sits in the toolbar. Quiet on most sites.

When the reader visits an article that has been checked — either by the author or by community checking — a small badge appears. They click it.

```
This article: 58 / 100

PERSPECTIVES  ██████░░░░  6 of 10
  Missing: Small business, Labor unions, Global South

EVIDENCE      ████░░░░░░  4 of 10
  ! "AI will replace 40% of jobs" — McKinsey revised
    this figure to 15-30% in their 2025 report

FRAMING       █████░░░░░  5 of 10
  Headline implies certainty; body uses "may" / "could"

[View full map]   [Check another article]
```

The extension works on any written content online — articles, Twitter/X threads, Reddit posts, LinkedIn essays. For unchecked content, the user can trigger a live analysis. Their result is stored and contributes to the public corpus.

The reader sees the map of the article they are reading. They can see exactly which nodes are covered, which are absent. They can look at the same map for a different article on the same topic and see how the coverage patterns differ.

They are no longer navigating the information environment alone.

---

## The Platform

A news aggregator integrates the API. Search gains a quality dimension:

> "Show me the most thorough article on housing affordability — not the most clicked, the most complete."

A social platform uses the API at the point of sharing. When a user shares an article scoring below 50, a gentle overlay appears: *"This article covers 4 of 10 common perspectives on this topic. See what's missing?"* Not blocking. Not a warning. Information. The user shares anyway — but they saw the signal, and so did their followers.

A European publisher uses it for DSA Article 14 compliance. Every article scored before publication. Monthly quality reports auto-generated for regulators. Compliance cost drops from €80/article (human reviewer) to €0.10.

An advertiser sets a brand safety floor: only place ads next to content scoring above 70. Publications with consistent high scores get premium rates. Quality becomes economically legible.

---

## The Standard

Articles published through Preflight carry a metadata block:

```json
{
  "preflight": {
    "score": 79,
    "version": "corpus_2026-Q1_prompt_v3.2",
    "perspectives": { "covered": 8, "total": 10 },
    "dimensions": {
      "perspectives": 7, "evidence": 6, "logic": 9,
      "framing": 6, "stakeholders": 7, "manipulation": 9
    },
    "hash": "sha256:e3b0c44298fc1c149afb4c8996fb924...",
    "checked_at": "2026-03-07T14:22:00Z"
  }
}
```

This travels with the article. Any browser, any aggregator, any search engine can read it. Articles with it carry a badge. Articles without it look unchecked.

The same way HTTP without S looks today.

Search engines begin weighting quality as a ranking signal — not heavily, just enough that a 55-scoring article gets a slight disadvantage over an 80-scoring article on the same query. Publishers notice. The race to improve quality begins — not because anyone mandated it, but because quality became measurable and measurement was made economic.

Journalism schools require a Preflight check on every assignment. Not to enforce a high score — to develop the habit of checking before publishing.

---

## What the Product Is, at Each Layer

The same measurement instrument, five integration points:

| User | What Preflight is | The analogy |
|---|---|---|
| Individual creator | Quality check before publish. Mirror for blind spots over time. | Grammarly, but for ideas |
| Newsroom editor | Coverage gap dashboard. Assignment intelligence. Quality floor. | SEMrush, but for discourse coverage |
| Reader | Article transparency layer. What is missing from what you are reading. | Nutrition label on the article |
| Platform | Content quality API. DSA compliance infrastructure. Ranking signal. | PageSpeed, but for editorial quality |
| Ecosystem | Open standard for content quality metadata. | HTTPS / Let's Encrypt |

These are not five different products. They are the same product at five different integration points. The creator checking their draft and the platform scoring millions of articles per day use the same underlying measurement. The score means the same thing at every layer.

---

## What the Product Knows After 10 Million Checks

After enough articles, the topic maps stabilize. For any topic anyone writes about, there is a battle-tested map of the discourse structure — the nodes, their typical coverage frequencies, the geographic and political distribution of who covers what.

The blind spot patterns become visible at scale:

> "English-language media covers AI regulation from the tech-company and regulatory-body perspectives 89% of the time. Labor, civil society, and Global South perspectives appear in 23%, 31%, and 17% of articles respectively. This gap has widened 12 points since 2023."

That is not an opinion. That is a measurement nobody has ever been able to make before.

The shape of what humanity writes about — and what it systematically fails to write about — drawn not by an authority, but by the aggregate pattern of millions of writers checking their work before they publish.

---

## The Phases

**Phase 1 (Hackathon):** The Gate. Paste draft → score + list + map. LLM-generated perspectives. The "oh shit" moment demonstrated live.

**Phase 2 (Month 1-6):** Creator Pro. Corpus-backed perspectives for top 100 topic categories. Reproducible scores. Sharecard virality. ProductHunt launch.

**Phase 3 (Month 6-18):** Newsroom teams. Coverage dashboard. Assignment intelligence. CMS integration. Editorial API.

**Phase 4 (Month 18-36):** Platform API. DSA compliance. Quality as ranking signal. Browser extension for readers. Multi-model consensus filter live.

**Phase 5 (Year 3-5):** Open standard. Quality metadata embedded at publication. The badge. The ecosystem. Content without a Preflight score looks as incomplete as a website without HTTPS.

---

## The Deepest Thing

The hackathon builds a mirror for one writer, once.

The end product makes the mirror permanent, public, and structural. A live map of what humanity writes about and what it systematically fails to see — not designed by any authority, emerging from the pattern of millions of writers asking "what am I missing?" before they publish.

Not a tool. Not a company. Infrastructure for how the written word becomes trustworthy again.

---

*"Creating content is free. Checking it used to be expensive. We made it free too. Then we made the checking public, auditable, and structural. Now quality is visible — and visibility, once established, cannot be taken away."*
