# GSSC 2026 -- Indigenous Digital Data Sovereignty
## Startup Ideation Research Report
### Theme: "Next Generation of Culture & Media: Empowering Connection & Truth"
### Competition: May 17--21, Seoul | Grading: Technical Feasibility (10p), Market Potential & Scalability (10p), Team Dynamics (5p), Risk Evaluation (5p)

---

# PART 1: LANDSCAPE ANALYSIS

## 1.1 The Problem: Algorithmic Colonialism at Scale

Indigenous peoples worldwide face a new form of extraction. After centuries of land, labor, and resource extraction, the frontier has moved to **data**. AI companies scrape indigenous cultural materials -- languages, art, recordings, traditional knowledge -- from the open internet and train commercial models without consent, compensation, or quality assurance.

**Key statistics:**
- **476 million** indigenous people globally across **90 countries**, representing **~5,000 cultures**
- **4,000+** of the world's ~7,000 languages are indigenous; **40% are endangered**
- One indigenous language dies **every two weeks**
- The global AI training dataset market: **$3.2 billion (2025)**, projected **$16.3 billion by 2033** (CAGR 22.6%)
- Indigenous communities receive **$0** from this market

**What is happening right now:**
- LLMs trained on Sami corpus data produce text that *appears* authentic but is **gibberish** -- there are no quality-assurance licenses in place
- AI-generated "how-to" books for learning Abenaki appeared on Amazon in December 2024 with **incorrect translations and non-Abenaki words**
- Google Images of Maori cultural artifacts (pou whakairo, mere, tewhatewha) were taken by third parties and **sold as NFTs on OpenSea**
- Images of Maori ancestors were manipulated -- faces placed on other bodies, moko patterns added to wrong people
- In Kenya, the State Department of Culture used **AI-generated images** to represent Maasai culture, resulting in stereotypical misrepresentation
- In Australia, **80% of souvenirs** sold as Aboriginal art are inauthentic imports -- a **$54 million/year** theft from a $80M market
- The Standing Rock Sioux tribe sued the Lakota Language Consortium in October 2024 for exploiting language recordings made by tribal elders on tribal land
- Meta, Microsoft, and Nvidia extracted **15.8 million YouTube videos** from 2M+ channels without consent for AI training

## 1.2 Existing Solutions and Their Gaps

### Frameworks (Policy, not Product)

| Solution | What It Does | Gap |
|----------|-------------|-----|
| **CARE Principles** (2018) | Collective Benefit, Authority to Control, Responsibility, Ethics -- guidelines for indigenous data governance | No enforcement mechanism; voluntary; no technology layer |
| **UNDRIP Article 31** | Affirms indigenous rights to control cultural heritage and traditional knowledge | International law with no digital enforcement |
| **WIPO Treaty (May 2024)** | Patent applicants must disclose genetic resource / TK origins | Only 1 ratification (Malawi); narrow scope (patents only); years from force |
| **EU AI Act** | Prohibits some scraping; requires transparency on training data | Does not specifically address indigenous collective rights |

### Platforms (Partial Solutions)

| Solution | What It Does | Gap |
|----------|-------------|-----|
| **Local Contexts (TK/BC Labels)** | Communities create metadata labels for cultural materials indicating protocols | Labels are advisory, not enforceable; no automated detection of violations; no revenue flow; no API integration with AI companies |
| **Nuohtti** | Search portal for 30,000 Sami archival documents from 32 European archives | Access portal only -- no consent management, no licensing, no AI-training controls |
| **Te Pa Tuwatawata** (NZ) | Maori-designed distributed data storage on marae locations | Infrastructure only; NZ-specific; no licensing marketplace; went live early 2025 |
| **IndigiLedger** (AU) | Blockchain authentication for Aboriginal art/souvenirs | Physical art focus; no digital/AI dimension; seeking further investment |
| **Te Hiku Media / Papa Reo** | Maori language model with community-controlled licensing | Single-language; single-community; no marketplace infrastructure |
| **FLAIR (Mila)** | Building speech recognition for endangered languages | Research project, not a product; no sovereignty infrastructure |
| **Divvun/Giellatekno** | Sami language tools (keyboards, spell checkers) | 20+ years of work; tools only; no AI governance layer |
| **Creative Commons IK Licenses** | Open licenses with indigenous protocols | Still in development; CC was not designed for collective ownership |

### The Critical Gap: No Unified Platform Exists That...

