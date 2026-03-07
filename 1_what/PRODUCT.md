# What Are We Building?

---

## One Sentence

A platform where anyone can turn a voice recording, some photos, and rough notes into a quality-reviewed local news article — published on their town's digital newspaper in five minutes.

---

## The Contributor Flow (the core product)

```
SCREEN 1: HOME
  Your town's newspaper (recent articles)
  Big button: "+ New Story"

SCREEN 2: CAPTURE
  Three input methods (combine any):
  [Record Audio]  — tap to start/stop
  [Add Photos]    — camera or gallery
  [Write Notes]   — free text

  Input: 1-5 min voice recording, 0-5 photos, optional notes
  Button: "Generate Article"

SCREEN 3: REVIEW
  Left: THE ARTICLE
    - Headline
    - Body (structured paragraphs)
    - Attributed quotes from transcript
    - Photo captions
    - Editable by contributor

  Right: QUALITY REVIEW
    - Overall score (e.g. 72/100)
    - Dimension scores:
      * Factual accuracy (checked against source)
      * Quote attribution (quotes match transcript?)
      * Perspectives (how many stakeholder views represented?)
      * Representation (whose voices are present/missing?)
      * Ethical framing (speaking WITH or ABOUT the community?)
      * Completeness (what context is missing?)
    - Coaching suggestions:
      "Add a response from the school board."
      "You mention 3 teams but only quote 1."
      "Budget figure seems high — can you verify?"
    - Blocking flags (red) vs suggestions (yellow)

  Button: "Publish" (active when no blocking flags)

SCREEN 4: PUBLISHED
  Confirmation. Link to live article. Share options.
```

---

## The Reader Experience

```
TOWN NEWSPAPER (e.g. springville.lnp.app)

  Header: Town name
  Categories: Council, Schools, Business, Events, Sports, Community, Culture

  Article cards (reverse chronological):
    - Headline + first paragraph
    - Photo thumbnail
    - "By [Name]" or anonymous
    - Published time
    - Quality score badge

  Article page:
    - Full article with photos
    - Quality score details (expandable)
    - Source: "Written from voice recording + photos by [Name]"
```

---

## Key Design Decisions

**The AI never invents.** It structures what the contributor provided. Every quote from the transcript. Every fact from the notes. It organizes — it doesn't create.

**Coaching, not policing.** The review suggests improvements. The contributor decides. Like a good editor, not a censor. Only potential defamation triggers a block.

**No algorithm.** Reverse chronological with category filters. Simplicity over engagement optimization.

**Quality score is visible.** Readers see how well-sourced a story is. Builds trust. Incentivizes contributors to improve.

**Source transparency.** Every article shows what raw inputs built it. Readers know this came from a real person.

---

## The "Better Newspaper" Thesis

The old newspaper had problems too — one editor, one worldview, commercial pressure on coverage, marginalized communities underreported.

We don't restore the old newspaper. We build a better one:
- Many contributors, many perspectives
- AI review checks for missing voices (something no human editor could afford to do systematically)
- Near-zero cost means no commercial pressure on coverage
- The community IS the newsroom

Pitch line: "Your town doesn't get its old newspaper back. It gets the newspaper it should have had."

---

## Scope: Hackathon

**Build:**
- Mobile web app (works on any phone browser)
- Audio recording + transcription
- Photo upload + text notes
- AI article generation + quality review (6 dimensions)
- Coaching suggestions
- One town newspaper site for demo

**Don't build:**
- User accounts, multiple towns, ads, comments, notifications
- Coverage map, community calibration, public record ingestion
- Native app, moderation dashboard, analytics

**Pitch but don't build:**
- Coverage map (shows what's NOT covered)
- Community calibration (the moat — town teaches AI its norms)
- Story seeds from public records (cold-start solution)
- Multi-language (pipeline works in 99 languages)
- National trend detection from local data

---

## Open: Product Name

**Requirements:** short, memorable, implies local/community, works in "We built ___."

Decide in first team meeting. Working name is fine for the hackathon.
