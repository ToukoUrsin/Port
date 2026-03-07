# GSSC 2026 Startup Ideation Research Report
## Theme: "Next Generation of Culture & Media: Empowering Connection & Truth"
## Problem Space: Online Harassment Silencing Women and Minority Creators

---

# PART 1: COMPETITIVE LANDSCAPE -- WHAT EXISTS, WHAT WORKS, WHAT DOESN'T

## 1.1 Platform-Native Tools (Built-In)

| Platform | Tool | What It Does | Key Limitation |
|----------|------|-------------|----------------|
| YouTube | Word Filters | Creators manually specify phrases to auto-hide | Rudimentary; easily circumvented by misspellings; requires constant manual updating |
| Twitch | AutoMod | AI/NLP flags offensive content in livestream chats | Overwhelmed by coordinated "hate raids"; reactive not proactive; can't handle 400+ bot floods |
| Instagram | Hidden Words | ML-based toxic comment filtering | Limited customization; doesn't cover DMs well; no evidence trail |
| X/Twitter | Mute/Block | User blocks or mutes individual accounts | Whack-a-mole; harassers create new accounts; no aggregate visibility |
| Substack | Manual Moderation | Writers delete comments, ban users | Entirely manual burden on individual creator; no automation; platform's "hands-off" philosophy |

**Verdict:** Platform tools are reactive, rudimentary, and place the entire burden on the creator. They require the creator to *see* the harassment before acting on it.

## 1.2 Third-Party Anti-Harassment Tools

### Block Party (Tracy Chou, founded 2021)
- **Original product:** Auto-filtered harassment on Twitter/X into a separate "lockout" folder
- **Critical insight:** The "lockout folder" concept -- harassment exists but the creator doesn't see it unless they choose to
- **What happened:** X began charging for API access in 2023; Block Party couldn't afford it; forced to pivot
- **Current product:** Browser extension for privacy cleanup across 11+ platforms (deleting old posts, tightening settings)
- **Gap exposed:** Dependency on platform APIs is an existential risk for third-party tools

### Bodyguard.ai (France, founded 2018)
- Real-time AI moderation across 45+ languages, <100ms response time
- Pivoted from B2C (free consumer app) to B2B (enterprise/brand protection)
- Protects journalists, athletes, brands
- **Gap:** Enterprise-focused; not accessible or affordable for independent creators; doesn't preserve evidence

### Perspective API (Google Jigsaw)
- 500M+ daily requests; scores toxicity 0-1
- **Critical bias problem:** More likely to flag African American English, disability-related language, drag queen speech as toxic
- Black-box model limits ability to audit or correct bias
- Easily deceived by slight text perturbations
- **Gap:** Bias against the very communities most targeted by harassment

### Squadbox (MIT CSAIL Research)
- "Friendsourced moderation" -- friends intercept and filter email harassment
- Innovative concept: uses trusted humans, not just AI
- **Gap:** Email-only; research project, not a product; doesn't scale; doesn't preserve evidence

### PressProtect (Academic Research, 2024)
- Interface designed specifically for journalists on X/Twitter
- Categorizes responses into helpful/harmful, allowing journalists to see useful feedback while being shielded from abuse
- Tested with Asian American Pacific Islander journalists
- **Gap:** Research prototype only; single platform; no evidence preservation; no legal angle

## 1.3 Evidence Preservation Tools (Separate Category)

| Tool | Function | Limitation |
|------|----------|------------|
| ProofSnap | Chrome extension; blockchain-timestamped screenshots | Manual; not integrated with harassment detection; creator must actively capture |
| WebPreserver (PageFreezer) | Forensic web page capture with digital signatures | Enterprise pricing; designed for legal professionals, not creators |
| Evidence Collector | Browser-based forensic capture with SHA-256 hashing | Professional tool; not automated; not harassment-specific |

**Critical gap:** NO existing tool combines harassment detection + creator shielding + automated legal-grade evidence preservation.

