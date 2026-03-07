# Frontend Design — What It Looks Like, Where to Steal From
# Date: 2026-03-07 UTC+3

Four screens. Each has a mood, a reference product, and a specific plan. This document is the bridge between the user stories (what happens) and the code (how it renders).

---

## Current State of the Frontend

The PostPage is ~600 lines of a Notion-style block editor built before the article engine architecture matured. What exists:

- **InputStep:** text area + file upload. Has the right prompt ("What happened?") and a chat-app bottom toolbar. No voice recording.
- **ProcessingStep:** SSE spinner with three step labels (transcribing, generating, reviewing). Functional, good bones.
- **PreviewStep:** Editable content blocks with grip handles, slash commands (`/text`, `/subheading`), a cover image with drag-to-reposition, and an "Ask AI to edit" bar with hardcoded responses ("Shorter", "More formal"). This is a CMS editor — the opposite of what the architecture specifies.
- **ArticlePage:** Quality score shown as `/100` with expandable dimension bars. The architecture says scores are internal — contributor should see gate + coaching only.
- **HomePage:** Hardcoded articles in a news grid with category badges. The layout bones are good but the data is static.

**What's right:** the "What happened?" prompt, the compose-textarea feel, the SSE step indicators, the category badge system, the design tokens.

**What's wrong:** the block editor (contributor should never edit text directly), the quality score display (should be gate + coaching), no voice recording, no coaching sidebar, no refinement loop, no gate system.

---

## The Four Screens

### Screen 1: CAPTURE — "What happened?"

**Mood:** Sending a voice note to a friend. Casual, fast, one-thumb.

**What the contributor does:** Records a voice memo, snaps photos, optionally types notes. Hits submit. Under 60 seconds.

**Steal from:**

| Product | What to steal | Why it works |
|---|---|---|
| **WhatsApp voice notes** | Tap-to-record, waveform playback strip, swipe-to-cancel, elapsed timer | 7 billion messages/day. The UX is proven at planetary scale. Everyone already knows it. |
| **Voicenotes app** | Big mic button as primary input, recording appears as a playable card, multiple recordings stack vertically | They nailed "just talk" as the primary interaction. No forms, no fields. |
| **Instagram Stories capture** | Multi-mode bottom bar (photo/video/text) | The pattern of switching between capture modes with a bottom toolbar is the right mobile paradigm. |

**Layout (mobile-first):**

```
+----------------------------------+
| [< Back]         New Story       |
+----------------------------------+
|                                  |
|  "What happened?"                |
|  Tell your neighbors.            |
|                                  |
+----------------------------------+
|                                  |
|  [waveform: 1:32]  [play] [x]   |
|                                  |
|  [thumbnail] [thumbnail] [thumb] |
|                                  |
|  [optional notes text...]        |
|                                  |
+----------------------------------+
|                                  |
|  [Camera]   [ MIC ]   [Notes]   |
|             (large)              |
|                                  |
|  [       Create Article        ] |
|                                  |
+----------------------------------+
```

**Key design decisions:**

1. **Mic button is primary.** Center position, larger than camera and notes buttons. Voice is the main input — photos and notes are supplementary. The current InputStep treats text as primary; this inverts it.

2. **Recording UI.** Tap mic to start — screen shows a pulsing indicator, live waveform, and a timer counting up. Tap again to stop. The recording appears as a waveform strip above the toolbar (like a WhatsApp voice message in a chat). Tap to play back. X to delete. Can record multiple clips — each stacks.

3. **Photos as thumbnails.** Tap camera opens native camera/picker. Photos appear as a horizontal thumbnail strip. Tap to preview, X to remove. Max 5-10.

4. **Notes are optional.** A text area that's collapsed by default. Tap "Notes" to expand it. Placeholder: "budget vote, school cuts, heated" — showing that terse is fine.

5. **"Create Article" button** activates once there's at least one input (audio, photo, or notes). The label says "Create Article" not "Submit" — it implies transformation, not upload.