1. Gives indigenous communities **collective control** over how their cultural data enters AI systems
2. Creates a **machine-readable consent layer** that AI companies can integrate
3. Generates **revenue back to communities** when their data is used
4. **Detects unauthorized use** of indigenous cultural materials in AI outputs
5. Works **globally** across the 5,000+ indigenous cultures while respecting each one's unique governance

---

# PART 2: THE STARTUP IDEA

## Name: **KODA** (from Sami "koda" meaning "to give/gift" -- data as a gift that must be reciprocated)

### One-liner:
**"The indigenous-controlled data trust that lets communities license their cultural data to AI companies on their own terms -- or block it entirely."**

---

## 2.1 Product Description

KODA is a **Cultural Data Trust Platform** that sits between indigenous communities and AI companies. It combines:

1. **Community Governance Dashboard** -- where indigenous communities collectively decide what cultural data (language corpora, art, recordings, traditional knowledge) can be used, by whom, for what purpose, and at what price
2. **Machine-Readable Consent Protocol (KODA Protocol)** -- an open standard (like robots.txt but for cultural data) that AI companies can integrate into their training pipelines to respect indigenous data governance decisions
3. **Cultural Data Licensing Marketplace** -- where AI companies can legally license vetted, high-quality indigenous cultural datasets with community-set terms and revenue sharing
4. **Sentinel: AI Output Monitor** -- a detection system that identifies when AI models generate content derived from indigenous cultural materials (language, art styles, patterns, sacred imagery) without authorization

### How These Work Together:

```
[Indigenous Community]
        |
        v
[KODA Governance Dashboard] -- Community votes on data policies
        |                        using collective governance
        v
[KODA Protocol] -----------> Published as machine-readable file
        |                    AI companies read this before scraping
        |
        v
[Licensing Marketplace] ----> AI companies pay for vetted,
        |                     high-quality datasets
        |
        v
[Sentinel Monitor] ---------> Scans AI outputs for unauthorized
        |                      use of cultural materials
        v
[Revenue / Enforcement] ----> Money flows to community trust;
                               violations trigger alerts + legal action
```

---

## 2.2 The Exact User

**Primary User: Indigenous Cultural Authority / Data Governance Committee**

- A designated group within an indigenous community (e.g., Sami Parliament's cultural board, a Maori iwi data committee, an Aboriginal art center, a tribal council's language department)
- They already exist -- the Sami Parliament has formal consent procedures; Te Mana Raraunga governs Maori data; many tribal nations have cultural committees
- These groups currently have **no technical tools** to enforce their governance decisions in the digital/AI world

**Secondary User: AI Companies / Researchers**

- Companies like OpenAI, Meta, Google, Anthropic need high-quality, ethically-sourced training data
- Researchers working on language revitalization, ethnography, cultural studies
- They face growing legal and reputational risk from using indigenous data without consent

**Tertiary User: Cultural Institutions**

- Museums, archives, universities holding indigenous collections (like the 32 archives in Nuohtti)
- They need a way to respect indigenous data governance when digitizing collections

---

## 2.3 The Specific Pain Point

**For indigenous communities:**
"We spent 20 years building digital tools for our language. AI companies scraped our work and now produce gibberish in our language -- misrepresenting us while profiting from our cultural labor. We have governance rules but no way to enforce them digitally."

**For AI companies:**
"We need diverse, high-quality training data to improve our models. We cannot find legally clear, community-authorized indigenous language/cultural datasets. Using publicly scraped data exposes us to lawsuits (like Standing Rock v. Lakota Language Consortium) and reputation damage."

**The collision:**
There is a $16B+ market for AI training data by 2033. Indigenous communities have unique, high-value cultural datasets. But there is NO marketplace, NO consent infrastructure, and NO revenue mechanism connecting them. The data either gets stolen or stays locked away.

---

## 2.4 Technical Implementation

### Architecture

**Layer 1: KODA Protocol (Open Standard)**

```
Format: JSON-LD / Schema.org extension
Hosted: Community's domain (like robots.txt)
```

A `.koda.json` file that communities host on their digital properties, declaring:
- Which cultural data categories exist (language, art, music, TK, etc.)
- Governance model (who decides: council vote, elder approval, etc.)
- Permitted uses (research yes/no, commercial AI training yes/no, generative output yes/no)
- Required terms (attribution, revenue share %, benefit-sharing, review rights)
- Prohibited uses (sacred materials exclusion, no derivative generation of ceremonial content)
- Contact endpoint for licensing requests