---

# PART 2: THE SPECIFIC GAP -- PREVENTING CREATORS FROM *SEEING* HARASSMENT

## 2.1 Why "Not Seeing" Matters More Than "Moderating"

The research is unambiguous: the psychological damage happens at the moment of *exposure*. Even if a comment is later deleted, the creator has already read it. The mental health data is devastating:

- 10% of content creators report suicidal thoughts (2x national average)
- 52% report anxiety, 35% depression, 62% burnout
- 89% lack access to specialized mental health resources
- 30% of women journalists self-censor as a direct result of seeing harassment
- 40% of women journalists have avoided reporting certain stories to avoid harassment

The current paradigm is broken: **every existing tool requires the creator to encounter harassment before it can be addressed.** Even Block Party's "lockout folder" still let the creator peek. Platform reporting requires screenshotting -- which means reading -- the abuse first.

## 2.2 The "Emotional Firewall" Concept

What's needed is a tool that operates as an **emotional firewall** -- a layer between the raw internet and the creator's experience that:

1. **Intercepts** all incoming engagement (comments, DMs, mentions, replies)
2. **Classifies** content before the creator ever sees it
3. **Shields** the creator from harmful content by default
4. **Preserves** harmful content forensically (with legal-grade metadata)
5. **Summarizes** engagement patterns without exposing toxic specifics
6. **Escalates** genuine threats to appropriate parties (legal, law enforcement, platform)

No existing product does all six of these things.

## 2.3 What PressProtect Got Right (and What It Missed)

PressProtect (2024 academic paper) is the closest existing concept. It correctly identified that journalists need to see *useful* reader responses while being shielded from *harmful* ones. Its four-quadrant model (helpful+harmless, helpful+harmful, unhelpful+harmless, unhelpful+harmful) is smart.

**What it missed:**
- No evidence preservation
- No legal/reporting pipeline
- No cross-platform support
- No mental health integration
- Research prototype only, not a product
- Single platform (X/Twitter)

---

# PART 3: THE LEGAL/EVIDENCE PRESERVATION ANGLE

## 3.1 Why Evidence Matters

Currently, reporting online harassment to law enforcement is extraordinarily difficult:

- **Police are unfamiliar** with online platforms and often don't take digital harassment seriously
- **The burden falls on victims** to educate law enforcement about cyber laws
- **Evidence disappears** quickly when harassers delete messages or platforms take down content
- **Screenshots are weak evidence** -- easily challenged as manipulated, lacking metadata
- **Chain of custody** requirements mean informal screenshots often aren't admissible
- **Cross-jurisdictional issues** make prosecution nearly impossible when harassers are anonymous or in different countries

## 3.2 What Makes Digital Evidence Court-Admissible

For digital harassment evidence to hold up in court, it must demonstrate:

1. **Authenticity** -- proof the content hasn't been altered (cryptographic hashing, SHA-256)
2. **Chain of custody** -- documented record of who handled the evidence and when
3. **Timestamp verification** -- certified timestamps (ideally from a Stratum-1 atomic clock or blockchain)
4. **Metadata preservation** -- original metadata including IP information, platform identifiers, timestamps
5. **Integrity verification** -- mathematical proof via checksums that data is unchanged
6. **Qualified third-party certification** -- evidence collected by a recognized, qualified third party

## 3.3 The Legal Landscape Is Catching Up

- **TAKE IT DOWN Act (US, May 2025):** First federal law criminalizing non-consensual intimate images including AI deepfakes
- **Florida's "Brooke's Law" (June 2025):** Requires platforms to remove deepfake content within 48 hours
- **Brazil (April 2025):** Increased penalties for AI-based psychological violence against women
- **South Korea:** Cyber defamation carries up to 7 years imprisonment; recent courts have broadened harassment definitions to include social media
- **C2PA Standard:** Content provenance framework gaining adoption by Google, Microsoft, Meta, OpenAI