6. **No forms.** No title field, no category dropdown, no location selector (the AI infers these from content). No structured input. Just raw material.

**What to keep from current frontend:** the `compose` class styling, the file thumbnail strip with remove buttons, the `compose-textarea`, the bottom toolbar pattern. **Replace:** add the mic recording UI, make mic the center/primary button, remove the location selector from the input step.

**References to look at:**
- WhatsApp iOS voice recording interaction
- Voicenotes app (voicenotes.com) — the recording and playback UI
- Telegram voice message UI (similar to WhatsApp but with pause/resume)

---

### Screen 2: PROCESSING — "Creating your article"

**Mood:** Anticipation. Something is happening. Not a dead wait.

**What the contributor sees:** Step indicators ticking through as the pipeline runs. ~22 seconds.

**Steal from:**

| Product | What to steal | Why it works |
|---|---|---|
| **ChatGPT streaming** | The feeling of content forming in front of you | Even without word-by-word streaming, visible progress transforms waiting into watching |
| **Otter.ai live transcription** | Words appearing as audio plays, with confidence indicators | The transcript reveal could be our first visual payoff during the wait |
| **Linear app** | Smooth step transitions with subtle animations | Their loading states feel purposeful, not stalled |

**Layout:**

```
+----------------------------------+
|                                  |
|         [animated icon]          |
|                                  |
|     Creating your article        |
|                                  |
|  [x] Listening to your          |
|      recording...          3s   |
|                                  |
|  [*] Writing your article...     |
|      (spinner)                   |
|                                  |
|  [ ] Reviewing quality           |
|                                  |
+----------------------------------+
```

**Key design decisions:**

1. **Status labels are human, not technical.** "Listening to your recording" not "Transcribing audio." "Writing your article" not "Generating." "Reviewing quality" not "Running quality checks." The current labels are already close — just soften them.

2. **Elapsed time per step** (small, secondary). Shows "3s" next to completed steps. This builds confidence that the system is fast.

3. **For hackathon: keep it simple.** The current ProcessingStep is 90% right. Update the labels, add the time indicator, polish the animation. Don't try to stream the transcript.

4. **Aspirational (post-hackathon):** During the "Listening" phase, stream the transcript appearing word-by-word. Then it fades/collapses and the article starts forming. The contributor sees their messy words become polished text. This is the first pride moment in motion.

5. **New status for refinement:** When re-processing after a refinement, show "Incorporating your feedback..." → "Rewriting..." → "Reviewing..." The contributor knows the system heard them.

**What to keep from current frontend:** the `ProcessingStep` component almost entirely. Just update labels and add elapsed time.

---

### Screen 3: EDITORIAL — The core screen (biggest redesign)

**Mood:** Quiet pride. "This is my article." Then: a mentor sitting next to you.

**What the contributor sees:** Their article rendered as it will look when published. Coaching alongside it. A quick way to respond.

This is where the product lives or dies. Two halves: the article (pride) and the coaching (mentoring).

**Steal from:**

| Product | What to steal | Why it works |
|---|---|---|
| **The Guardian 2025 redesign** | Print-inspired art direction in a mobile-first UX. Serif headlines, section-specific typography, generous whitespace. 75% of their traffic is mobile. | They proved you can make a newspaper feel on a phone screen. That's exactly our article display. |
| **Ghost Casper theme** | Clean article rendering: serif body, proper heading hierarchy, inline images with captions, generous line height. No chrome. | The gold standard for "the article IS the interface." Nothing between the reader and the words. |
| **Google Docs suggesting mode** | Comments in the margin connected to specific text. Accept/dismiss pattern. Reply to discuss. | The spatial relationship — feedback NEXT TO what it's about — is the key pattern for coaching. |
| **News Painters (UNIST, Red Dot 2025)** | Each report is a unique color "painting" the community canvas. Multiple contributors adding to the same story. | The visual metaphor for collaborative contribution and the refinement visualization. |

