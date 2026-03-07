# Interface Thinking — What It Looks Like, How It Feels
# Date: 2026-03-07 UTC+3

The interface has to serve two opposite moods in one session: the casual confidence of sending a voice note, and the quiet pride of reading your name on a real newspaper article. The design challenge is the transition between them.

---

## What the Pros Use (and Why We're Not Building That)

### Arc XP Composer (Washington Post's CMS)

The tool Washington Post reporters write in. Composer is a rich-text editor — a large blank canvas where you add content blocks (text, images, embeds, data tables). Sidebar panels handle metadata: slug, SEO, scheduling, related stories, tags, revision history. A second tool (WebSked) handles editorial planning — what's assigned, what's in progress, what's ready.

Key features:
- **No structured content types.** Each story is freeform. The reporter builds it block by block.
- **Inline "power-ups"** — embed videos, data tables, interactive elements right in the text flow.
- **Comments appear alongside text** — click into highlighted text and the comment thread appears in the left margin. Composer 2.0 condensed these so they don't dominate.
- **Story details pane** — collapsible sidebar with metadata, featured media, related items, planning info.
- **Revision history** — every save creates a version you can compare and restore.

This is a tool for professionals who write 3-5 stories a day and need control over every detail. The complexity is justified by the job. A community contributor would drown in it.

### Ghost Editor

Ghost stripped the CMS editor down to its essence. A blank page with a title field and a body. Start typing. Formatting appears as a floating toolbar when you select text — bold, italic, heading, quote, link. Add cards (images, galleries, embeds, code blocks) by clicking a `+` button that appears between paragraphs. No sidebar by default. No metadata visible while writing. Clean, almost austere.

This is closer to our reading experience but still assumes the user is writing from scratch, which our contributor isn't.

### Medium Editor

The original "invisible toolbar" — formatting controls appear only when you select text. No visible chrome until you need it. The writing surface is just... the article. This is the aesthetic that made everyone say "the interface gets out of the way." The design communicates: the words matter, not the tool.

### iA Writer

The most opinionated: monospaced font, no formatting toolbar at all, just markdown. Focus Mode dims everything except the current sentence. The entire philosophy is that tools should disappear. Extreme, but the insight is right: attention should be on the content.

### Google Docs (Suggesting Mode)

The closest model for our coaching experience. When an editor reviews your article:
- Their suggested changes appear in green text with strikethrough on the original
- Comment cards appear in the right margin, connected to specific text by a dotted line
- You can accept/reject each suggestion with check/x buttons
- You can reply to start a discussion

The spatial relationship matters: the suggestion lives *next to the text it's about*. Not in a separate panel below. Not on a different screen. Right there, in context.

---

## The Insight: Three Moods, One Flow

Our interface transitions through three distinct moods:

### Mood 1: CAPTURE — "I'm telling a friend what happened"

**Inspiration:** WhatsApp voice note UX.

WhatsApp nailed this: hold button, talk, release. 7 billion voice messages a day. The recording interface is a single button with a waveform. No settings, no quality options, no file management. Just talk.

Our capture screen should feel this casual:
- A big microphone button. Tap to record. Tap to stop. Waveform shows it's listening.
- A camera button. Tap to snap. Photos appear as thumbnails below.
- A text area if they want to type notes. But it's clearly optional — not a form to fill out.
- A "Done" or "Create article" button at the bottom.

**What it should NOT feel like:**
- A form ("Title: ___, Category: ___, Description: ___")
- A CMS ("Select content type, add metadata")
- An upload interface ("Drag files here")

The whole screen should feel like the bottom of a chat app. Input area at the bottom, your content stacking above it as you add more.

### Mood 2: TRANSFORMATION — "Wait, it's writing my article"

**Inspiration:** ChatGPT's streaming response, Otter.ai's live transcription.

The 22-second wait is where anticipation lives. Status messages alone ("Transcribing...") are boring. The contributor should feel something happening — not a loading spinner but a transformation in progress.

Options (pick one for hackathon):

**Option A: Stage progress (simplest).** Three steps displayed as a horizontal or vertical progression. Each step lights up and gets a checkmark when done. Status text changes: "Listening to your recording..." → "Writing your article..." → "Checking quality..." Clean, clear, fast to build.