**The trend is clear:** Laws are being enacted, but victims still lack the tools to build admissible cases. This is the opportunity.

---

# PART 4: THE STARTUP IDEA

## AEGIS -- The Invisible Shield for Independent Voices

**Tagline:** "You create. We protect. The evidence speaks."

### 4.1 What AEGIS Is

AEGIS is a cross-platform AI shield that sits between independent creators and their audiences, intercepting all incoming engagement, filtering out harassment *before the creator ever sees it*, and automatically preserving toxic content as court-admissible digital evidence with blockchain-verified timestamps and chain of custody.

### 4.2 The Exact User: Independent Women Journalists and Newsletter Writers

**Why this niche:**

- **52% of all creators are women**, but women journalists face the most severe and documented harassment
- **Freelance/independent journalists have ZERO institutional support** -- no security team, no legal department, no newsroom backing
- The independent journalism market is exploding: 35M+ newsletter subscribers on Substack alone; platforms like Ghost, Beehiiv, and Buttondown are growing rapidly
- **40% of women journalists avoid certain stories** to avoid harassment -- this is a *press freedom* crisis, not just a personal safety issue
- Independent journalists are willing to pay for tools (they already pay for writing platforms, email services, analytics)
- This niche is emotionally compelling for judges at a competition themed "Empowering Connection & Truth"

**User persona: "Sara"**
- 32-year-old independent investigative journalist
- Writes a Substack newsletter on women's rights and political accountability in Southeast Asia
- Has 12,000 subscribers
- Every time she publishes an investigative piece, she receives 50-200 harassing comments, DMs, and emails
- She has been doxxed twice and received death threats
- She has no editor, no security team, no legal department
- She spends 3-4 hours per week manually moderating comments, blocking accounts, and screenshotting threats
- She has stopped covering certain powerful figures because the harassment made her afraid for her physical safety
- She tried reporting to police once; they told her to "just get off the internet"

### 4.3 Specific Pain Points Solved

| Pain Point | Current Reality | AEGIS Solution |
|------------|----------------|----------------|
| Seeing harassment | Creator reads every toxic comment | AI intercepts and classifies before delivery; creator sees clean feed |
| Evidence disappears | Harassers delete; platforms take down | Auto-capture with blockchain timestamp at moment of detection |
| Reporting to police | Creator must compile evidence manually; police dismiss | One-click export of court-admissible evidence package (PDF + metadata + hash certificates) |
| Self-censorship | 40% avoid certain stories | Harassment data shows patterns, enabling informed risk assessment without emotional exposure |
| Time burden | 3-4 hours/week on moderation | Fully automated; creator reviews weekly summary dashboard only |
| Isolation | No institutional support | Optional "trusted circle" feature -- designated allies can review flagged content |
| Mental health | PTSD, anxiety, burnout | Never exposed to raw toxicity; optional connection to journalist support hotlines |

### 4.4 Technical Implementation

#### Architecture

```
[Creator's Platforms]           [AEGIS Cloud]              [Creator's Experience]

Substack comments ----+
Email inbox ----------+---> AEGIS Ingestion API ---> AI Classification Engine
X/Twitter mentions ---+         |                      |          |
Instagram DMs -------+         |                      |          |
                                |                  [Harmful]   [Safe]
                                |                      |          |
                          Blockchain                   v          v
                          Timestamp            Evidence Vault   Clean Feed
                          Service              (encrypted,      (delivered
                                               hashed,          to creator)
                                               immutable)
                                                    |
                                              Legal Export
                                              Engine
                                                    |
                                              PDF Report +
                                              Metadata +
                                              Hash Certs +
                                              Chain of Custody
```

#### Core Technical Components

**1. Multi-Platform Ingestion Layer**
- Browser extension + API integrations for Substack, Ghost, email (IMAP/SMTP), X, Instagram, YouTube
- Webhooks where available; polling + scraping where not
- Platform-agnostic message normalization

