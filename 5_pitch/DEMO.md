# How Do We Tell the Story?

The demo IS the product. Everything we build serves this 3-minute window.

---

## Pre-Demo Setup

1. Town instance live at a real URL (e.g. `port2026-news.vercel.app`)
2. 1-2 seed articles already published so the newspaper isn't empty
3. Samu's raw content captured hours before the pitch (interviews, photos, notes from PORT_)
4. 30-45 second sped-up video of Samu reporting, pre-edited
5. Pipeline tested end-to-end at least 3 times with real content
6. APIs warmed up 5 min before pitch
7. Mobile hotspot ready (don't trust venue WiFi)

---

## The 3-Minute Script

See slide directories below for visuals. The script:

**[0:00-0:15] Hook** — "213 counties. Zero journalists. When the newspaper closes, corruption rises 7%."

**[0:15-0:30] Insight** — "The knowledge isn't gone. It's locked in people's heads and scattered across Facebook posts."

**[0:30-0:45] Product** — "Record. Snap. AI writes. AI reviews — not just facts, but whose voice is missing. Publish."

**[0:45-1:15] Samu's video** — 30 sec sped-up: Samu interviews teams, takes photos, records notes.

**[1:15-1:45] Live generation** — Show raw inputs → hit Generate → article appears. "Five seconds."

**[1:45-2:05] Quality engine** — "Score: 64. The AI caught three things..." Point to missing voices flag. THIS is the demo's emotional peak.

**[2:05-2:20] Economics** — "$300K vs $5. A free service that scales."

**[2:20-2:40] The upgrade** — "The old newspaper had one editor. Our AI checks whose voices are missing."

**[2:40-3:00] Close + reveal** — "Check it — it's live right now." Judges open phones.

---

## What MUST Work

1. The generated article is real and good (judges will read it)
2. The quality review shows at least one meaningful representation flag
3. The newspaper site loads on judges' phones
4. The sped-up video of Samu is polished

## Nice-to-Have

- Live generation on stage (vs. pre-cached)
- Score improvement shown (64 → 81)
- Multiple articles on the site
- Working category navigation

## Fallbacks

| Breaks | Do instead |
|---|---|
| Claude API down | Pre-generated article, say "we generated this earlier" |
| Whisper down | Pre-transcribed text, skip that demo step |
| Website down | Screenshots. Less powerful but pitch still works. |
| Quality review generic | Have 2-3 pre-reviewed articles, pick the best one |
| WiFi dies | Mobile hotspot. If that dies too, screenshots. |

---

## The Retelling Test

What judges say to each other after:

> "Did you see the team that reported the hackathon live? Their AI caught that the article was missing international team voices. And it's live — I read it on my phone."

Three memories: (1) reported the hackathon, (2) AI caught missing voices, (3) it's live right now. Every build decision serves these three.

---

## Slide Directories

Each slide has a script (what's said) and visual (what's on screen):

- `00_hook/` — The problem
- `01_insight/` — The knowledge exists
- `02_product/` — How it works
- `03_demo/` — Samu's video + live generation
- `04_quality/` — The quality engine (demo peak)
- `05_economics/` — Cost comparison
- `06_close/` — Live reveal

---

## Open: Demo Town

Using PORT_2026 (the hackathon itself). Judges can verify every detail. Pre-seed 1-2 articles, Samu creates the live one.

## Open: Who Does What

| Role | Owns |
|---|---|
| Pipeline lead | AI prompts, Whisper + Claude integration, quality engine |
| Frontend lead | Contributor app (record, upload, review screen) |
| Reader + deploy lead | Newspaper site, Vercel, demo URL |
| Content + pitch lead | Demo content, video, pitch script, rehearsal |

If 3 people: frontend lead also handles reader site. Assign in first meeting.