**Option B: Transcript reveal.** As the audio transcribes, show the text appearing word by word. Then the transcript fades/collapses and the article starts forming. The contributor sees their messy words become polished text. This is the pride moment in motion. Harder to build with extended thinking (article appears all at once, not streamed), but the transcript part can stream.

**For the hackathon: Option A.** Option B is beautiful but requires non-trivial frontend work with the streaming architecture.

### Mood 3: EDITORIAL — "This is my article, and here's how to make it better"

**Inspiration:** Ghost's clean reading surface + Google Docs' comment sidebar.

This is the screen where the contributor spends the most time. It needs to do three things simultaneously:

1. **Show the article as it will look when published** — serif font, proper headline, byline ("By Liisa M."), photos placed. The contributor should feel like they're reading a newspaper, not editing a document.

2. **Show the coaching alongside it** — not below, not on a separate screen, but adjacent. Like a mentor sitting next to you pointing at the page.

3. **Make refinement effortless** — a way to respond (voice or text) without leaving this view.

---

## The Editorial Screen: The Core Interface

This is where the product lives or dies. Here's what it looks like:

```
+------------------------------------------------------------------+
|  [< Back]                                    [GREEN] [Publish ->] |
+------------------------------------------------------------------+
|                                                                    |
|  ARTICLE (left/main, ~65%)        |  COACHING (right, ~35%)       |
|                                    |                               |
|  Council Approves Budget 5-2       |  "The Korhonen quote really   |
|  Amid School Funding Protests      |   captures the tension.       |
|                                    |   Two things that would       |
|  By Liisa M.  •  6 Mar 2026       |   make it even stronger:"     |
|  Council  •  Kirkkonummi           |                               |
|                                    |  1. Do you remember what      |
|  The Kirkkonummi town council      |     specific programs          |
|  voted 5-2 on Tuesday evening      |     would be cut?             |
|  to approve the 2026 municipal     |                               |
|  budget, drawing sharp criticism   |  2. Did any parents speak     |
|  over proposed cuts to school      |     during public comment?    |
|  funding.                          |                               |
|                                    +-------------------------------+
|  "Our children deserve better      |                               |
|  than this," said council member   |  [Mic] Record a response      |
|  Korhonen, one of two dissenting   |                               |
|  votes alongside council member    |  [Or type here...]            |
|  Virtanen.                         |                               |
|                                    |  [Update article]             |
|  [photo: packed council gallery]   |                               |
|                                    +-------------------------------+
|  An estimated 40 residents packed  |                               |
|  the council gallery, many of them |  Round 1 of 1                 |
|  parents concerned about the       |  [View previous version]      |
|  impact on local schools...        |                               |
|                                    |                               |
+------------------------------------------------------------------+
```

### The Article Side (Left)

This IS the published article. Same fonts, same layout, same photo placement. The contributor reads what their neighbors will read. No editor chrome, no formatting controls, no blocks or widgets. Just the article.

- **Headline** in `--font-serif`, large, bold — newspaper headline feel.
- **Byline** with their name, prominently displayed. Date. Category badge. Town name.
- **Body** in serif, comfortable reading line length (`--size-content`, ~65ch).
- **Photos** placed inline where the AI put them, with captions.
- **Quotes** formatted as block quotes — visually distinct, attributed.

This side does NOT look like a CMS. It looks like a newspaper. That's the pride moment: "this is a real article, and it's mine."

### The Coaching Side (Right)

This is the mentor sitting next to you. It has three sections:

**1. Celebration + Questions (top)**

The coaching text. Always starts with what's good ("The Korhonen quote really captures the tension"), then asks 1-2 questions. The tone is warm — a conversation, not a report card.

For RED gate, this section is more prominent. The fix needed is framed warmly but clearly: "This is a strong story. To publish the claim about Virtanen, we need to say who told you — that makes it airtight." Specific fix options below.

**2. Response Input (middle)**

A microphone button and a text area. The contributor can:
- Tap the mic and record a voice response ("Yeah, one mother named Sari spoke up...")
- Type a quick note ("about 50 people, mostly families")
- Both

Then hit "Update article." The article regenerates (showing the transformation status briefly) and the new version replaces the left side. The coaching updates too.

This input should feel as casual as the capture screen. Not a text editor. Not a form. A quick reply.

**3. Version info (bottom)**