**2. AI Classification Engine**
- Fine-tuned transformer model (based on open-source LLM like Llama 3 or Mistral)
- Multi-label classification: threat, sexual harassment, doxxing, identity-based attack, coordinated campaign, spam, constructive criticism, positive engagement
- **Bias mitigation layer:** Specifically trained to NOT flag AAVE, disability language, LGBTQ+ identity terms as toxic (addressing Perspective API's known bias)
- Confidence scoring with human-in-the-loop for edge cases
- Context-aware: understands journalist-specific language and public discourse norms

**3. Evidence Vault (Forensic-Grade)**
- Every detected harassment instance automatically:
  - Captured as full-page render (not just text -- includes visual context)
  - Hashed with SHA-256
  - Timestamped via blockchain (using a service like OpenTimestamps or similar)
  - Stored in encrypted, append-only database
  - Metadata preserved: platform, URL, account info, timestamp, hash, classification
- Chain of custody logging from moment of capture
- Compliant with digital evidence standards referenced in US, EU, and Korean courts

**4. Creator Dashboard**
- Clean feed: only safe, constructive engagement visible by default
- Weekly summary: "This week: 847 comments received. 791 constructive. 56 filtered (12 threats, 8 doxxing attempts, 36 harassment). Evidence preserved."
- Threat trend analysis: "Harassment increased 340% after your article on [topic]. Pattern consistent with coordinated campaign."
- One-click legal export: generates court-ready PDF package
- "Trusted Circle" panel: invite allies/moderators to review flagged content

**5. Legal Export Engine**
- Generates formatted evidence packages:
  - Chronological harassment timeline
  - Each instance with screenshot, raw text, metadata, SHA-256 hash, blockchain timestamp certificate
  - Statistical summary (frequency, severity, pattern analysis)
  - Chain of custody documentation
  - Platform-specific reporting templates
- Formatted for police reports, court filings, and platform appeals
- Exportable in jurisdictionally-appropriate formats (US, EU, South Korea, etc.)

#### Tech Stack for Hackathon Prototype

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Tailwind CSS (dashboard) |
| Backend | Convex (real-time database + serverless functions) |
| Browser Extension | Chrome Extension (Manifest V3) |
| AI Classification | OpenAI API (GPT-4o-mini for classification; fine-tuning later) |
| Evidence Hashing | Web Crypto API (SHA-256) |
| Blockchain Timestamps | OpenTimestamps (free, Bitcoin-based) |
| PDF Generation | jsPDF or react-pdf |
| Auth | Convex Auth |

### 4.5 Hackathon Prototype Scope (48-72 hours)

**Demo Flow (4 minutes):**

1. **Setup (30 sec):** Sara installs AEGIS browser extension, connects her Substack
2. **The Storm (60 sec):** Sara publishes an article. Simulated comments flood in -- mix of supportive readers and coordinated harassment (threats, doxxing, misogynistic slurs). SPLIT SCREEN: Left shows raw unfiltered comments (what Sara would normally see). Right shows AEGIS-filtered clean feed (what Sara actually sees).
3. **The Shield in Action (60 sec):** Dashboard shows real-time classification. Green comments flow to Sara. Red comments are intercepted, hashed, timestamped, and stored. Sara sees: "12 new comments, all constructive!" -- she has no idea about the 47 toxic messages.
4. **The Evidence (60 sec):** Sara clicks "Legal Export." In seconds: a court-ready PDF with every harassment instance, blockchain-verified timestamps, metadata, pattern analysis. She can hand this directly to a lawyer or police officer.
5. **The Impact (30 sec):** "Sara published 3 more investigative pieces this month. She didn't self-censor. She didn't lose sleep. And if she ever needs to go to court -- the evidence is already there."

**What the prototype actually needs to demonstrate:**
- Browser extension that captures comments from a Substack page
- AI classification of comments into safe/harmful categories
- Clean feed view vs. raw feed view (the dramatic split-screen)
- Automatic SHA-256 hashing and timestamp of harmful comments
- One-click PDF export with hash verification
- Dashboard showing engagement summary without toxic details

### 4.6 Revenue Model

**Tiered SaaS Subscription:**

| Tier | Price | Target | Features |
|------|-------|--------|----------|
| **Shield Free** | $0/month | Small creators (<1K followers) | 1 platform, basic AI filtering, 30-day evidence retention |
| **Shield Pro** | $15/month | Independent journalists, mid-size creators | 3 platforms, advanced AI, unlimited evidence retention, legal export, trusted circle (3 allies) |
| **Shield Press** | $49/month | Professional independent journalists, high-profile creators | Unlimited platforms, priority classification, dedicated threat analyst review, unlimited trusted circle, API access |
| **Shield Newsroom** | $199/month (per 10 seats) | Small newsrooms, journalism collectives | Team dashboard, shared blocklists, organizational threat intelligence, SSO |

**Additional Revenue Streams:**
- **Legal Report Generation:** $29 per comprehensive court-ready evidence package (one-time)
- **B2B Licensing:** License the AI classification engine to platforms (Substack, Ghost, Beehiiv) as an embedded safety feature
- **Insurance Partnerships:** Partner with journalist safety organizations to offer AEGIS as part of safety packages
- **Training Data Licensing:** Anonymized, aggregated harassment pattern data for academic research (with strict privacy controls)

**Unit Economics (Year 2 target):**
- CAC: ~$25 (content marketing + journalist community word-of-mouth)
- Monthly ARPU: ~$22 (blended across tiers)
- LTV: ~$528 (24-month average retention)
- LTV/CAC ratio: 21:1

### 4.7 Market Sizing

**TAM (Total Addressable Market):**
- 200M+ content creators globally
- Creator economy: $250B+ (2025), growing 20%+ annually
- Online safety tools market: $5.5B (2024), projected $17.2B by 2030

**SAM (Serviceable Addressable Market):**
- ~2M independent journalists and newsletter writers globally
- ~15M women creators experiencing harassment regularly
- ~5M creators on platforms like Substack, Ghost, Beehiiv, Medium

**SOM (Serviceable Obtainable Market, Year 1-3):**
- Target: 50,000 paying users by Year 3
- Focus: English-speaking independent journalists and newsletter writers
- Revenue target: $50K MRR by Month 18; $1.1M ARR by Year 2

### 4.8 Global Scalability

**Why AEGIS scales globally:**

1. **Language expansion:** The AI model can be fine-tuned for additional languages. Harassment patterns are culturally specific but structurally similar. Priority: English > Korean > Spanish > French > Arabic > Hindi
2. **Legal framework adaptation:** The evidence export engine can be configured for jurisdiction-specific requirements (US federal/state, EU GDPR-compliant, Korean cyber defamation law, Brazilian AI violence law)
3. **Platform expansion:** Each new platform integration expands the addressable market. Priority: Substack > Email > X > Instagram > YouTube > TikTok > Ghost > Beehiiv
4. **Cultural relevance in Seoul:** South Korea has some of the world's strongest cyber defamation laws (up to 7 years imprisonment) but also extreme online harassment problems (Nth Room case). Korean women journalists and creators are a natural early expansion market.
5. **Partnerships:** UNESCO, ICFJ, Committee to Protect Journalists, International Women's Media Foundation, Reporters Without Borders -- all actively seeking technological solutions to this exact problem

### 4.9 The 4-Minute Pitch "Aha Moment"

**The moment that wins:**

The split-screen demo. On the left: the raw, unfiltered reality -- a torrent of violent, misogynistic, threatening messages flooding in after a woman journalist publishes an investigation. On the right: what AEGIS shows her -- thoughtful reader responses, constructive feedback, genuine engagement. The same moment in time. Two completely different realities.

Then: "Every one of those toxic messages on the left? Already hashed. Already timestamped. Already preserved as court-admissible evidence. Sara doesn't need to read them. She doesn't need to screenshot them. She doesn't need to lose sleep over them. But if she ever needs justice -- the evidence is already there."

**Why this wins the judges:**
- **Visceral emotional impact:** The split-screen makes the problem and solution instantly tangible
- **Technical credibility:** Blockchain hashing and forensic evidence preservation demonstrates real engineering
- **Clear market:** The creator economy is a $250B+ market; safety is an unsolved problem
- **Social impact:** Directly addresses press freedom, gender equality, and the chilling effect
- **Theme alignment:** "Empowering Connection & Truth" -- AEGIS empowers connection (creators can engage safely) and truth (evidence preservation; creators don't self-censor)

---

# PART 5: NICHE REFINEMENT -- THE SHARPEST ANGLE

## 5.1 Why "Independent Women Journalists in the Global South" Is the Killer Niche

The most compelling version of AEGIS targets a very specific user: **independent women journalists covering accountability stories in countries with weak press freedom protections.**

**Why this is sharper than "all creators":**

1. **Highest stakes:** These journalists face not just online harassment but offline violence linked to online attacks (42% report this connection)
2. **Zero safety net:** No newsroom security team, no legal department, no IT support
3. **Maximum chilling effect:** 40% have stopped covering certain stories entirely
4. **Evidence gap is most acute:** In countries with weak digital infrastructure, police are even less equipped to handle cyber harassment reports
5. **Funding ecosystem exists:** Press freedom organizations (CPJ, RSF, IWMF, ICFJ) have budgets specifically for journalist safety tools
6. **Competition is thinnest:** Bodyguard.ai serves enterprises; Block Party pivoted away; no one serves this user
7. **Story is most compelling:** "A woman in Manila is investigating government corruption. Every article she writes triggers death threats. She has no protection. AEGIS changes that."

## 5.2 Alternative Niche: Women Livestream Creators Facing Hate Raids

Another strong angle:

- Twitch hate raids (400+ bots flooding streams with slurs) have no effective real-time defense
- Women and BIPOC streamers are disproportionately targeted
- The *live* nature means the creator and their *audience* see harassment in real-time
- AEGIS could function as a real-time AI chat filter that blocks hate raid messages before they render on screen
- Evidence preservation of coordinated attacks could support pattern-based legal action

**Why this might be weaker for GSSC:** Less aligned with "Truth" theme; livestreaming is entertainment-adjacent rather than press-freedom-adjacent.

## 5.3 Recommended Positioning for GSSC 2026

**Lead with the journalist angle. Expand to all creators.**

Pitch narrative: "We built AEGIS for the most vulnerable voice in media -- the independent woman journalist with no institutional protection. But every creator deserves this shield."

---

# PART 6: RISK EVALUATION

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Platform API dependency** (Block Party's fatal flaw) | HIGH | Multi-modal approach: browser extension (no API needed) + API where available + email integration (standard protocols). Never depend on a single platform's API. |
| **AI classification errors** (false positives hiding legitimate criticism; false negatives letting threats through) | HIGH | Conservative default (show more, filter less); confidence thresholds; "trusted circle" human review for edge cases; continuous model improvement from user feedback |
| **Bias in AI model** (Perspective API's documented problem) | HIGH | Dedicated bias testing against AAVE, disability language, LGBTQ+ terms; diverse training data; regular third-party bias audits; transparent bias reports |
| **Legal liability** (if AEGIS misses a genuine threat that leads to harm) | MEDIUM | Clear terms: AEGIS is a support tool, not a security guarantee; escalation to law enforcement for highest-severity threats; partnership with journalist safety organizations |
| **Evidence admissibility challenges** (courts may not accept AEGIS evidence) | MEDIUM | Build to the highest standard (blockchain timestamps, SHA-256, chain of custody); seek advisory from digital forensics experts; aim for recognition as a qualified third-party evidence platform |
| **Privacy/GDPR compliance** (storing harassment data, including personal information of harassers) | MEDIUM | Data minimization; encryption at rest and in transit; GDPR-compliant data processing agreements; user controls over data retention and deletion |
| **Competitor response** (platforms build their own versions) | LOW-MEDIUM | Platforms have had years and haven't solved this; cross-platform is our advantage; evidence preservation is not in platforms' interest (legal liability for them) |
| **Market adoption** (creators may not pay for safety tools) | MEDIUM | Freemium model lowers barrier; press freedom organizations may subsidize; demonstrate clear ROI (time saved, stories not self-censored, legal cases enabled) |

---

# PART 7: TEAM DYNAMICS RECOMMENDATIONS (5 points at GSSC)

**Ideal 4-person team composition:**

1. **Technical Lead:** ML/AI experience; can build classification engine and browser extension
2. **Product/Design Lead:** UX expertise; can design the dashboard and demonstrate the split-screen moment
3. **Legal/Policy Lead:** Understanding of digital evidence law, press freedom, or human rights
4. **Business/Impact Lead:** Can articulate market sizing, revenue model, and social impact narrative

**For GSSC specifically:** Emphasize diverse team backgrounds (gender, geography, discipline). The judges want to see that the team *understands* the problem from lived experience or deep empathy, not just technical capability.

---

# PART 8: SUMMARY -- WHY AEGIS WINS

| GSSC Criterion | AEGIS Score Justification |
|----------------|--------------------------|
| **Technical Feasibility (10p)** | All core components use existing, proven technologies (transformer models, SHA-256 hashing, blockchain timestamps, browser extensions). Hackathon prototype is achievable in 48-72 hours. The innovation is in the *combination*, not in any single moonshot technology. |
| **Market Potential & Scalability (10p)** | $250B+ creator economy; 200M+ creators globally; 75% of women journalists face harassment; zero existing solutions combine shielding + evidence preservation. Clear path from niche (independent journalists) to broad market (all creators). |
| **Team Dynamics (5p)** | Problem requires interdisciplinary team (AI/ML + legal + journalism/media + design). Natural fit for diverse, passionate team. |
| **Risk Evaluation (5p)** | Risks are real but well-understood and mitigable. The Block Party precedent (API dependency) is specifically addressed. The bias problem (Perspective API) is specifically addressed. |

**The one-sentence pitch:**

*AEGIS is the invisible shield that lets independent journalists create fearlessly -- intercepting harassment before they see it, preserving every threat as court-admissible evidence, and turning the chilling effect into accountability.*

---

## Key Research Sources

### Anti-Harassment Tools and Research
- [Block Party - How it works](https://www.blockpartyapp.com/how-it-works)
- [Block Party pivots to privacy tool - Fast Company](https://www.fastcompany.com/91297336/block-party-offers-tool-for-optimizing-social-media-privacy)
- [ADL: Tools Against Harassment: Empowering Content Creators](https://www.adl.org/resources/report/tools-against-harassment-empowering-content-creators)
- [PressProtect: Helping Journalists Navigate Social Media](https://arxiv.org/html/2401.11032v1)
- [Squadbox: Friendsourced Moderation - MIT](https://news.mit.edu/2018/using-friends-to-fight-online-harassment-0405)
- [Bodyguard.ai](https://www.bodyguard.ai/en)
- [Perspective API Research](https://www.perspectiveapi.com/research/)
- [Toxic Bias: Perspective API Misreads German as More Toxic](https://arxiv.org/html/2312.12651v1)

### Online Harassment Statistics and Research
- [ICFJ: The Chilling -- Global Study on Online Violence Against Women Journalists](https://www.icfj.org/our-work/chilling-global-study-online-violence-against-women-journalists)
- [UNESCO: The Chilling Effect](https://www.unesco.org/en/articles/chilling-effect-psychosocial-effects-online-violence-journalists)
- [UN Women: How digital violence threatens press freedom](https://www.unwomen.org/en/news-stories/feature-story/2025/12/how-digital-violence-threatens-press-freedom-in-africa)
- [Freedom House: Online Harassment of Women Journalists](https://freedomhouse.org/article/we-must-do-more-address-online-harassment-women-journalists)
- [Harvard: Content creators struggling with mental health](https://hsph.harvard.edu/news/content-creators-are-struggling-with-mental-health-study-finds/)
- [Creators 4 Mental Health: 2025 Burnout Study](https://www.tubefilter.com/2025/11/12/creators-4-mental-health-burnout-study-results/)
- [Rolling Stone: Women on Twitch -- Harassment, Stalkers, Death Threats](https://www.rollingstone.com/culture/culture-features/valkyrae-cinna-emiru-women-twitch-streamers-harassment-1235289509/)
- [Coordinated Hate Raids on Twitch (Meisner, 2023)](https://journals.sagepub.com/doi/10.1177/20563051231179696)

### Creator Economy Market Data
- [Creator Economy Statistics 2026 - DemandSage](https://www.demandsage.com/creator-economy-statistics/)
- [Creator Economy Market Size - Grand View Research](https://www.grandviewresearch.com/industry-analysis/creator-economy-market-report)

### Legal and Evidence Preservation
- [ProofSnap - Blockchain Evidence Preservation](https://getproofsnap.com/)
- [Digital Evidence Admissibility - Leppard Law](https://leppardlaw.com/federal/computer-crimes/analyzing-the-admissibility-of-digital-evidence-in-threat-prosecutions-in-the-us/)
- [Blockchain Evidence in Courts - Frontiers](https://www.frontiersin.org/journals/blockchain/articles/10.3389/fbloc.2024.1306058/full)
- [PEN America: Online Harassment Legal Basics](https://onlineharassmentfieldmanual.pen.org/online-harassment-legal-basics-101/)
- [UN Women: Why Women Can't Get Protection from Deepfake Abuse](https://www.unwomen.org/en/articles/explainer/when-justice-fails-why-women-cant-get-protection-from-ai-deepfake-abuse)
- [TAKE IT DOWN Act / Deepfake Legislation](https://www.traverselegal.com/blog/deepfake-legislation-current-laws/)
- [C2PA Content Provenance Standard](https://c2paviewer.com/articles/what-is-c2pa)

### GSSC Competition Context
- [GSSC Official Site](https://globalstudentstartup.org/)
- [USC Students at GSSC 2026](https://viterbischool.usc.edu/news/2025/12/usc-students-lead-global-innovation-at-gssc-2026/)
- [REVITA -- GSSC 2025 Winner (Seoul National University)](https://www.snu.ac.kr/snunow/press?md=v&bbsidx=155445)

### Platform Moderation
- [Substack Moderation Tools Guide](https://on.substack.com/p/a-guide-to-substacks-moderation-tools)
- [Substack Content Moderation Approach - TechCrunch](https://techcrunch.com/2020/12/22/substack-explains-its-hands-off-approach-to-content-moderation/)
- [Google Design: Tuning Out Toxic Comments with AI](https://medium.com/google-design/tuning-out-toxic-comments-with-the-help-of-ai-85d0f92414db)

### Intersectional Harassment
- [Online and Abused: Girls of Color Facing Racialized Sexual Harassment](https://journals.sagepub.com/doi/full/10.1177/20563051241302153)
- [Experiences of Harm, Healing, and Joy among Black Women on Social Media](https://dl.acm.org/doi/fullHtml/10.1145/3491102.3517608)
- [Women Are Facing Growing Online Abuse - Newsweek](https://www.newsweek.com/women-online-abuse-rising-study-trump-administration-ai-11624655)
