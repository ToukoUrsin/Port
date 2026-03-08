# SOURCE DIGEST — All Materials for Pitchdeck
# Date: 2026-03-08 UTC+3

Everything we have, summarized by source, so the pitchdeck can be built from one file.

---

## 1. THE HACKATHON

**Source:** `the_hackathon/our_challenge.txt`, `the_hackathon/challenge_criteria.txt`

**Challenge:** "Next Generation of Culture and Media" — Create innovative platforms, tools, or narratives that shape how people create, consume, and engage with culture and media in more responsible, inclusive, and impactful ways. Consider representation, ethical storytelling, digital equity, sustainability of media systems, emerging technologies, and audience empowerment.

**Prize:** Winner represents Aalto at Global Student Startup Competition in Seoul.

**Judging:**
- Technical feasibility: 10 pts
- Market potential & scalability: 10 pts
- Team Dynamics: 5 pts
- Risk + Evaluation: 5 pts

**Submission deadline:** Sunday 12:00 PM. Finals at 1:15 PM. 3-minute pitch.

---

## 2. THE IDEA — LOCAL NEWS PLATFORM

**Source:** `VISION.md`, `0_why/LOCAL_NEWS_PLATFORM.md`

**One-liner:** Local news is dead. We give communities a phone, AI, and a publish button — and the newspaper comes back, better than the one they lost.

**The problem:**
- 213 US counties have zero journalists. 50M Americans in news deserts.
- 136 newspapers closed last year — 2+ per week. 3,200+ closed since 2004.
- When local news dies: corruption +6.9%, municipal borrowing costs +5-11 basis points ($650K per bond), toxic emissions +10%, voter turnout drops, civic engagement drops ~30%.
- Global: EU rural areas, UK (320+ local titles closed), Latin America (65%+ desert territory), India, Africa.

**The insight:** The information isn't gone. People were at the council meeting. They saw the business open. The knowledge is locked in their heads and scattered across Facebook posts that disappear. Nobody turns it into stories people actually read.

**How it works:**
1. **Record** — voice memo, 60-120 seconds, like a WhatsApp voice note
2. **Snap** — photos from the event
3. **Generate** — AI writes a proper news article from raw input (~15 seconds)
4. **Review** — AI checks facts, flags extreme claims, asks "whose voice is missing?"
5. **Publish** — one tap, live on the town's digital newspaper

**The economics that change everything:**

| | Traditional Paper | Our Platform |
|---|---|---|
| Cost per town | $200-500K/year | ~$50-200/year |
| Cost per article | Journalist salary | $0.02-0.05 (API costs) |
| Revenue needed | $200K+ | Almost nothing |

Even $10/year in local ads makes a town profitable at <$5/year cost to serve.

**Revenue:** Local business ads ($5/mo per shop), municipal subscriptions ($50-200/mo for official communications), premium contributors ($5-10/mo), aggregate programmatic ads at scale.

**Scaling math:**
- 1,000 towns × $100/mo = $1.2M ARR
- 10,000 towns × $150/mo = $18M ARR
- Costs scale sub-linearly

**Why now:** (1) LLM writing quality crossed the threshold, (2) transcription near-free at $0.006/min, (3) news desert crisis accelerating, (4) Facebook deprioritized news, (5) people already share local info for free.

**Phases:**
1. English-speaking news deserts (US rural, UK, Australia)
2. Any language — pipeline works in 99 languages
3. Beyond geography — campuses, companies, communities
4. The data layer — community-level patterns at civilization scale

**Validation:** Lokal (YC S19) proved local news works as a platform business in India's small towns. We go further — AI handles the editorial layer entirely.

**Risks (honest):**
- Misinformation — AI review catches most, but not everything. Still strictly better than Facebook groups with zero review.
- Cold start — seed towns with AI-generated content from public records.
- Contributor motivation — people already share for free on Facebook/WhatsApp. We channel existing energy.
- AI hallucination — AI generates FROM contributor input, doesn't invent. Review checks output against source.

---

## 3. THE DEEP SYNTHESIS — WHY THIS IS MORE THAN LOCAL NEWS

**Source:** `1_what/DEEP_SYNTHESIS.md`

**Core structural insight:** The Local News Platform and the Cultural Preflight quality engine are not competing products — they are the SAME product at different levels. The quality engine IS the quality layer inside the news platform. The platform gives the engine distribution, data, and a reason to exist.