"Round 1 of 1" with a link to view the previous version. Not prominent — just there for safety. If they've done 2 rounds, they can tap back to compare.

### The Gate

The gate (GREEN / YELLOW / RED) appears in the top bar, small and clear:

- **GREEN**: a small green dot or badge. Publish button is active and primary-colored.
- **YELLOW**: amber dot. Publish button is active. A subtle note: "Optional improvements suggested."
- **RED**: red dot. Publish button is grayed/inactive. The coaching section explains why and how to fix it. An "Appeal" link at the bottom.

The gate is NOT a traffic light graphic. Not a score. Not a grade. It's a status indicator — like the lock icon in a browser's address bar. Present but not the focus.

### Mobile Layout

On mobile (the primary device), the two-column layout stacks:

```
+----------------------------------+
| [< Back]      [GREEN] [Publish] |
+----------------------------------+
|                                  |
|  Council Approves Budget 5-2     |
|  Amid School Funding Protests    |
|                                  |
|  By Liisa M.  •  6 Mar 2026     |
|                                  |
|  The Kirkkonummi town council    |
|  voted 5-2 on Tuesday evening    |
|  to approve the 2026 municipal   |
|  budget...                       |
|                                  |
|  [photo]                         |
|                                  |
|  ...rest of article...           |
|                                  |
+----------------------------------+
|                                  |
|  "The Korhonen quote really      |
|   captures the tension."         |
|                                  |
|  1. Do you remember what         |
|     specific programs...?        |
|                                  |
|  2. Did any parents speak...?    |
|                                  |
|  [Mic] Record a response         |
|  [Or type here...]               |
|  [Update article]                |
|                                  |
+----------------------------------+
```

Article on top, coaching below. The contributor scrolls down past their article to find the coaching. The coaching section has a subtle visual break — different background (`--color-bg-secondary`), maybe a gentle top border — so it feels like a separate thing. The mentor's space, not the article's space.

The refinement input sticks to the bottom or sits right below the coaching text.

---

## The Capture Screen

```
+----------------------------------+
| [< Back]         New Story       |
+----------------------------------+
|                                  |
|  (empty state: illustration      |
|   or simple text)                |
|                                  |
|  "What happened?"                |
|                                  |
+----------------------------------+
|                                  |
|  [thumbnail] [thumbnail]         |
|                                  |
|  [notes text if any...]          |
|                                  |
|  [waveform of recording]  1:32   |
|                                  |
+----------------------------------+
|                                  |
|  [Mic]    [Camera]    [Notes]    |
|                                  |
|  [       Create Article        ] |
|                                  |
+----------------------------------+
```

Three input methods along the bottom — mic, camera, notes — like a chat app's attachment bar. As the contributor adds content, it stacks above: voice recording as a waveform strip, photos as thumbnails, notes as text. The "Create Article" button at the bottom activates once there's at least one input.

The screen says "What happened?" not "Submit a story" or "Create new article." It's a question, not an instruction.

**Recording:**
- Tap the mic — big pulsing recording indicator appears. Waveform shows live audio levels. Timer counts up.
- Tap again to stop. The recording appears as a playable waveform strip.
- They can record multiple clips. Each stacks above.
- Delete a clip by swiping or tapping X.

**Photos:**
- Tap camera — native camera opens (or photo picker).
- Photos appear as a horizontal strip of thumbnails.
- Tap a thumbnail to preview full size. X to remove.

**Notes:**
- Tap notes — text input expands. Plain text, no formatting.
- Can be terse: "budget vote, school cuts, heated" — that's fine.

---

## The Reader Side (Published Article)

A different surface entirely. This is the town's newspaper. It should look like a clean, modern news site — not an app, not a platform.

