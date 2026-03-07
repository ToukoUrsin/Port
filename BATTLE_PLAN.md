# BATTLE PLAN

The moves we're actually doing. Ordered by when they happen.

---

## FRIDAY EVENING (5-9 PM)

**While engineers set up the codebase and start building the core pipeline:**

- [ ] **Interview Mårten Mickos** after his keynote. 90 seconds, phone recording. "What does PORT_ mean for student entrepreneurship?" This becomes our first published article once the pipeline works. (Samu, 15 min)

- [ ] **Find 2-3 Finnish Facebook group posts** about local events — rambling, unstructured, typical community group posts. Screenshot them. These become the "before" in the before/after demo. (Anyone, 20 min)

- [ ] **Identify 10-15 target municipalities** that have lost local news coverage. Bookmark their council minutes pages, event calendars, public notices. Download 1-2 PDFs per town so the data is ready when the pipeline is. (1 person, 1-2 hours)

- [ ] **Find and call someone in a small Finnish town** — a librarian, community center worker, small business owner. Record them answering: "What's something important that happened in your town recently that nobody outside knows about?" This becomes both pitch audio AND a demo input. (Samu, 30-60 min)

- [ ] **Draft the journalist email** — the AI-generated article format (#18). Don't send yet. Have it ready to go the moment the platform is live. (1 person, 30 min)

- [ ] **Draft the municipal cold email** — short, direct, ready to send Saturday morning. (Same person, 15 min)

- [ ] **Design reporter badges** — simple, printable. "PORT_2026 Community Reporter — [Name]." Print a batch. (Anyone, 30 min)

---

## FRIDAY NIGHT (9 PM - SLEEP)

**Engineers building core product in parallel:**

- [ ] Engineer A: Audio recording + Whisper transcription pipeline
- [ ] Engineer B: Contributor web app (mobile-friendly)
- [ ] Engineer C: Reader newspaper site template + deployment

---

## SATURDAY MORNING (wake up - noon)

**Engineers continue core product:**

- [ ] Engineer A: Article generation pipeline (Claude) + quality review layer
- [ ] Engineer B: Finish contributor app, connect to backend
- [ ] Engineer C: Deploy first town newspaper instance, set up domain/subdomain routing

**The moment the pipeline works end-to-end:**

- [ ] **Publish the Mickos interview** as the first article. Verify quality. This is the smoke test. (15 min)

- [ ] **Send the journalist email blast.** The email IS an AI-generated article about our own launch. Include the live platform link and a signup/waitlist form. Send to the full list. (1 hour)

- [ ] **Send municipal cold emails** to 5-10 small municipalities. (30 min)

- [ ] **Configure Finnish language** in all prompts. Ensure articles generate in Finnish. (0 extra hours — just prompt configuration)

---

## SATURDAY AFTERNOON (noon - 6 PM)

**Samu's reporting sprint (no engineering needed, just the working pipeline):**

- [ ] Cover PORT_ workshops, teams, venue. Aim for 8-12 team interviews. Give each contributor a reporter badge. Record, snap, generate, publish. (Samu, ongoing)

- [ ] **Recruit 3-5 non-team contributors.** Walk mentors, organizers, other participants through the app. "Try it — record 30 seconds about PORT_, hit submit." Badge them. (Samu, between interviews)

- [ ] **Approach PORT_ organizers.** "We built a newspaper for your event — want to share it in the Telegram?" (Samu, 5 min conversation)

**Engineering (post-core-product):**

- [ ] **Build the QR code landing page** — simple page where anyone can record a voice note and submit. This is the pitch's most powerful moment. Must be bulletproof. (1 engineer, 1-2 hours)

- [ ] **Build the signup/waitlist page** — simple form, counter, track conversions. Link from journalist email. (1 engineer, 1-2 hours)

- [ ] **Generate 10-15 real town newspapers** from the municipal data collected Friday night. Template site, real council minutes and public data, real articles. Quality-check each one. (1-2 engineers, 4-6 hours across afternoon/evening)

---

## SATURDAY EVENING (6 PM - midnight)

- [ ] **Share 3-5 town newspaper links** in those towns' Facebook groups. Simple post: "Someone built a free local newspaper for [town] — check it out." Track clicks with analytics. (Anyone, 30 min)

- [ ] **Collect journalist responses.** Screenshot every response. Note any journalist who tested the platform or expressed strong interest. (15 min)

- [ ] **Collect municipal responses** if any. (5 min)

- [ ] **Prep the council minutes PDF** for the live on-stage demo. Pick the most boring, impenetrable one. Test running it through the pipeline. Make sure the output article is clean and readable. (30 min)

- [ ] **Screenshot the API billing page.** Calculate exact cost per article. Write down the real number. (5 min)

- [ ] **Run the before/after.** Take the Facebook group screenshot from Friday. Run the same information through the pipeline. Save both for the pitch. (15 min)

- [ ] **Test the QR code flow end-to-end.** Someone who hasn't used the app tries it. Time it. Fix any friction. This MUST work flawlessly on stage. (30 min)

---

## SUNDAY MORNING (wake up - noon deadline)

- [ ] **Print the physical Sunday edition.** 1-2 pages. Best articles from the weekend — Mickos interview, team profiles, event coverage. Clean layout. Hand copies to judges before the pitch. (1 person, 1-2 hours)

- [ ] **Collect final numbers:**
  - Total articles published
  - Total non-team contributors
  - Total journalist emails sent / responses received / signups
  - Total municipalities served
  - Total real readers from Facebook shares (analytics)
  - Total API cost (exact euro amount)
  - Average time from raw input to published article

- [ ] **Build the pitch** around real numbers, not aspirations. Structure:
  1. Open: voice recording from news desert resident (emotional)
  2. Problem: the negative counterfactual — real decision nobody reported
  3. Product: how it works (30 seconds)
  4. Live demo: QR code — audience becomes users (the moment)
  5. Scale: 15 town newspapers, all live, in Finnish
  6. Validation: journalist responses, reader analytics, municipal interest
  7. Economics: API receipt, cost per article, cost per town
  8. Seoul framing: this is global, not just Finnish
  9. Close: return to the news desert resident — their town has a newspaper now

- [ ] **Submit by noon.**

---

## DURING THE PITCH

- [ ] Physical newspapers already in judges' hands
- [ ] QR code on screen — audience records voice notes, watches articles generate
- [ ] Council minutes PDF → article transformation live
- [ ] Dual screen: contributor app on left, reader site on right
- [ ] Stopwatch visible during the QR demo — time from start to published article
- [ ] Show API receipt with exact weekend cost
- [ ] Show journalist response quotes
- [ ] Show reader analytics from town Facebook shares
- [ ] Close with the voice from the news desert, then their town's newspaper

---

## THE 13 MOVES THAT MATTER

Everything above distilled:

| # | Move | Cost | Impact |
|---|---|---|---|
| 1 | Finnish language | 0h | Makes everything land for Finnish judges |
| 2 | Interview Mickos | 15min | Credibility from notable figure, first article |
| 3 | Voice from news desert | 1h | Emotional core of the pitch |
| 4 | 10-15 real town newspapers | 4-6h eng | The scale proof |
| 5 | Journalist email blast (as AI article) | 1h | Industry validation + demonstrates product |
| 6 | Municipal cold emails | 30min | Demand signal from buyers |
| 7 | QR code audience participation | 1-2h eng | The pitch moment that wins |
| 8 | Recruit non-team contributors + badges | Ongoing | "Users who aren't us" |
| 9 | Cover 8-12 PORT_ teams | Samu's Saturday | Event newspaper + competitor goodwill |
| 10 | Share in town Facebook groups | 30min | Real readers, real analytics |
| 11 | Physical Sunday edition | 1-2h | Judges hold the product before you speak |
| 12 | Before/after (Facebook post vs. article) | 15min | Visual proof, no explanation needed |
| 13 | API receipt on stage | 5min | Economics proven with a real number |

Total engineering cost of power moves: ~8-12 hours across team.
Total Samu cost: his entire Saturday reporting.
Total other cost: ~3-4 hours of emails, calls, prep.

Everything else from Waves 1-4 is bonus if time allows. These 13 are the ones that move the needle.