This is like Creative Commons but designed for **collective rights** and **machine-readable AI training pipeline integration**.

**Layer 2: Governance Dashboard (Web App)**

- Built with React/TypeScript frontend, Convex backend for real-time sync
- Role-based access: Elders, Cultural Committee, Community Members, External Researchers
- Proposal/voting system for data governance decisions (inspired by DAO governance but NOT requiring crypto)
- Integrates with Local Contexts TK/BC Labels (via their API) as the tagging layer
- Multi-language interface (Sami, Maori, English, etc.)
- Audit log of all governance decisions (immutable, optionally on-chain)

**Layer 3: Licensing Marketplace**

- Communities list datasets with KODA Protocol terms attached
- AI companies browse, request access, negotiate terms
- Smart contracts (or traditional legal contracts) manage:
  - Revenue distribution to community trust
  - Usage tracking and compliance
  - Automatic expiration / renewal
  - Quality assurance requirements (community reviewers validate AI outputs)
- Escrow for payments; revenue splits configurable per community governance

**Layer 4: Sentinel Monitor**

- Uses content fingerprinting and watermarking for images/art
- Linguistic analysis for language detection (is this AI output using Sami linguistic structures?)
- Pattern matching for traditional designs / motifs
- Monitors major AI model outputs (via API access to generated content)
- Community-trained classifiers for culture-specific detection
- Alert system when unauthorized use detected
- Evidence packaging for legal action

### Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Protocol Standard | JSON-LD + Schema.org | Web standard; machine-readable; indexable |
| Frontend | React + TypeScript + Tailwind | Modern, accessible, component-based |
| Backend | Convex (real-time) | Real-time voting/governance; managed infrastructure |
| Auth | Convex Auth + OAuth | Community member identity management |
| Consent Records | PostgreSQL + optional blockchain anchoring | Immutable audit trail; blockchain optional not mandatory |
| Marketplace | Stripe Connect | Multi-party payments to community trusts |
| Sentinel | Python ML pipeline (fingerprinting, NLP) | Content detection and monitoring |
| Labels Integration | Local Contexts Hub API | Leverage existing TK/BC label ecosystem |
| Hosting | Vercel (frontend) + Convex Cloud (backend) | Global CDN; low-latency worldwide |

---

## 2.5 Hackathon Prototype (48-72 hours)

**Scope: "KODA Protocol Generator + Governance MVP"**

Build the minimum slice that demonstrates the full vision:

### Day 1: KODA Protocol Generator
- Web form where a community representative defines their data governance rules
- Generates a `.koda.json` file with machine-readable terms
- Visual display showing what AI companies would see when they encounter this protocol
- Demo: "Here is what happens when an AI training pipeline encounters a KODA-protected dataset vs. an unprotected one"

### Day 2: Governance Dashboard MVP
- Simple proposal/vote interface (3 roles: Elder, Committee, Member)
- Create a proposal: "Should we license our language corpus to Company X for research only?"
- Voting with quorum rules
- Once approved, automatically updates the KODA Protocol terms
- Real-time sync so all community members see changes immediately

### Day 3: Sentinel Demo
- Pre-trained classifier that can distinguish authentic Sami text from AI-generated "gibberish Sami"
- Feed it examples from existing LLM outputs vs. verified Sami corpus
- Live demo: paste AI-generated text, system flags it as unauthorized/low-quality
- Show the alert flow: detection -> community notification -> evidence package

### Demo Data:
- Use publicly available Sami language samples from Divvun/Giellatekno
- Use publicly documented cases (Abenaki Amazon books, Maori NFTs) as "violation" examples
- Mock governance votes with 3-5 team members playing different community roles

### Pitch Demo Flow (4 minutes):
1. (30s) Show a real AI-generated "Sami" text that is gibberish -- this is the problem
2. (60s) Show KODA Protocol: the community's digital sovereignty declaration, machine-readable
3. (60s) Show Governance Dashboard: elder proposes a policy, committee votes, protocol updates in real-time
4. (45s) Show Licensing Marketplace mockup: an AI company requests access, terms are set, revenue flows
5. (30s) Show Sentinel catching the gibberish text and flagging the violation
6. (15s) "476 million people. 5,000 cultures. Zero infrastructure for AI-age data sovereignty. Until KODA."

---

## 2.6 Revenue Model