```
LNP without quality engine = citizen journalism (Patch, but cheaper)
Quality engine without platform = Grammarly for bias (vitamin, no distribution)
LNP WITH quality engine = SOMETHING NEW:
  -> Community journalism structurally BETTER than what it replaced
  -> Every story checked for representation, ethics, cultural sensitivity
  -> Contributors LEARN to tell better stories through AI coaching
  -> The town gets the newspaper it SHOULD have had
```

**The upgrade narrative:** The old newspaper had problems too — one editor, one worldview, commercial pressures, marginalized communities underreported. We don't just fill the void. We fill it with something that COULDN'T have existed before. AI quality review for ethical storytelling and representation wasn't possible in 2020.

**6-dimension quality engine embedded in review:**
1. PERSPECTIVES — what stakeholder views are covered/missing?
2. REPRESENTATION — whose voices present/absent? Speaking ABOUT or WITH?
3. ETHICAL FRAMING — told with respect? Power dynamics? Consent?
4. EVIDENCE — factual accuracy, sources, currency
5. CULTURAL CONTEXT — sensitivity, attribution, appropriation
6. MANIPULATION — dark patterns, misleading framing

**Challenge fit score: 28/30** (up from 26 for plain LNP, up from 24 for quality engine alone).

---

## 4. THE CONTRIBUTOR CYCLE — THE HUMAN EXPERIENCE

**Source:** `1_what/article_engine/spec/THE_CONTRIBUTOR_CYCLE.md`

**Core insight:** The barrier isn't skill — it's intimidation. "News writing" feels professional, not natural. 63% of smartphone users have never sent a voice note. The product should feel like "tell your neighbors what happened," not "write a news article." The journalism is what the AI adds, not what the human does.

**Seven phases:**
1. **WITNESS** — something happens. Energy: "you won't believe what just happened"
2. **CAPTURE** — record like telling a friend. 60-120s voice memo + photos. Feels like WhatsApp.
3. **DRAFT** — AI transforms raw input into article in ~15 seconds. First pride moment: "it made my words sound professional."
4. **REFINE** — AI asks 1-2 coaching questions (additive, never critical). Contributor directs via voice/text, AI rewrites. Second pride moment: "I shaped it into what I wanted." 0-2 rounds typical.
5. **PUBLISH** — one tap. Live on town newspaper. "By [Name]."
6. **IMPACT** — "83 people in Kirkkonummi read your article." Ultimate moment: neighbor says "I read your article."
7. **RETURN** — barrier lower next time. AI's questions trained instincts without them realizing.