**Desktop layout (~1024px+):**

```
+------------------------------------------------------------------+
|  [< Back]                                    [GREEN] [Publish ->] |
+------------------------------------------------------------------+
|                                                                    |
|  ARTICLE (~65%)                    |  COACHING (~35%)              |
|                                    |                               |
|  Council Approves Budget 5-2       |                               |
|  Amid School Funding Protests      |  "The Korhonen quote really   |
|                                    |   captures the tension."      |
|  By Liisa M.  *  6 Mar 2026       |                               |
|  [Council]  *  Kirkkonummi         |  Two things that would make   |
|                                    |  it even stronger:            |
|  The Kirkkonummi town council      |                               |
|  voted 5-2 on Tuesday evening      |  1. Do you remember what      |
|  to approve the 2026 municipal     |     specific programs would   |
|  budget, drawing sharp criticism   |     be cut?                   |
|  over proposed cuts to school      |                               |
|  funding.                          |  2. Did any parents speak     |
|                                    |     during public comment?    |
|  "Our children deserve better      |                               |
|  than this," said council member   +-------------------------------+
|  Korhonen...                       |                               |
|                                    |  [Mic] Record a response      |
|  [photo: packed gallery]           |                               |
|                                    |  [Or type here............]   |
|  An estimated 40 residents         |                               |
|  packed the council gallery...     |  [Update article]             |
|                                    |                               |
|                                    +-------------------------------+
|                                    |  Round 1 of 1                 |
|                                    |  [View previous version]      |
+------------------------------------------------------------------+
```

**Mobile layout (stacked):**

```
+----------------------------------+
| [< Back]      [GREEN] [Publish] |
+----------------------------------+
|                                  |
|  Council Approves Budget 5-2     |
|  Amid School Funding Protests    |
|                                  |
|  By Liisa M.  *  6 Mar 2026     |
|  [Council]                       |
|                                  |
|  The Kirkkonummi town council    |
|  voted 5-2 on Tuesday evening    |
|  ...                             |
|                                  |
|  [photo]                         |
|                                  |
|  ...rest of article...           |
|                                  |
+--- coaching section -------------+
|  (--color-bg-secondary)          |
|                                  |
|  "The Korhonen quote really      |
|   captures the tension."         |
|                                  |
|  1. Do you remember...?          |
|  2. Did any parents speak...?    |
|                                  |
|  [Mic] Record a response         |
|  [Or type here............]      |
|  [Update article]                |
|                                  |
|  Round 1  [Previous version]     |
+----------------------------------+
```

**The Article Side (left / top on mobile):**

This IS the published article. Same fonts, same layout.

- **Headline:** `--font-serif`, `--text-3xl`, `--font-bold`. Newspaper headline feel.
- **Byline:** "By Liisa M." prominently displayed. This is the pride line. Date, category badge, town name.
- **Body:** `--font-serif`, `--text-lg`, `--leading-relaxed`. Comfortable reading width (`--size-content`, ~65ch).
- **Quotes:** Block quote styling — left border or indentation, attributed. Visually distinct from body text.
- **Photos:** Inline where the AI placed them, with captions generated from the photo descriptions.
- **No edit controls, but selectable.** No cursor, no contentEditable, no block handles, no slash commands, no grip icons. The article is a preview — read-only. But the contributor CAN select text (desktop) or tap a paragraph (mobile) to give a targeted instruction to the AI. See `INTERACTION_MODEL.md` for the full specification of the four interaction modes: Select + Instruct, Quick Action Chips, Coaching-Anchored Suggestions, and General Voice/Text.

Render the article markdown with `react-markdown`. The same component renders on the reader page — what the contributor sees here IS what gets published.

**The Coaching Side (right / below on mobile):**

Three sections stacked vertically:

**Section A: Celebration + Questions (coaching-anchored)**

The coaching text from the review. Always starts with what's good, then asks 1-2 questions. The tone is warm — a conversation, not a report card.