```
+------------------------------------------------------------------+
|  KIRKKONUMMI                                           [Search]   |
|  Community Newspaper                                              |
+------------------------------------------------------------------+
|  [Council] [Schools] [Business] [Events] [Sports] [Community]    |
+------------------------------------------------------------------+
|                                                                    |
|  LEAD STORY                                                        |
|  +--------------------------------------------------------------+ |
|  |  [large photo]                                                | |
|  |                                                               | |
|  |  Council Approves Budget 5-2                                  | |
|  |  Amid School Funding Protests                                 | |
|  |                                                               | |
|  |  The Kirkkonummi town council voted 5-2 on Tuesday evening... | |
|  |                                                               | |
|  |  By Liisa M.  •  6 Mar 2026  •  Council                      | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  +-------------------+  +-------------------+  +---------------+   |
|  | Leipomo Ainola     |  | Masala Playground  |  | PORT 2026    |   |
|  | Opens on           |  | Approved for       |  | Hackathon    |   |
|  | Kauppalankatu      |  | Suvimaki Park      |  | at Aalto     |   |
|  |                    |  |                    |  |              |   |
|  | By Matias R.       |  | By Antti K.        |  | By Samu T.   |   |
|  +-------------------+  +-------------------+  +---------------+   |
|                                                                    |
+------------------------------------------------------------------+
```

**Design references:**
- The Guardian's clean layout (strong typography hierarchy, clear categories)
- Finnish local newspaper sites like Kirkkonummen Sanomat (familiar to the community)
- Ghost's default theme (Casper) — simple, content-first

No algorithmic feed. Reverse chronological within categories. Lead story is the most recent or editorially significant (for hackathon: just the most recent). Category tabs filter. Search works.

Each article page is full-width reading with the serif font, generous line height, properly placed photos. At the bottom: "By [Name]" with a small contributor profile link. "More from [Town]" at the end.

---

## Where to Take Inspiration (Summary)

| What | Inspiration | Why |
|---|---|---|
| **Capture screen** | WhatsApp voice notes, Instagram Stories capture | Casual, fast, one-thumb operation, no form fields |
| **Processing wait** | ChatGPT response streaming, Otter.ai live transcription | Something visible is happening — not a dead spinner |
| **Article display** | Ghost published page, Medium article view, The Guardian | Clean newspaper aesthetic, serif body, generous whitespace |
| **Coaching sidebar** | Google Docs suggesting mode, Notion AI inline comments | Feedback appears next to what it's about, accept/dismiss pattern |
| **Refinement input** | WhatsApp reply, iMessage voice memo | Quick voice or text response, not a full editor |
| **Gate status** | Browser SSL lock icon, GitHub PR status checks | Present but not dominating, clear meaning at a glance |
| **Reader newspaper** | The Guardian, Ghost Casper theme, Finnish local paper sites | Content-first, reverse chronological, strong headline hierarchy |
| **Version comparison** | GitHub PR diff, Google Docs version history | "What changed" without making it feel technical |

### What we are NOT

| Tool | Why not |
|---|---|
| Arc XP Composer | Too complex. Our contributor isn't writing — they're reviewing what the AI wrote. No block editor, no metadata panel, no SEO fields. |
| WordPress editor | Same problem. Too many controls for someone who isn't composing from scratch. |
| Notion | The block paradigm assumes you're building a document. We're showing a finished article. |
| Any traditional CMS | The contributor never sees "the CMS." They see their article and their mentor's feedback. Period. |

---

## The Key Design Decisions

**1. The article is read-only to the contributor.**

They never directly edit the text. They talk to the AI about what should change, and the AI rewrites. This is the core design decision from THE_CONTRIBUTOR_CYCLE.md — direct text editing is the intimidation barrier. The contributor directs; the AI executes.

This means: no cursor in the article. No editable fields. No rich-text toolbar. The article is a preview — what you see is what gets published. The only way to change it is through the refinement input (voice or text).

**2. The coaching is a conversation, not a checklist.**

Not "Issues found: 3" with a list of bullet points. It reads like a person talking: "The Korhonen quote really captures the tension. Two things that would make it even stronger..." Warm, specific, referencing actual content from the article.

**3. The publish button is always visible.**

From the moment the first draft appears, the contributor can publish (unless RED). The coaching and refinement are optional improvements, never mandatory steps. The button's presence says: "this is publishable right now. You choose whether to make it better."

**4. Mobile-first but the demo is on a projector.**

The primary use is mobile (contributor in the field). But the hackathon demo is projected on a big screen. The desktop layout (article left, coaching right) is the demo layout. The mobile layout (article top, coaching bottom) is the real-world layout. Both need to work well.

**5. The newspaper reader is a separate surface.**

Contributors use the app. Readers visit the newspaper website. These are different products with different aesthetics. The app is a tool (functional, efficient). The newspaper is a publication (editorial, authoritative). Don't try to make one interface do both jobs.