### Phase 1: Platform Transaction Fees (Year 1-2)
- **8-12% transaction fee** on all licensing deals through the marketplace
- AI companies pay communities directly; KODA takes a platform cut
- Similar to Defined.ai / data marketplace models
- Target: 20 communities, 50 licensing deals in Year 1 = modest revenue while proving model

### Phase 2: Enterprise SaaS (Year 2-3)
- **AI Company Compliance Subscription**: $2,000-10,000/month
  - KODA Protocol integration toolkit
  - Dashboard showing compliance status across all indigenous datasets
  - Automated consent verification in training pipelines
  - "KODA Certified" badge for ethical AI training
- Target customers: OpenAI, Anthropic, Google, Meta, Stability AI, Cohere, etc.
- As regulations tighten (EU AI Act, WIPO Treaty), this becomes a **compliance necessity**

### Phase 3: Sentinel Monitoring-as-a-Service (Year 2+)
- Communities pay $0 (subsidized by AI company fees)
- AI companies pay for "clean bill of health" monitoring reports
- Cultural institutions pay for collection compliance audits
- Insurance companies pay for risk assessment data

### Phase 4: Protocol Licensing / Standards Body (Year 3+)
- KODA Protocol becomes an industry standard (like HTTPS or robots.txt)
- Certification revenue: companies pay to be "KODA Protocol Compliant"
- Training and consulting for implementation
- Government contracts for regulatory compliance tools

### Revenue Projection (Conservative):
| Year | Revenue Stream | Estimate |
|------|---------------|----------|
| Y1 | Marketplace fees (20 communities x 50 deals) | $50K-150K |
| Y2 | + Enterprise SaaS (10 AI companies) | $500K-1.5M |
| Y3 | + Sentinel + Certification + Expansion | $2M-5M |
| Y5 | Full platform at scale | $10M-25M |

---

## 2.7 Global Scalability Argument

### "This is not a niche market" -- The Numbers

**Direct beneficiaries:**
- 476 million indigenous people in 90 countries
- 5,000+ distinct cultures with unique data governance needs
- 4,000+ languages that AI companies need but cannot ethically access today

**By region:**
| Region | Indigenous Population | Key Communities |
|--------|---------------------|-----------------|
| Asia | ~260 million (70%) | Ainu (Japan), Adivasi (India), Hmong, Orang Asli |
| Africa | ~50 million | Maasai, San, Amazigh, Tuareg, Pygmy peoples |
| Americas | ~55 million | First Nations, Tribal Nations (574 in US alone), Quechua, Guarani, Maya |
| Oceania | ~3 million | Maori, Aboriginal Australians, Torres Strait Islanders, Pacific Islanders |
| Arctic/Europe | ~2 million | Sami, Inuit, Nenets, Evenki |

**Adjacent markets where KODA applies:**
1. **Minority language communities** (not indigenous but underrepresented): Basque, Catalan, Welsh, Breton -- extends to hundreds of millions more speakers
2. **Cultural institutions**: 95,000+ museums worldwide, thousands holding indigenous collections
3. **AI training data compliance**: Every AI company on earth will need this as regulation expands -- the EU AI Act alone covers a $50B+ AI market in Europe
4. **Authentic cultural merchandise**: The Australian inauthentic art problem alone is $54M/year; globally this is a multi-billion-dollar issue

**The TAM calculation:**
- AI training dataset market: $16.3B by 2033
- Indigenous/minority language data as a segment: conservatively 2-5% = **$326M-$815M**
- Cultural data licensing (art, TK, recordings): additional **$500M-$1B** opportunity
- Compliance/certification market: **$200M-$500M** as regulation matures
- **Total addressable market: $1B-$2.3B by 2033**

### Why "Niche" Becomes "Essential":

1. **Regulatory tailwinds**: EU AI Act transparency requirements, WIPO Treaty disclosure mandates, and the UN Decade of Indigenous Languages (2022-2032) all create compliance demand
2. **Quality premium**: Indigenous language data, when properly curated and consented, is MORE valuable than scraped data because it is verified, contextual, and legally clean
3. **Reputational risk**: One "Standing Rock v. Lakota Language Consortium" case against an AI company would cost more than years of KODA licensing fees
4. **Template for all collective data rights**: The governance model KODA builds for indigenous communities is the same model needed for any community asserting collective data rights (labor unions, patient groups, creator collectives) -- this is the future of data governance

---

## 2.8 The 4-Minute Pitch "Aha Moment"

### Setup (45 seconds):
*"Let me show you something. This is text that ChatGPT generated when asked to write in Northern Sami."*

