# LOCAL NEWS PLATFORM
# Date: 2026-03-07 UTC+3

---

## The Idea

Local news is dead. 213 US counties have zero journalists. But every town has people who know what's happening — they just can't write articles. We give them a phone, AI, and a publish button.

Record an interview. Snap a photo. Jot down what happened. AI turns it into a real article, reviews it for quality, and publishes it to your town's digital newspaper. Five minutes from event to published story.

Not citizen journalism with all its problems. AI-assisted, AI-reviewed citizen journalism — where the quality layer is built in, not bolted on.

---

## Why This Matters

The news desert crisis isn't about media companies failing. It's about communities going blind.

When a local newspaper closes:
- Municipal bond borrowing costs rise 5-11 basis points (Gao, Lee & Murphy, 2020)
- Corruption charges increase by 6.9% (Rubado & Jennings, 2020)
- Voter turnout drops — local elections lose coverage entirely
- Public health violations go unreported — nobody reads the water quality data
- Community identity erodes — nobody tells the story of the place

50 million Americans live in areas with limited or no local news. In Europe, rural communities face the same collapse. Finland's countryside papers are consolidating or dying. This is a global pattern: professional local journalism is economically unviable at current cost structures.

The problem was never a lack of information. Council minutes exist. Court filings exist. School board decisions exist. Events happen. The problem is nobody turns this into stories that people actually read.

---

## The Product

### For Contributors (anyone in the community)

1. **Record** — Voice-record what happened. Interview someone. Describe the town hall meeting. The app transcribes everything.
2. **Snap** — Take photos. The AI uses them as context and includes them in the article.
3. **Generate** — AI writes a proper article from your raw input. Not a social media post — an actual news article with structure, quotes, and context.
4. **Review** — AI editorial review checks the article across multiple dimensions before publishing: factual claims, balance, missing context, clarity. The contributor sees what needs fixing — like a built-in editor.
5. **Publish** — One click. It goes live on your town's digital newspaper.

### For Readers (everyone in the community)

- A clean, ad-supported local news site for your town
- Push notifications for important local stories
- No algorithm — reverse chronological, with editorial categories (council, schools, business, events, sports, community)
- Comment and discuss — moderated by AI to keep it civil

### For the Platform (us)

- Each town gets a templated digital newspaper — spun up automatically
- AI handles 90% of editorial work (quality review, categorization, headline optimization, photo cropping)
- Human moderation only for flagged edge cases
- Near-zero marginal cost per town

---

## The Demo That Wins PORT_

This is the killer advantage. We don't show slides about local news. We DO local news.

**Samu reports the hackathon itself.**

During PORT_2026, Samu walks around for 10-15 minutes:
- Records a 2-minute interview with another team about their project
- Snaps photos of the venue, teams working, the mentoring sessions
- Voice-records his own observations: "Saturday morning at PORT_, 40 teams are building..."

Then on stage during the pitch:
- We show a sped-up video of Samu doing this (30-60 seconds)
- He opens the app, hits "Generate Article"
- AI produces a full article: "PORT_2026: 40 Teams Compete to Represent Aalto in Seoul"
- AI review runs: checks for balance, missing context, factual claims
- He hits publish
- The article is live on a real site — judges can open it on their phones

**The judges just watched citizen journalism happen in real time, about an event they're sitting in.** They can verify every detail. They can see the article is real. The demo IS the product.

No other team at PORT_ can do this. Everyone else will paste something into a text box or show a pre-built dashboard. We create real content about the real event in front of real judges.

---

## The Economics (Why This Actually Works)

Local news failed because the cost structure was industrial:
- Journalists: $40-80K/year salary per reporter
- Editors: $50-100K/year
- Office, printing, distribution
- A small-town paper needed $200-500K/year minimum to operate