- Celebration text in `--font-sans`, `--text-base`, slightly muted (`--color-text-secondary`). A warm, personal register.
- Questions as a numbered list, each phrased as curiosity. `--font-sans`, `--text-base`, `--color-text`.
- **Each question is tappable.** Tapping a coaching suggestion scrolls the article to the relevant paragraph, highlights it, and opens the instruction bar. The contributor can respond (voice or text) right there. See `INTERACTION_MODEL.md` Mode 3.

For RED gate: this section is larger and more prominent. Shows the mirror: "What's here" and "What's not here." Then specific paths forward. Framed as journalism quality, not moral judgment. See USER_STORIES.md Story 6 for exact language.

**Section B: Response Input**

A compact input area for the contributor to respond:

- **Mic button** — tap to record a voice response. Same waveform UI as the capture screen but smaller.
- **Text area** — "Or type here..." for quick text responses. Auto-expanding. Not a rich text editor — just a plain text box.
- **"Update article" button** — sends the response to `/refine`, triggers GENERATE + REVIEW, shows the processing state briefly, then the article + coaching update.

This input should feel as casual as the capture screen. A quick reply, not a writing session.

**Section C: Version Info**

Small, bottom of the coaching panel:

- "Round 1 of 1" (or "Round 2 of 3" etc.)
- "View previous version" link — opens a simple comparison showing what changed.

Not prominent. Safety net, not a feature.

**The Gate (top bar):**

The gate status appears in the header bar, small and clear:

- **GREEN:** Small green dot next to the Publish button. Publish is active, primary-colored (`--color-primary`).
- **YELLOW:** Amber dot. Publish is active. A subtle line: "Optional improvements suggested."
- **RED:** Red dot. Publish button is grayed out / `disabled`. The coaching section below explains why and offers specific paths forward. An "Appeal" link appears at the bottom of the coaching section.

The gate is NOT:
- A traffic light graphic
- A score number
- A progress bar
- A grade (A/B/C)

It's a status indicator. Like the lock icon in a browser's address bar. Present, clear, not the center of attention.

**What to remove from current frontend:**

- The entire block editor (EditorBlock, BlockTypeMenu, SlashMenu, CoverImage drag-to-reposition)
- The AI edit bar with hardcoded responses ("Shorter", "More formal")
- The quality score `/100` display and dimension bars
- The `ReviewResult` display as flags

**What to keep:**

- The publish button and its handler (update to check gate)
- The category badge rendering
- The overall page structure (nav + content + bottom bar)

**References to look at:**
- The Guardian app article view (2025 redesign) — for article typography and spacing
- Ghost.org/blog (any post) — for the reading surface
- Google Docs with suggesting mode active — for the sidebar coaching pattern
- News Painters (UNIST) screenshots — for the collaborative contribution visualization

---

### Screen 4: READER — The town newspaper

**Mood:** "Our town has a newspaper again."

**What the reader sees:** A clean, modern local newspaper. Articles by their neighbors. Categories. No algorithm.

**Steal from:**

| Product | What to steal | Why it works |
|---|---|---|
| **The Guardian 2025** | Primary sections with big display, secondary with higher density. Section-specific typography. | They solved the "everything looks the same" problem that plagues news sites. Different sections feel different. |
| **Badische Neueste Nachrichten** | Traditional newspaper aesthetic for a regional publication. Minimalist, clean, serves older and younger readers. | Regional paper for a regional audience — exactly our context. The print feel builds trust. |
| **Patch.com** | Town name at top, reverse-chronological, category filters. Simple and functional at 30K+ communities. | Proof that simple works at scale. No overdesign. |
| **Ghost Casper theme** | The default blog homepage — headline, excerpt, author, date. Cards in a grid. | Clean, proven, fast to build. |

**Homepage layout:**