**The flywheel is a PRIDE cycle, not a content cycle:**
Submit → article is good → contributor is proud → submits again → better input (learned from AI's past questions) → better article → more pride → community reads → more people want to contribute → cycle accelerates.

**What the AI replaces:** Not journalists — the editorial INFRASTRUCTURE that made journalism possible: copy editors, assignment editors, the teaching function, fact-checking, the second pair of eyes. The 270,000+ lost jobs took this infrastructure with them.

**Five refinement modes:** correction, direction, addition, removal, tone — all via natural language (voice or text), not direct text editing.

**Critical design rules:** additive never critical, celebrate first then suggest, max 2 coaching questions per round, contributor always has the last word, show the improvement.

---

## 5. THE MISSION — WHAT THE ENGINE IS REALLY FOR

**Source:** `1_what/article_engine/spec/MISSION.md`

**Three feelings everything serves:**
- The contributor feels **proud**
- The reader feels **interested**
- The community feels **represented**

**The AI as mentor, not machine:** The best editor you've ever worked with — someone who genuinely wants YOUR article to be great. Asks questions like a mentor: "The council voted 5-2 but you didn't mention who dissented. Do you know? That detail makes this twice as interesting."

**Design specs flowing from mission:**
- AI asks, never demands
- AI celebrates what's good before suggesting
- Bar is low to start, high to reach
- Quality is visible but not shaming (58/100 is publishable — better than no coverage)
- Contributor's name, always. AI is invisible.
- Local pride is the metric. Not engagement, clicks, or time-on-site.

---

## 6. USER STORIES — CONCRETE SCENARIOS

**Source:** `1_what/article_engine/spec/USER_STORIES.md`

Seven testable scenarios showing exactly how the system works:

| Story | Who | What | Gate |
|---|---|---|---|
| 1. Liisa | Retired teacher, first-time | Council meeting, voice + photos, one refinement round | GREEN |
| 2. Matias | Repeat contributor | Bakery opening, photo-heavy, no refinement, 2 min total | GREEN |
| 3. Jenna | Student | Unattributed restaurant accusation → RED gate → fixes it → YELLOW | RED→YELLOW |
| 4. Samu | The demo | Hackathon live coverage, notes + voice, fast pipeline | GREEN |
| 5. Antti | IT guy | Notes-only submission, no audio/photos, under 1 min | GREEN |
| 6. Tero | Angry resident | One-sided complaint about neighbors → mirror approach → either appeal or adds perspective | RED→GREEN |
| 7. Elina | Politically active | Dog-whistle/framed safety concerns → YELLOW (publishable but coached) | YELLOW |

**Story 6 is the anti-censorship showcase:** System never says "racist" or "biased." Shows what's present and what's absent. Same gate logic as Story 3 (unattributed accusation). Mirror, not editor. If Tero talks to his neighbor Fatima and adds her voice, the article becomes genuinely better journalism — and Fatima has her own voice in her town's newspaper.

---

## 7. COMPETITIVE LANDSCAPE

**Source:** `2_who/LANDSCAPE.md`

**The whitespace nobody occupies:** Citizen-contributed raw inputs (audio, photos, notes) + AI generation + quality review = original local journalism. Nobody does this.

**Four buckets everything else falls into:**

| Bucket | Examples | What's missing |
|---|---|---|
| Infrastructure for existing newsrooms | Newspack, AJP, Report Local | Doesn't create new coverage |
| AI aggregation | Patch (30K communities), Civic Sunlight, Hamlet | Summarizes existing data, no original reporting |
| AI tools for professional journalists | Axios+OpenAI, Satchel AI | Helps existing reporters, not citizens |
| Community engagement without AI | City Bureau Documenters, Hearken | No AI pipeline |

**Key competitors:**
- **Patch** — 30K communities, 25M monthly uniques, AI newsletters. But aggregation only, frequent geographic errors, low quality bar.
- **Civic Sunlight** — AI council meeting summaries. Had hallucination crises. Now needs human review.
- **Lokal (YC S19)** — 40M+ downloads India. Pivoted to classifieds as revenue engine. News is engagement hook.
- **City Bureau Documenters** — Train citizens ($16-20/hr) to document public meetings. 4,000 trained, 25 communities. Most relevant non-AI prior art.

**Social platforms failing at news:** Facebook Groups (no standards, Meta ended fact-checking), Nextdoor (21M WAU declining 5% YoY, aggregation only), Reddit (dead in small towns), WhatsApp (90%+ debunked content in India originates there).

**Strategic insights:**
1. Quality is the moat (every AI player that skipped it failed)
2. News alone doesn't pay (need ads/classifieds/municipal revenue)
3. Local content converts at extraordinary rates (24.5% paid conversion on Substack local vs 3% national)
4. Citizen-contribution model validated (City Bureau, 4,000 trained)
5. AI companies investing in local news (OpenAI funds Axios Local, Knight $3M grants)
6. Philanthropic ecosystem is real ($243M at AJP)

---

## 8. MARKET & WHO PAYS

**Source:** `2_who/MARKET.md`

**Users:** Contributors (anyone in community) and Readers (everyone in community).

**Who pays:**
1. Local businesses — $5/mo per shop. Most towns have 10-50 small businesses.
2. Municipalities — $50-200/mo for official communications (replaces $2K/yr on notice boards/mailing).
3. Premium contributors — $5-10/mo for analytics, scheduling, multi-town.
4. Aggregate ads at 1,000+ towns.

**Scaling:** 1,000 towns × $100/mo = $1.2M ARR. 10,000 towns × $150/mo = $18M ARR.

---

## 9. CHALLENGE CORE ANALYSIS

**Source:** `10_wave2_preventive/CHALLENGE_CORE_NAVIGATION.md`

**The challenge's TRUE core:** Agency redistribution in the culture/media ecosystem. WHO has agency — to create, to be represented, to access, to sustain, to shape — in the culture/media system.

**Six keywords compress to three generators:**
- VOICE (representation + ethical storytelling) — who speaks, how, about whom
- POWER (digital equity + audience empowerment) — who has agency
- STRUCTURE (sustainability + emerging tech) — how the system works

**All three compress to one:** The distribution of agency in the culture/media ecosystem.

**How our product maps:**
- CREATE: contributors create news + culture stories → strong
- CONSUME: readers get a clean local newspaper → strong
- ENGAGE: coverage map shows gaps, missing voice prompts turn readers into contributors → addressed
- CULTURE: community stories, oral history, traditions → addressed via expanded content types
- MEDIA: core product → deep

**B = 0.90+ with the synthesis** (LNP + quality engine). Without synthesis: B = 0.55.

---

## 10. CHALLENGE LANDSCAPE — 18-CELL PRODUCT SPACE

**Source:** `10_wave2_preventive/CHALLENGE_LANDSCAPE.md`

**The product space is 3×2×3 = 18 cells:** verb (create/consume/engage) × domain (culture/media) × mechanism (visibility/access/structure).

**VISIBILITY is the most open mechanism across ALL cells** (average 0.88 openness). Our product uses visibility — making what's missing visible.

**Our product hits the right mechanism.** The synthesis closes the domain and verb gaps.

---

## 11. THE PREVENTIVE TOOLING THEORY

**Source:** `10_wave2_preventive/CORE_OF_PREVENTIVE_TOOLING.md`, `PREVENTIVE_ATTACK_ON_SOURCE.md`

**Root generator:** `cost(generation) → 0` while `cost(verification) → constant`. LLMs collapsed semantic verification costs, making preflight quality checks possible.

**Context Preflight Infrastructure:** Low-cost automated verification layer running during content creation, emitting both human guidance (coaching) and machine-readable quality receipts.

**The stack embedded in our product:**
| Layer | In our product |
|---|---|
| Perspectival | "What viewpoints present/missing?" → coaching |
| Stakeholder | "Who affected but not represented?" → missing voice prompts |
| Evidential | "Which claims weakly sourced?" → fact-checking |
| Factual/claim-risk | "Which claims need verification?" → RED/YELLOW gate |
| Logical | "Where does argument overreach?" → review |
| Framing/manipulation | "How does language distort?" → ethical framing check |

**This is the theoretical backbone** — the local news platform is the most legible deployment of context preflight infrastructure, because every article goes through it by default.

---

## 12. THE DREAM — THE BIGGEST VISION

**Source:** `10_wave2_preventive/THE_DREAM.md`

**One-liner:** Creating content is free. Checking if it's good used to cost $100. We made it cost 10 cents.

**The historical pattern:** Every cost-ratio crisis resolved the same way. Currency got watermarks. Food got HACCP. Email got spam filters. Websites got HTTPS. 16 domains, 150+ years. Content is the last major domain where this hasn't happened — because content quality was semantic. LLMs are the watermark moment for content.

**Why nothing else works:**
- "Fix the algorithms" — requires platform cooperation. They won't.
- "Educate consumers" — takes a generation.
- "More fact-checkers" — reactive, O(n) review vs exponential content.
- "Regulate platforms" — creates demand for quality signals without supply. We're the supply.

**Virality mechanics (for reference, not for local news pitch):**
- Weapon loop: "Look how blind THEY are"
- Mirror loop: "Look what I discovered about MYSELF"
- Competition loop: "I scored 82. What did YOU get?"

**Long-term vision:** Quality-weighted search, perspective weather reports, institutional quality benchmarking, cross-cultural perspective mapping, AI content quality loop.

---

## 13. THE DEMO SCRIPT

**Source:** `5_pitch/DEMO.md`, `1_what/DEEP_SYNTHESIS.md`

**3-minute structure:**

| Time | Beat | Key line |
|---|---|---|
| 0:00-0:15 | Hook | "213 counties. Zero journalists. Corruption rises 7%." |
| 0:15-0:30 | Insight | "Knowledge isn't gone. Locked in heads. Facebook posts disappear." |
| 0:30-0:45 | Product | "Record. Snap. AI writes. AI reviews — whose voice is missing? Publish." |
| 0:45-1:15 | Samu's video | 30s sped-up: interviews, photos, recording at PORT_ |
| 1:15-1:45 | Live generation | Raw inputs → Generate → article appears |
| 1:45-2:05 | Quality engine | "Score: 64. Missing: judge perspective. Samu grabs a judge. 64→81." |
| 2:05-2:20 | Economics | "$300K vs $5. Free service that scales." |
| 2:20-2:40 | The upgrade | "Old newspaper had one editor. Our AI checks whose voices are missing." |
| 2:40-3:00 | Close + reveal | "Check it — it's live right now." Judges open phones. |

**What MUST work:** (1) generated article is real and good, (2) quality review shows meaningful representation flag, (3) newspaper site loads on judges' phones, (4) sped-up video is polished.

**Retelling test:** "Did you see the team that reported the hackathon live? Their AI caught that the article was missing international team voices. And it's live — I read it on my phone."

**Fallbacks:** Pre-generated article if API down, pre-transcribed text if Whisper down, screenshots if website down, mobile hotspot if WiFi dies.

---

## 14. CHALLENGE FIT — KEYWORD-BY-KEYWORD

| Challenge Keyword | How We Hit It |
|---|---|
| **Create** | Anyone can create local news — phone + voice = enough. No journalism degree. |
| **Consume** | Clean, accessible local newspaper for every community. No paywall. |
| **Engage** | Contributors ARE the community. Coverage map shows gaps. Missing voice prompts turn readers into contributors. |
| **Responsible** | 6-dimension AI quality review before publishing. Mirror approach, not censorship. |
| **Inclusive** | No expensive equipment. Voice-first (natural for everyone). Works in 99 languages. |
| **Impactful** | Directly addresses news deserts — measurable community impact (corruption, civic engagement). |
| **Representation** | AI asks "whose voice is missing?" for every article. Speaking WITH communities, not ABOUT them. |
| **Ethical storytelling** | Coaching layer checks framing, power dynamics, consent. Story 6 (Tero) is the showcase. |
| **Digital equity** | Brings digital news infrastructure to communities that have none. Near-zero cost. |
| **Sustainability** | Near-zero cost model makes local news sustainable for the first time ever. |
| **Emerging technologies** | LLMs for generation + review, STT for transcription, the quality engine is only possible now. |
| **Audience empowerment** | Transforms passive consumers into active creators. Community teaches the AI what matters here. |

---

## 15. KEY NUMBERS FOR SLIDES

- **213** US counties with zero journalists
- **50M** Americans in news deserts
- **3,200+** newspapers closed since 2004
- **136** closing per year (2+ per week)
- **6.9%** increase in corruption when local paper closes
- **$650K** extra per municipal bond issue without local press oversight
- **10%** increase in toxic emissions
- **$300K** minimum annual cost for traditional small-town paper
- **$5** our annual cost per town
- **$0.02-0.05** per article (AI costs)
- **$0.006/min** transcription cost
- **5 minutes** from event to published story
- **15 seconds** generation time
- **24.5%** paid conversion rate for local Substack vs 3% national
- **4,000** citizens trained by City Bureau's Documenters (validates model)
- **40M+** Lokal downloads in India (validates local news platform business)
- **$243M** raised by American Journalism Project (philanthropic ecosystem is real)
- **99** languages supported by transcription pipeline

---

## SOURCE FILE INDEX

| File | What it contains | Priority for pitchdeck |
|---|---|---|
| `VISION.md` | Product vision, clean overview | HIGH — pitch narrative |
| `0_why/LOCAL_NEWS_PLATFORM.md` | Full idea with economics, risks, pitch script | HIGH — everything |
| `1_what/DEEP_SYNTHESIS.md` | LNP + quality engine synthesis, enhanced demo | HIGH — the upgrade angle |
| `1_what/article_engine/spec/MISSION.md` | Three feelings the engine serves | HIGH — emotional core |
| `1_what/article_engine/spec/THE_CONTRIBUTOR_CYCLE.md` | Seven-phase human experience | MEDIUM — depth for Q&A |
| `1_what/article_engine/spec/USER_STORIES.md` | Seven testable scenarios | MEDIUM — Story 6 for pitch |
| `2_who/LANDSCAPE.md` | Competitive analysis, whitespace, prior art | HIGH — market positioning |
| `2_who/MARKET.md` | Revenue model, who pays | HIGH — economics slide |
| `5_pitch/DEMO.md` | 3-minute script, fallbacks | HIGH — pitch execution |
| `10_wave2_preventive/CHALLENGE_CORE_NAVIGATION.md` | Challenge axis analysis | LOW — internal strategy |
| `10_wave2_preventive/CHALLENGE_LANDSCAPE.md` | 18-cell product space | LOW — internal strategy |
| `10_wave2_preventive/CORE_OF_PREVENTIVE_TOOLING.md` | Theoretical backbone | LOW — internal |
| `10_wave2_preventive/PREVENTIVE_ATTACK_ON_SOURCE.md` | Why preflight matters | LOW — internal |
| `10_wave2_preventive/THE_DREAM.md` | Biggest vision, historical pattern | MEDIUM — one slide max |
| `the_hackathon/our_challenge.txt` | Challenge statement verbatim | HIGH — must address |
| `the_hackathon/challenge_criteria.txt` | Judging rubric | HIGH — optimize for this |