Our cost structure is near-zero:
- Contributors: free (they're community members, not employees)
- AI writing/review: $0.02-0.05 per article (LLM API costs)
- Hosting: pennies per town per month
- Moderation: AI handles 95%, humans handle edge cases at scale

**The math that changes everything:**

| Item | Traditional Paper | Our Platform |
|------|------------------|--------------|
| Cost to cover one town | $200-500K/year | ~$50-200/year |
| Revenue needed to survive | $200K+ | Almost nothing |
| Break-even articles/day | 10-20 (with full staff) | 0 (costs are negligible) |

Even if a town of 2,000 people generates $10/year in local ad revenue, it's profitable because our cost to serve that town is under $5/year. We don't need local news to be a big business per town. We need it to be a near-free service that scales across thousands of towns.

**Revenue streams (realistic, not fantasy):**

- **Local business ads** — even small amounts work at near-zero cost. A local pizza shop paying $5/month to be featured = $60/year from one advertiser. Most towns have 10-50 small businesses.
- **Municipal subscriptions** — towns pay $50-200/month for enhanced community communication (official announcements, meeting summaries, public notices published automatically). This replaces the $2,000/year they spend on physical notice boards and mailing.
- **Premium features** — contributors who want analytics, scheduling, or multi-town publishing pay $5-10/month.
- **Aggregate advertising** — once we have 1,000+ towns, we sell regional/national ad inventory programmatically. This is where real revenue starts.

**Scaling math:**
- 1,000 towns x $100/month average revenue = $100K/month = $1.2M ARR
- 10,000 towns x $150/month = $1.5M/month = $18M ARR
- Operating costs scale sub-linearly (AI costs drop yearly, infrastructure is shared)

This isn't a venture-scale moonshot. It's a platform that works at small scale and compounds.

---

## Technical Build

This is straightforward in 2026. No novel technology required.

### Architecture

```
Mobile App (React Native)          Web Reader (Next.js)
    |                                    |
    v                                    v
+--------------------------------------------------+
|                  API Layer (FastAPI)              |
+--------------------------------------------------+
    |              |              |
    v              v              v
Whisper API    Claude API     PostgreSQL
(transcribe)   (write+review)  (articles, towns, users)
    |              |
    v              v
  S3/R2         Image
(media)       Processing
```

### Core Pipeline (what happens when someone submits)

1. **Audio transcription** — Whisper API. 2-minute recording transcribed in 10 seconds. Cost: $0.006/minute.
2. **Article generation** — Claude/GPT. Takes transcript + photos + any notes. Generates structured article with headline, body, quotes, photo captions. Cost: $0.01-0.03.
3. **Quality review** — Same LLM, second pass. Checks:
   - Are quotes attributed correctly?
   - Are factual claims reasonable? (flags "the council approved a $10 billion budget" for a town of 500)
   - Is the tone appropriate for local news?
   - Is anything potentially defamatory?
   - Missing context? (e.g., mentions a vote but not the vote count)
4. **Publish** — Article goes live with quality score visible to contributor. Flagged items require contributor review before publishing.

### Hackathon Build (48 hours)

**What we actually build:**
- Mobile web app (not native — faster to build, works on any phone)
- Audio recording + Whisper transcription
- Photo upload
- Claude API for article generation + quality review
- Simple town newspaper template (Next.js static site)
- One real town newspaper instance for the demo

**What we skip for the hackathon:**
- Native app
- User accounts (demo mode only)
- Ad system
- Moderation dashboard
- Multi-town management

**Time estimate:**
- Audio recording + transcription: 3-4 hours
- Article generation pipeline: 4-5 hours
- Quality review layer: 3-4 hours
- Newspaper template + reader site: 4-5 hours
- Demo content + Samu's reporting: 2-3 hours
- Pitch prep + video editing: 3-4 hours
- Buffer: 4-6 hours

This is well within 48 hours for a team of 3-4.

---

## Challenge Fit

**"Create innovative platforms, tools, or narratives that shape how people create, consume, and engage with culture and media in more responsible, inclusive, and impactful ways."**

| Challenge Keyword | How We Hit It |
|-------------------|---------------|
| Create | Anyone can create local news — not just journalists |
| Consume | Clean, accessible local newspaper for every community |
| Engage | Contributors ARE the community — active participation, not passive consumption |
| Responsible | AI quality review ensures standards before publishing |
| Inclusive | No journalism degree required. No expensive equipment. Phone + voice = enough |
| Impactful | Directly addresses news deserts — measurable community impact |
| Digital equity | Brings digital news infrastructure to communities that have none |
| Sustainability of media systems | Near-zero cost model makes local news sustainable for the first time |
| Audience empowerment | Transforms passive news consumers into active news creators |

**"Consider representation, ethical storytelling, digital equity, sustainability of media systems, emerging technologies, and audience empowerment."**

We hit every single keyword. This isn't a stretch — the challenge description reads like it was written for this idea.

---

## YC Validation

- **Lokal (YC S19)** — Local news platform for India's small towns. Raised funding, proved local news works as a platform business in underserved markets. Active and growing. Validates the core thesis: local news can work digitally if the cost structure is right.
- **The pattern:** Lokal succeeded by making local news creation cheap (user-generated + lightweight editorial). We go further — AI handles the editorial layer entirely.

---

## Risks (Honest Assessment)

### Real risks we need to address:

**1. Misinformation liability**
- Someone publishes false claims about a local business or person
- **Mitigation:** AI review flags potentially defamatory content, factual claims that seem extreme, and unverified accusations. Flagged content requires human review. Community reporting mechanism. Clear terms of service.
- **Honest answer:** This is a real risk. We can't catch everything. But the alternative (no local news at all) means misinformation spreads on Facebook groups with zero review. We're strictly better than the status quo.

**2. Content quality — will people actually contribute?**
- Cold start problem: empty newspaper = no readers = no contributors
- **Mitigation:** Seed each town with AI-generated content from public records (council minutes, police blotter, school calendars, weather). The newspaper isn't empty on day one. Contributors add to an already-functioning publication.
- **Honest answer:** Some towns will thrive, some won't. That's fine at near-zero cost per town. We don't need every town to work — we need enough towns to work.

**3. Contributor motivation**
- Why would someone spend 15 minutes creating local news for free?
- **Answer:** Same reason people post on local Facebook groups, Nextdoor, Reddit, and community WhatsApp. People already share local information for free — we just give it structure, quality, and reach. The motivation already exists. We're channeling it, not creating it.

**4. Competition from Facebook Groups / Nextdoor / Reddit**
- These already serve as informal local news
- **Our advantage:** Structure. A Facebook group post about a council meeting is noise. An AI-generated article with proper structure, context, and quality review is signal. We turn community chatter into community journalism.

**5. AI hallucination in generated articles**
- AI could fabricate quotes or facts
- **Mitigation:** The AI generates FROM the contributor's raw input (transcript, photos, notes). It structures and cleans up — it doesn't invent. The quality review layer specifically checks generated content against source input. Contributors review before publishing.

---

## Competitive Landscape

| Solution | What It Does | Why We're Different |
|----------|-------------|-------------------|
| Local Facebook Groups | Unstructured community posts | We add structure, quality review, and journalistic standards |
| Nextdoor | Neighborhood social network | We produce actual articles, not social media posts |
| Patch | Professional hyperlocal news | They need professional journalists ($$$). We use AI + community |
| BEACON (our other idea) | Monitors public records | BEACON surfaces data. We create stories. Complementary, not competing |
| Lokal (YC S19) | Local news platform (India) | We add AI-powered creation and editorial review |
| ChatGPT/Claude directly | AI can write anything | No publishing platform, no community, no quality review, no distribution |

---

## Why Now

1. **AI writing quality crossed the threshold** — LLMs can now generate publication-quality articles from rough notes and transcripts. This wasn't possible 18 months ago.
2. **Whisper-level transcription is near-free** — Voice-to-text at broadcast quality for $0.006/minute makes voice-first contribution viable.
3. **News desert crisis is accelerating** — More papers close every month. The gap between information availability and information accessibility grows wider.
4. **Community platforms are failing at news** — Facebook deprioritized news in 2024. Nextdoor is social, not journalistic. The gap is wider than ever.
5. **People already create local content for free** — They just do it on platforms that don't structure or preserve it. We capture energy that already exists.

---

## The Bigger Picture

Start with news deserts. But the platform generalizes.

**Phase 1:** English-speaking news deserts (US rural, UK small towns, Australian outback). Prove the model works.

**Phase 2:** Non-English communities. Finland's shrinking local papers. India's unserved villages (Lokal proved demand). South America's rural communities. The AI pipeline works in any language — Whisper transcribes 99 languages, LLMs generate in all of them.

**Phase 3:** Niche communities, not just geographic ones. University campus newspapers. Company internal news. Neighborhood associations. Religious communities. Any group that has things happening but nobody writing them up.

**Phase 4:** The data layer. Thousands of towns producing local news daily = the most granular dataset of what's happening at community level worldwide. Municipal analytics. Trend detection. "Water quality complaints are spiking in 47 towns in Ohio" — that's a state-level story surfaced from local-level data.

---

## PORT_ Pitch Structure (3 minutes)

**[0:00 - 0:15] Hook**
"213 American counties have zero local journalists. When the newspaper closes, corruption goes up 7%. Not because corrupt people move in — because nobody's watching anymore. 50 million people live in communities where nobody writes down what happens."

**[0:15 - 0:30] The Insight**
"But local knowledge isn't gone. People know what happened at the town hall. They saw the new business open. They were at the school board meeting. The knowledge exists — it's just locked in people's heads and scattered across Facebook posts that disappear in 24 hours."

**[0:30 - 0:45] The Product**
"We built [Name]. Record what happened. Snap a photo. AI writes a proper news article. AI reviews it — checks quotes, flags claims, adds context. You hit publish. Your town has a newspaper again."

**[0:45 - 1:30] The Demo (Samu's video)**
"Let me show you. Yesterday, Samu reported this hackathon."
[Play 30-45 second video: Samu interviewing a team, taking photos, recording notes]
"He spent 10 minutes. Here's what the AI produced."
[Show generated article on screen. Click through quality review.]
"The AI flagged one claim it couldn't verify and suggested adding the team count. Samu confirmed, hit publish."
[Show live newspaper site. Judges can open it on their phones.]

**[1:30 - 2:00] Why It Works Economically**
"Local news died because a small-town paper costs $300K a year to run. Our cost per town? Under $5 a year. AI writes, AI edits, AI moderates. Even $10 in local ads makes a town profitable. We don't need local news to be a big business. We need it to be a free service that scales."

**[2:00 - 2:20] The Market**
"There are 20,000+ news deserts globally. Municipal governments already spend money on community communication. Local businesses need local advertising. We start with English-speaking rural communities and expand to any language — the AI pipeline works in 99 languages."

**[2:20 - 2:40] The Quality Layer**
"The obvious question: what stops people from publishing garbage? The AI editorial layer. Every article is reviewed before publishing — quotes checked against the transcript, extreme claims flagged, missing context suggested. It's not perfect. But it's better than Facebook groups with zero review, which is what these communities have now."

**[2:40 - 3:00] Close**
"The news didn't die because people stopped caring. It died because the economics broke. AI fixes the economics. The people were always there. We just gave them a publish button with a quality filter. This is [Name]."

---

## Hackathon Scoring Prediction

| Criteria | Score | Reasoning |
|----------|-------|-----------|
| Technical Feasibility (10) | **8-9** | Working demo built in 48 hours. Real article generated live. Simple, proven tech stack. Judges see it work. |
| Market Potential (10) | **7-8** | Clear problem (news deserts), global scale, near-zero cost model. Not a unicorn pitch but a real, sustainable business. |
| Team Dynamics (5) | **4-5** | Samu literally does journalism during the hackathon. Each team member has a clear role. The demo proves the team works. |
| Risk Evaluation (5) | **3-4** | Honest about misinformation risk. Have mitigation. Content quality is addressed by AI review layer. |
| **Total** | **22-26/30** | |

**Why this scores high:** The demo. Judges at PORT_ will have seen 20 teams paste text into boxes and show dashboards. We show a real person creating real news about the real event they're all at. That's memorable. That wins.

---

*"Local news didn't die because people stopped caring about their communities. It died because professional journalism costs $300K a year and a town of 2,000 can't support that. AI drops the cost to near zero. The community already has the knowledge, the motivation, and the phones. We just connect the pieces."*