```
+------------------------------------------------------------------+
|  KIRKKONUMMI                                           [Search]   |
|  Community Newspaper                                              |
+------------------------------------------------------------------+
|  [All] [Council] [Schools] [Business] [Events] [Sports]          |
+------------------------------------------------------------------+
|                                                                    |
|  LEAD STORY (full width)                                           |
|  +--------------------------------------------------------------+ |
|  | [large photo]                                                 | |
|  |                                                               | |
|  | Council Approves Budget 5-2                                   | |
|  | Amid School Funding Protests                                  | |
|  |                                                               | |
|  | The Kirkkonummi town council voted 5-2 on Tuesday...          | |
|  |                                                               | |
|  | By Liisa M.  *  6 Mar 2026  *  Council                       | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  +---------------------+  +---------------------+                  |
|  | [photo]              |  | [photo]              |                 |
|  | Leipomo Ainola Opens |  | Masala Playground    |                 |
|  | on Kauppalankatu     |  | Approved             |                 |
|  |                      |  |                      |                 |
|  | By Matias R. * Biz   |  | By Antti K. * Comm   |                 |
|  +---------------------+  +---------------------+                  |
|                                                                    |
|  BRIEF HEADLINES                                                   |
|  +--------------------------------------------------------------+ |
|  |  * PORT 2026 Hackathon at Aalto  *  By Samu T.  *  Events    | |
|  |  * Library Hours Change in March  *  Community                | |
|  |  * Veikkola Road Work Starts Monday  *  Council               | |
|  +--------------------------------------------------------------+ |
|                                                                    |
+------------------------------------------------------------------+
```

**Key design decisions:**

1. **Town name as masthead.** "KIRKKONUMMI" large at top, "Community Newspaper" as subtitle. This is the newspaper's identity. Not a platform brand — the town's name.

2. **Category tabs as horizontal pills.** Scrollable on mobile. Filter articles by tapping. "All" is default. Categories from the design system: council, schools, business, events, sports, community.

3. **Three-tier article display:**
   - **Lead story:** Full-width card with large photo, headline in `--font-serif` `--text-3xl`, excerpt, byline. The most recent significant article.
   - **Standard stories:** 2-column grid (1 column on mobile). Photo + headline + byline. Cards with `--shadow-sm`, `--radius-lg`.
   - **Briefs:** Compact list items. Headline + byline + category badge. No photo. For thin articles (Story 2 type bakery openings, quick announcements).

4. **Byline always visible.** Every card shows "By [Name]" prominently. This is the pride moment for the contributor AND the trust signal for the reader. The contributor's name is more prominent than the date.

5. **No algorithm.** Reverse chronological within categories. The lead story is the most recent (for hackathon). No engagement-based sorting, no "trending," no personalization.

6. **No scores visible to readers.** No quality indicators, no dimension bars, no numbers. The reader sees articles. If it's published, it passed the gate. Trust is implicit.

**Article page layout:**

```
+------------------------------------------------------------------+
|  [< KIRKKONUMMI]                                      [Share]     |
+------------------------------------------------------------------+
|                                                                    |
|  [Council]                                                         |
|                                                                    |
|  Council Approves Budget 5-2                                       |
|  Amid School Funding Protests                                      |
|                                                                    |
|  By Liisa M.  *  6 March 2026                                     |
|                                                                    |
|  ---------------------------------------------------------------  |
|                                                                    |
|  The Kirkkonummi town council voted 5-2 on Tuesday evening to      |
|  approve the 2026 municipal budget, drawing sharp criticism over    |
|  proposed cuts to school funding.                                   |
|                                                                    |
|  "Our children deserve better than this," said council member       |
|  Korhonen, one of two dissenting votes alongside council member     |
|  Virtanen.                                                         |
|                                                                    |
|  [photo: packed council gallery]                                   |
|  Caption: Residents packed the council gallery for the budget vote  |
|                                                                    |
|  An estimated 40 residents packed the council gallery, many of      |
|  them parents concerned about the impact on local schools...        |
|                                                                    |
|  ---------------------------------------------------------------  |
|                                                                    |
|  By Liisa M.                                                       |
|  [4 articles]  *  Member since March 2026                          |
|                                                                    |
|  ---------------------------------------------------------------  |
|                                                                    |
|  MORE FROM KIRKKONUMMI                                             |
|  [card] [card] [card]                                              |
|                                                                    |
+------------------------------------------------------------------+
```