[Show the gibberish output on screen]

*"This looks like Sami. It is not. It is nonsense -- generated by an AI trained on scraped Sami data without consent. For 20 years, Sami technologists built keyboards, spell checkers, dictionaries for their language. AI companies took that work and produced this."*

### The Aha Moment (30 seconds):
*"Now here's the thing that changes everything."*

[Show a split screen: LEFT = AI company's training pipeline. RIGHT = the KODA Protocol file.]

*"What if every indigenous community had a machine-readable sovereignty declaration -- like robots.txt but for cultural data -- that AI companies' training pipelines automatically respected? Not a suggestion. Not a label. An enforceable, revenue-generating protocol."*

### Product Demo (120 seconds):
[Walk through the three layers: Protocol, Governance, Marketplace, Sentinel]

### Market Punch (45 seconds):
*"476 million indigenous people. 5,000 cultures. A $16 billion AI training data market where they receive zero dollars. We are not building for a niche -- we are building the infrastructure for the most important missing piece in AI ethics: collective data sovereignty. The Sami are our first community. The Maori, Aboriginal Australians, and Lakota are next. The protocol is universal."*

---

## 2.9 Risk Evaluation

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Community trust** -- indigenous communities are rightly skeptical of tech solutions built by outsiders | HIGH | Co-design with Sami technologists from Day 1; indigenous-majority advisory board; community owns their data at all times; open-source protocol |
| **AI company adoption** -- companies may ignore the protocol | MEDIUM | Regulatory pressure (EU AI Act); reputational risk; "carrot" of high-quality licensed data; industry coalition building |
| **Technical -- Sentinel accuracy** | MEDIUM | Start with well-documented languages (Sami, Maori); use community validators; focus on high-confidence detections |
| **Legal enforceability** | MEDIUM | KODA Protocol creates contractual terms (like Terms of Service); WIPO Treaty creates disclosure obligations; partner with indigenous legal organizations |
| **Governance complexity** -- every community governs differently | MEDIUM | Modular governance templates; community customizes their own rules; no one-size-fits-all |
| **Revenue timeline** -- marketplace takes time to build liquidity | LOW-MED | Start with grant funding (NSF, Ford Foundation, EU programs); bridge to commercial revenue |
| **Competition** | LOW | No integrated solution exists; Local Contexts is complementary (labels, not licensing); IndigiLedger is physical art only; Te Pa Tuwatawata is infrastructure only |

---

## 2.10 Competitive Differentiation

| Feature | KODA | Local Contexts | Te Pa Tuwatawata | IndigiLedger |
|---------|------|---------------|------------------|--------------|
| Machine-readable AI consent protocol | YES | No | No | No |
| Licensing marketplace with revenue | YES | No | No | No |
| AI output monitoring (Sentinel) | YES | No | No | No |
| Collective governance tools | YES | Partial (labels) | No | No |
| Cross-community / global | YES | YES | NZ only | AU only |
| Integrates with existing labels | YES (uses TK/BC) | N/A | No | No |
| Revenue to communities | YES | No | No | Indirect |

### KODA does not replace these solutions -- it connects and extends them:
- Uses **Local Contexts TK/BC Labels** as the metadata layer
- Can integrate with **Te Pa Tuwatawata** as a storage backend for Maori communities
- Can integrate with **IndigiLedger** for physical art authentication
- Builds on **CARE Principles** as the governance philosophy
- Makes **WIPO Treaty** compliance practical with technology

---

# PART 3: IMPLEMENTATION ROADMAP

## Hackathon (Week 0): Prototype
- KODA Protocol generator + Governance MVP + Sentinel demo
- Use Sami language data as primary example

## Months 1-3: Validation
- Partner with Sami Parliament / Divvun team in Norway/Finland
- Co-design governance dashboard with 2-3 Sami cultural organizations
- Publish KODA Protocol spec as open standard RFC

## Months 4-6: Beta
- Onboard 5 indigenous communities (Sami, Maori, Aboriginal Australian, Lakota, Guarani)
- Launch beta marketplace with 3-5 AI company partners
- Deploy Sentinel for Sami and Maori language monitoring

## Months 7-12: Launch
- Public launch of KODA platform
- Enterprise SaaS for AI companies
- Present at WIPO, UN Permanent Forum on Indigenous Issues
- Apply for NSF, EU Horizon, Ford Foundation funding

## Year 2+: Scale
- 50+ communities globally
- Industry standard adoption of KODA Protocol
- Certification program revenue
- Expand to adjacent markets (minority languages, cultural institutions)

---

# APPENDIX: KEY EXPLOITATION CASES (For Pitch Deck)

1. **Sami AI Gibberish**: LLMs trained on Sami data without quality assurance produce fake-looking Sami text that damages language integrity
2. **Abenaki Amazon Books (Dec 2024)**: AI-generated language learning books with incorrect translations and non-Abenaki words sold on Amazon
3. **Maori NFT Theft**: Google Images of sacred cultural artifacts sold as NFTs on OpenSea; ancestor images manipulated with moko patterns
4. **Australian Fake Art ($54M/yr)**: 80% of Aboriginal-style souvenirs are inauthentic imports with no indigenous connection
5. **Standing Rock v. Lakota Language Consortium (Oct 2024)**: Tribe suing to regain recordings of elders' language work exploited by a company that then threatened the source family with lawsuits
6. **Kenya Maasai AI Images (2024)**: Government used AI-generated images to represent Maasai culture, resulting in stereotypical misrepresentation
7. **YouTube Scraping**: Meta, Microsoft, Nvidia extracted 15.8M videos from YouTube without consent for AI training -- indigenous content creators included

---

# APPENDIX: KEY SOURCES AND REFERENCES

## Frameworks and Principles
- CARE Principles for Indigenous Data Governance: https://www.gida-global.org/care
- CARE Principles Paper: https://datascience.codata.org/articles/dsj-2020-043
- UNDRIP Article 31: https://www.un.org/development/desa/indigenouspeoples/
- WIPO Treaty (2024): https://www.wipo.int/en/web/traditional-knowledge/wipo-treaty-on-ip-gr-and-associated-tk

## Existing Platforms
- Local Contexts (TK/BC Labels): https://localcontexts.org/
- Nuohtti (Sami Archives): https://nuohtti.com/
- Te Pa Tuwatawata: https://tepatuwatawata.io/
- IndigiLedger: LinkedIn article by Adam Robinson
- Te Hiku Media / Papa Reo: Referenced in Brookings article

## Research and Analysis
- Brookings - Small Language Models for Indigenous Languages: https://www.brookings.edu/articles/can-small-language-models-revitalize-indigenous-languages/
- Indigenous language technology in machine learning era: https://www.tandfonline.com/doi/full/10.1080/08003831.2024.2410124
- Sami research data governance: https://www.tandfonline.com/doi/full/10.1080/08003831.2024.2410110
- AI threatens Indigenous data sovereignty: https://policyoptions.irpp.org/2025/05/ai-indigenous-data/
- Cultural Survival - Indigenous Peoples and AI: https://www.culturalsurvival.org/news/indigenous-peoples-and-ai-defending-rights-shaping-future-technology
- Blockchain for Indigenous Data Sovereignty (UBC): https://blockchain.ubc.ca/research/data-sovereignty-indigenous-sovereignty
- Blockchain for Indigenous Genomic Data (Cell): https://www.cell.com/cell/fulltext/S0092-8674(22)00782-6

## Market Data
- AI Training Dataset Market ($3.2B in 2025, $16.3B by 2033): https://www.grandviewresearch.com/industry-analysis/ai-training-dataset-market
- Indigenous population (476M): https://www.worldbank.org/en/topic/indigenouspeoples
- Australian fake art market: https://www.aph.gov.au/Parliamentary_Business/Committees/House/Former_Committees/Indigenous_Affairs/The_growing_presence_of_inauthentic_Aboriginal_and_Torres_Strait_Islander_style_art_and_craft

## Exploitation Cases
- Maori NFTs: https://www.1news.co.nz/2022/03/18/concerns-raised-over-nfts-degrading-maori-culture/
- Standing Rock Lakota language lawsuit: https://ictnews.org/news/standing-rock-to-sue-to-gain-lakota-language-materials/
- Abenaki AI books: https://icmglt.org/can-a-i-help-revitalize-indigenous-languages/
- YouTube scraping (15.8M videos): https://seobotai.com/news/investigation-reveals-unauthorized-data-scraping-from-youtube-for-ai-training/

## Competition Context
- GSSC 2026: https://globalstudentstartup.org/
- Defined.ai (AI data marketplace, 65% revenue growth): https://defined.ai/
- AI content licensing landscape: https://digiday.com/media/this-startup-is-creating-an-ai-training-data-marketplace-to-help-creators-and-companies-buy-and-sell-licensed-content/