- **Article body:** `--font-serif`, `--text-lg`, `--leading-relaxed`, max-width `--size-content` (~65ch). This is the same rendering component used in the editorial screen — what the contributor previewed is what the reader sees.
- **Block quotes** for direct quotes — left border, indented, attributed.
- **Photos** inline with captions below.
- **Contributor card** at the bottom — name, article count, member since. Small, respectful. Links to their other articles.
- **"More from Kirkkonummi"** — 3 article cards at the bottom. Keeps the reader in the newspaper.

**What to keep from current frontend:** the HomePage grid layout bones, the category badge system (`--color-cat-*` tokens), the ArticlePage structure. **Replace:** hardcoded articles with real data, quality score widget with nothing (readers don't see scores), the block rendering with markdown rendering.

**References to look at:**
- theguardian.com on mobile — the 2025 redesign homepage
- ghost.org/blog — article page typography and spacing
- patch.com/{any-town} — the simplicity of a hyperlocal homepage
- Helsingin Sanomat (hs.fi) and Kirkkonummen Sanomat — Finnish newspaper aesthetic that the target audience already trusts

---

## Design Tokens Already in Place

The design system (`UI_DESIGN_SYSTEM.md` + `tokens.css`) already has the right foundations:

| Need | Token | Status |
|---|---|---|
| Article headlines | `--font-serif`, `--text-3xl`, `--font-bold` | Exists |
| Article body | `--font-serif`, `--text-lg`, `--leading-relaxed` | Exists |
| UI chrome | `--font-sans`, `--text-base` | Exists |
| Category badges | `--color-cat-council`, `--color-cat-schools`, etc. | Exists |
| Card styling | `--color-surface`, `--shadow-sm`, `--radius-lg` | Exists |
| Coaching background | `--color-bg-secondary` | Exists |
| Gate colors | `--color-success`, `--color-warning`, `--color-error` | Exists |
| Spacing scale | `--space-1` through `--space-24` | Exists |
| Content width | `--size-content` | Exists |
| Review flags | `.flag-warning`, `.flag-error`, `.flag-info` | Exists (repurpose for gate) |

The visual infrastructure is ready. The design system was built well — it just needs to be applied to the new screen architecture.

---

## What to Build and In What Order

### Priority 1: Editorial screen (Screen 3)

This is the most complex, the most important, and the screen where every user story's outcome is tested. Build it first.

**Step 1:** Static version with hardcoded article markdown + hardcoded coaching JSON. Get the layout right — article left, coaching right, gate in header. Test on both desktop and mobile. This is pure CSS + layout work.

**Step 2:** Wire to the backend. Replace hardcoded data with the SSE complete event payload. Render `article_markdown` with `react-markdown`. Display coaching from `review.coaching`. Show gate from `review.gate`.

**Step 3:** Add the refinement input. Mic button + text area in the coaching panel. Wire to `POST /refine`. Show processing state, then update article + coaching.

### Priority 2: Capture screen (Screen 1)

The existing InputStep is 70% there. The main addition is voice recording.

**Step 1:** Add the MediaRecorder API integration. Tap to record, tap to stop. Display as waveform strip. This is the key new component.

**Step 2:** Rearrange the toolbar — mic center/primary, camera and notes flanking.

**Step 3:** Wire the audio file to the submission FormData (already partially done — the current code appends audio files).

### Priority 3: Processing screen (Screen 2)

The current ProcessingStep works. Polish it.

**Step 1:** Update labels to human-friendly versions.
**Step 2:** Add elapsed time per step.
**Step 3:** Handle new refinement statuses ("transcribing_direction").

### Priority 4: Reader pages (Screen 4)

The easiest to get right — it's mostly CSS and data binding.

**Step 1:** Replace hardcoded articles on HomePage with real data from the API.
**Step 2:** Render article body as markdown on ArticlePage (same `react-markdown` component from the editorial screen).
**Step 3:** Remove the quality score widget. Add the contributor card at the bottom.
**Step 4:** Polish the newspaper grid — lead story full width, standard cards in grid, briefs as a list.

---

## The Anti-Patterns (What NOT to Do)

| Anti-pattern | Why | What to do instead |
|---|---|---|
| Make it look like a CMS | The contributor isn't a journalist using production tools. They recorded a voice memo. | Make it look like a newspaper (article side) and a conversation (coaching side). |
| Show raw scores to contributors | Numbers turn mentoring into grading. "perspectives: 0.4" kills pride. | Show the coaching text. The score is a guide for the AI, not a grade for the human. |
| Add a rich text editor | Direct text editing is the intimidation barrier. "I'm not a writer." | The contributor talks to the AI about changes. The AI rewrites. No cursor in the article. |
| Use a traffic light for the gate | A red/yellow/green traffic light graphic feels like a test result. | A small dot in the header. Status, not judgment. |
| Over-design the coaching | Fancy cards, icons per dimension, expandable accordions — complexity obscures the message. | Plain text. A person talking. "The Korhonen quote really captures the tension." |
| Make the capture screen feel like a form | Title, category, description, location — every field is friction. | "What happened?" + mic + camera + notes. That's it. |
| Build for desktop first | 75% of Guardian traffic is mobile. Our contributors are in the field with a phone. | Mobile-first. The desktop layout (two columns) is for the demo. Mobile (stacked) is for real use. |

---

## Reference Products — Full List

### For the Capture Screen
- **WhatsApp** — voice note recording UX (iOS and Android)
- **Voicenotes** (voicenotes.com) — voice-to-content app, big mic, playback cards
- **Telegram** — voice message with pause/resume, waveform visualization
- **Instagram Stories** — multi-mode capture bar, fast switching between photo/video/text

### For the Processing Screen
- **ChatGPT** — streaming response, content forming in front of you
- **Otter.ai** — live transcription, words appearing in real time
- **Linear** — smooth step transitions, purposeful loading states

### For the Editorial Screen
- **The Guardian 2025 redesign** — print-inspired art direction, mobile-first, section-specific typography
- **Ghost Casper theme** — clean article rendering, serif body, generous whitespace
- **Google Docs suggesting mode** — sidebar comments next to relevant text
- **News Painters (UNIST)** — collaborative contribution visualization, Red Dot 2025 winner

### For the Reader Newspaper
- **The Guardian** — homepage with primary/secondary section density, bold headlines
- **Badische Neueste Nachrichten** — regional newspaper, traditional aesthetic, serves mixed-age audience
- **Patch.com** — hyperlocal simplicity at 30K+ communities
- **Ghost default themes** — clean blog homepage, article cards
- **Helsingin Sanomat (hs.fi)** — Finnish newspaper aesthetic the target audience trusts
- **Kirkkonummen Sanomat** — the actual local newspaper our readers are familiar with

### What We Are NOT
- **Arc XP Composer** — too complex, for professionals writing 3-5 stories/day
- **WordPress editor** — too many controls for someone not composing from scratch
- **Notion** — block paradigm assumes you're building a document, we're showing a finished article
- **Medium editor** — assumes you're writing, our contributor is reviewing
- **Any traditional CMS** — the contributor never sees "the CMS"
- **Any markdown editor** (Typora, Vditor, Milkdown, StackEdit) — even the most elegant inline rendering fails the Liisa test. See `INTERACTION_MODEL.md` for the full landscape analysis and why we chose "select + instruct" over any form of editing.
