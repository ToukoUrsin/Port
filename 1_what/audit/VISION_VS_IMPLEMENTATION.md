# Vision vs. Implementation Audit
# Date: 2026-03-07 UTC+3

How much of the vision is actually built? This report maps every major concept from the vision documents (VISION.md, DEEP_SYNTHESIS.md, QUALITY_PROBLEM.md, and the archive/vision + archive/product specs) against what exists in the codebase today.

---

## SCORING KEY

- **BUILT** — implemented and functional in the codebase
- **PARTIAL** — structure exists but incomplete or stub-only
- **DESIGNED** — spec exists in docs, not in code
- **MISSING** — mentioned in vision, no spec and no code

---

## 1. CORE PIPELINE (Record -> Transcribe -> Generate -> Review -> Publish)

| Step | Vision | Implementation | Status |
|------|--------|---------------|--------|
| Audio recording | Mobile web recorder | Frontend PostPage has audio recording UI | **BUILT** |
| Photo upload | Camera/gallery upload | Frontend PostPage has photo upload, backend File model stores them | **BUILT** |
| Text notes | Free text input | `Submission.Description` field, used in pipeline | **BUILT** |
| Transcription | ElevenLabs STT | `TranscriptionService` interface exists; `StubTranscriptionService` returns dummy text; `ElevenLabsTranscriptionService` exists in `transcription.go` | **BUILT** |
| Photo description | AI describes photos for context | `PhotoDescriptionService` with Gemini vision implementation | **BUILT** |
| Article generation | AI structures raw input into article | `GenerationService` interface + `GeminiGenerationService` with full prompt in `generation_system.txt` | **BUILT** |
| Quality review | 6-dimension AI review | `ReviewService` interface + `GeminiReviewService` with full prompt in `review_system.txt` | **BUILT** |
| SSE pipeline | Real-time status events during processing | `PipelineService.Run()` sends events over channel, handler streams SSE | **BUILT** |
| Refinement loop | Contributor refines, re-generates, re-reviews | Pipeline supports `StatusRefining`, reuses transcript, accepts `PreviousArticle` + `Direction` | **BUILT** |
| Publishing | One-click publish | `PublishButton` component, handler sets `StatusPublished` | **BUILT** |

**Verdict: The core pipeline is fully implemented.** This is the strongest area.

---

## 2. THE 6-DIMENSION QUALITY ENGINE

| Dimension | Vision (DEEP_SYNTHESIS) | Review Prompt | Model Struct | Frontend Display | Status |
|-----------|------------------------|---------------|-------------|-----------------|--------|
| Evidence | Factual accuracy, quote verification, source checking | Full checklist in Phase 1 (VERIFY) + Phase 2 scoring | `QualityScores.Evidence` + `VerificationEntry` | Not directly displayed to reader | **BUILT** |
| Perspectives | Stakeholder voices covered/missing | Scored in Phase 2, yellow-flagged when single-source | `QualityScores.Perspectives` | Coaching suggestions reference it | **BUILT** |
| Representation | Speaking WITH vs ABOUT communities | Scored in Phase 2, can escalate to RED | `QualityScores.Representation` | Via coaching/flags | **BUILT** |
| Ethical Framing | Consent, privacy, sensationalism | Scored in Phase 2, can escalate to RED (minors, private info) | `QualityScores.EthicalFraming` | Via coaching/flags | **BUILT** |
| Cultural Context | Sensitivity, terminology, attribution | Scored in Phase 2 | `QualityScores.CulturalContext` | Via coaching | **BUILT** |
| Manipulation | Advertising, campaign material, misleading framing | Scored in Phase 2, can escalate to RED | `QualityScores.Manipulation` | Via coaching/flags | **BUILT** |

**Verdict: All 6 dimensions are in the review prompt, model structs, and returned to frontend.** However, the reader-facing display is minimal — the ArticlePage shows a gate badge ("Verified" / "Review notes" / "Needs changes") but NOT the individual dimension scores or bars. The contributor sees coaching but not a score dashboard.

### What's missing from the quality engine:

| Feature | Source Doc | Status |
|---------|-----------|--------|
| Overall numeric score (e.g., 72/100) visible to reader | DEEP_SYNTHESIS, PRODUCT.md | **MISSING** — scores exist in data but are not displayed anywhere as a composite number |
| Per-dimension score bars (progress bars like "Evidence: 7/10") | PRODUCT_SPEC.md (archive), DEEP_SYNTHESIS | **MISSING** — `QualityScores` has 0.0-1.0 per dimension but no UI renders them as bars |
| Quality score on article cards (homepage, feed) | DEEP_SYNTHESIS ("quality scores visible"), PRODUCT.md | **MISSING** — article cards show title, author, category, time but no quality indicator |
| Verification entries shown to reader | QUALITY_PROBLEM.md ("source transparency") | **MISSING** — `VerificationEntry[]` is returned by review but never displayed to the reader |

---

## 3. THE THREE-TIER GATE SYSTEM (GREEN / YELLOW / RED)

| Feature | Vision (QUALITY_PROBLEM.md) | Implementation | Status |
|---------|---------------------------|----------------|--------|
| Gate classification | Deterministic from triggers | Review prompt has full evidence-severity matrix; returns `gate` field | **BUILT** |
| GREEN = publish freely | ~90% of articles | `PublishButton` enabled when gate != RED | **BUILT** |
| YELLOW = publish with advisory | Coaching visible, quality score public | `CoachingPanel` shows yellow flags; `GateBadge` shows "Suggestions available" | **BUILT** |
| RED = cannot publish as-is | Publish button disabled, specific fixes shown | `PublishButton` disabled on RED; `CoachingPanel` shows red triggers with fix options | **BUILT** |
| RED triggers are specific + actionable | Points to exact sentence, gives 2-3 fix options | `RedTrigger` struct: dimension, trigger type, paragraph, sentence, fix_options | **BUILT** |
| RED triggers highlighted in article text | Click to see the problem in context | `ArticlePreview` receives `redTriggers`, renders annotations with click-to-reveal suggestion cards | **BUILT** |
| "I think this is wrong" appeal | Escalate to human review | `CoachingPanel` has appeal button; frontend has `onAppeal` handler; `StatusAppealed` exists in constants | **BUILT** |
| Human reviewer override | Community editor/moderator can override RED | Editor role + permissions exist in auth system; no dedicated appeal review UI | **PARTIAL** |
| Evidence-severity matrix | Low/Med/High claim severity x evidence strength | Fully encoded in review prompt (Phase 3) | **BUILT** |
| Proportionality principle | Evidence bar scales with claim severity | Review prompt: "Is the evidence proportional to claim severity?" | **BUILT** |
| Hallucination detection | AI checks article against transcript for invented details | Phase 1 VERIFY: POSSIBLE_HALLUCINATION and FABRICATED_QUOTE statuses | **BUILT** |
| Google Search verification | Web-verify key claims | `GeminiReviewService` enables `GoogleSearch` tool; review prompt instructs "web-verified: [source]" | **BUILT** |
| Web sources returned to contributor | Show what the review checked against | `WebSource` struct; `CoachingPanel` renders web sources list | **BUILT** |

**Verdict: The gate system is the best-implemented part of the vision.** Nearly everything from QUALITY_PROBLEM.md is in the code. The main gap is the human reviewer UI for processing appeals.

---

## 4. THE COACHING LAYER

| Feature | Vision | Implementation | Status |
|---------|--------|---------------|--------|
| Celebration first | "The quote from Korhonen really captures..." — always specific, always first | Review prompt Phase 4 enforces celebration first; `Coaching.Celebration` field; rendered first in `CoachingPanel` | **BUILT** |
| Curiosity-framed suggestions | "Do you remember how many people were there?" not "Missing attendance" | Review prompt has explicit vocabulary constraints + examples | **BUILT** |
| Max 2 suggestions | Avoid overwhelming | Review prompt: "At most 2 questions or suggestions" | **BUILT** |
| Banned words | Never say "racist, biased, harmful..." in coaching | Review prompt: explicit NEVER list + ALWAYS list | **BUILT** |
| Mirror principle for RED | "What's here" + "What's not here" structure | Review prompt has detailed mirror principle with examples | **BUILT** |
| Paragraph-linked suggestions | Click suggestion to highlight the relevant paragraph | `CoachingSuggestion` type has `paragraph_ref`; `handleSuggestionClick` scrolls and highlights | **BUILT** |
| Anti-censorship framing | Never feels like "you are bad" or censorship | Review prompt: "quality, not morality" framing + mirror principle | **BUILT** |

**Verdict: Coaching is fully implemented.** The anti-censorship design from archive/product/ANTI_CENSORSHIP.md is deeply embedded in the review prompt's vocabulary constraints and framing rules.

---

## 5. THE GENERATION LAYER

| Feature | Vision | Implementation | Status |
|---------|--------|---------------|--------|
| Multiple article structures | News report, feature, hourglass, photo essay, brief, narrative | Generation prompt has all 6 structures with selection criteria | **BUILT** |
| AP-style journalism conventions | Inverted pyramid, lead construction, quote attribution rules | Extremely detailed in generation prompt: LQTQ rhythm, lead types, banned words, AP conventions | **BUILT** |
| Anti-hallucination constraints | Only use info from source material | Generation prompt Phase: explicit rules + "If you are unsure, leave it out" | **BUILT** |
| De-editorializing | Strip subjective judgments from contributor input | Generation prompt rule 4: extensive examples of editorializing -> factual transforms | **BUILT** |
| Editorial judgment on hostile input | Omit slurs/hostility, focus on reportable facts | Generation prompt: "Expressions of hostility... are not facts — omit them" | **BUILT** |
| Photo captions with AP convention | Present tense + context + attribution | Generation prompt rule 8: detailed caption guidelines | **BUILT** |
| Metadata output | Structure, category, confidence, missing context | `ArticleMetadata` struct with all fields; generation prompt outputs JSON | **BUILT** |
| Town context injection | Local knowledge for richer articles | `prompts.TownContext` embedded; `GenerationInput.TownContext` field | **BUILT** |

**Verdict: Generation is thoroughly implemented.** The generation prompt is arguably over-engineered for a hackathon — it reads like a journalism school textbook.

---

## 6. READER EXPERIENCE

| Feature | Vision (PRODUCT.md, DEEP_SYNTHESIS) | Implementation | Status |
|---------|--------------------------------------|---------------|--------|
| Town newspaper homepage | Article cards, categories, reverse chronological | `HomePage` with article cards, category filters | **BUILT** |
| Article page | Full article with photos, author attribution | `ArticlePage` with ReactMarkdown rendering, author link, image hero | **BUILT** |
| Category filters | Council, Schools, Business, Events, etc. | Tag bitmasks in models; category badges on articles | **BUILT** |
| Quality score badge on article | Reader sees quality indicator | Gate badge on ArticlePage ("Verified" / "Review notes") | **PARTIAL** — binary label, not numeric score |
| Quality score details (expandable) | Reader can see per-dimension breakdown | Not implemented — review data exists but no reader-facing quality UI | **MISSING** |
| "Source: Written from voice recording + photos by [Name]" | Source transparency | Contributor card shows author name; no "source method" indicator | **MISSING** |
| Comments/discussion | Moderated by AI | `Comments` component on ArticlePage; `createReply` API | **PARTIAL** — comments exist, no AI moderation |
| Similar stories | Semantic recommendations | `getSimilarArticles` API call on ArticlePage; renders similar story cards | **BUILT** |
| Semantic search | Embedding-based search | `SemanticGrouper` + `EmbeddingService` + `EmbedChunks` in pipeline; `/search` endpoint | **BUILT** |

**Verdict: Reader experience has the basics but lacks the quality transparency that's central to the vision.** The "quality score visible to reader" concept — called out in DEEP_SYNTHESIS ("quality scores visible"), PRODUCT.md ("Quality score is visible"), and QUALITY_PROBLEM.md ("Yellow-flagged articles publish with their quality score visible") — is the most significant implemented feature gap.

---

## 7. COVERAGE MAP

| Feature | Vision (DEEP_SYNTHESIS) | Implementation | Status |
|---------|------------------------|---------------|--------|
| Geographic map showing story locations | "Stories on a geographic map" | `ExplorePage` with Leaflet MapContainer, markers for articles | **BUILT** |
| Empty zones = representation gaps visible | "Seeing what's NOT covered prompts action" | Not implemented — map shows where stories are, but doesn't highlight empty areas | **MISSING** |
| Coverage gap prompts | "Two stories from the main hall. The mentoring room: zero coverage" | Not implemented | **MISSING** |

**Verdict: Map exists as an explore tool. The "gap visibility" concept (the key insight from DEEP_SYNTHESIS's demo script) is not implemented.**

---

## 8. CONTRIBUTOR EXPERIENCE BEYOND CORE PIPELINE

| Feature | Vision | Implementation | Status |
|---------|--------|---------------|--------|
| Profile page | Show contributor's articles, stats | `ProfilePage` exists with article list | **BUILT** |
| Draft management | List of in-progress submissions | Profile shows draft status labels | **BUILT** |
| Version history | See how article evolved through refinement | `ArticleVersion[]` stored in `SubmissionMeta.Versions` | **PARTIAL** — data stored, no UI to browse versions |
| Read counts / engagement feedback | Do contributors see how many people read their article? | `Submission.Views` and `ShareCount` fields exist; no UI | **PARTIAL** — data tracked, not displayed |
| Contributor reputation / history | "20+ articles = review privileges" | No contributor score, no earned privileges | **MISSING** |
| Quality improvement over time | "Your average score went from 67 to 74" | No per-contributor quality tracking | **MISSING** |

---

## 9. CONCEPTS FROM ARCHIVE VISION THAT MIGRATED (OR DIDN'T)

The archive contains the original "Cultural Preflight" product — a content quality checker for any written content. The LNP pivot embedded that engine inside a local news platform. Here's what survived:

| Archive Concept | Where It Went | Status |
|----------------|--------------|--------|
| 6-dimension quality scoring | Became the review engine | **BUILT** — but dimensions renamed (Logic -> Evidence weight shifted; Stakeholders merged with Perspectives) |
| Sharecard (viral quality card) | Not carried over to LNP | **MISSING** — no share mechanism for quality results |
| Perspective map (force-directed graph) | Not carried over | **MISSING** — was the archive product's centerpiece |
| "Score any URL" / browser extension | Not relevant to LNP | **N/A** — different product |
| Anti-censorship design | Deeply embedded in review prompt | **BUILT** — vocabulary constraints, mirror principle, "map not rulebook" |
| Multi-model consensus | Not in current pipeline | **MISSING** — only Gemini, no cross-model verification |
| Corpus-backed perspective discovery | Not in current pipeline | **MISSING** — perspectives are LLM-generated, not empirically discovered from published discourse |
| Reproducibility (versioned prompts, hashed outputs) | Not implemented | **MISSING** — no version tracking of prompts or scores |
| Creator dashboard (quality trend over time) | Not implemented | **MISSING** |
| Newsroom coverage dashboard | Not implemented | **MISSING** — would be relevant for municipal subscribers |

---

## 10. GAPS IDENTIFIED IN PREVIOUS ANALYSIS (from the conversation)

| Gap | Relevance | Status in Codebase |
|-----|-----------|-------------------|
| **Reader trust infrastructure** | How readers come to trust AI-reviewed content | Gate badge exists but no expandable quality detail, no source transparency, no editorial standards page |
| **Contributor retention** | Why come back for article #2, #5, #20? | Profile page exists; no engagement stats, no quality growth tracking |
| **Reader acquisition / distribution** | How does a town discover the newspaper? | No sharing mechanism, no social preview, no SEO features |
| **News vs. announcements distinction** | Different quality requirements for different content types | Generation prompt handles multiple structures; review prompt applies proportional evidence bars. **PARTIAL** — the gate handles severity proportionally but there's no explicit content-type routing |
| **Identity/safety in small communities** | Anonymous/pseudonymous contribution | No anonymous posting option; `OwnerID` is required; PRODUCT.md mentions "By [Name] or anonymous" but not implemented |
| **Legal liability** | Who's liable for AI-shaped content? | No legal framework, no terms of service, no content policy page |
| **Editorial independence** | If municipalities pay, can critical stories still publish? | No structural separation; ad system spec exists in `AD_SPEC.md` but not implemented |
| **Photo/media consent** | GDPR implications of publishing identifiable photos | Not addressed in code or prompts |
| **Correction/retraction process** | What happens when a published article is wrong? | No correction mechanism. `EditHistory` field exists but no correction workflow |
| **Post-publication moderation** | Community flagging, pattern detection across submissions | `Flagged` + `FlagReason` fields exist in `SubmissionMeta` but no flagging UI or workflow |
| **Organizational structure** | Who owns this? VC, nonprofit, cooperative? | Not addressed (appropriate for hackathon stage) |

---

## SUMMARY SCORECARD

| Area | Coverage |
|------|---------|
| Core pipeline (record -> publish) | 95% |
| 6-dimension quality engine | 90% (engine complete, display incomplete) |
| Gate system (GREEN/YELLOW/RED) | 95% (missing human reviewer UI) |
| Coaching layer | 100% |
| Generation quality | 100% |
| Anti-hallucination | 95% |
| Reader quality transparency | 20% (gate badge only, no scores/bars/details) |
| Coverage map intelligence | 30% (map exists, gap analysis missing) |
| Contributor feedback loop | 30% (profile exists, no engagement/quality stats) |
| Post-publication moderation | 10% (data fields exist, no workflow) |
| Anonymous contribution | 0% |
| Correction/retraction | 0% |
| Shareability / viral mechanics | 0% |

---

## TOP 5 GAPS TO CLOSE (ranked by demo impact + user trust)

1. **Reader-facing quality display** — The engine produces rich quality data (6 scores, verification entries, web sources) but the reader sees only a one-word badge. Showing per-dimension bars on the article page would be the single most impactful feature for the demo AND for trust. The data is already there; this is pure frontend work.

2. **Overall quality score** — DEEP_SYNTHESIS's demo script hinges on "Score: 64/100... re-generates... 64 -> 81. Flag clears." There is no composite score calculated or displayed anywhere. Trivial to compute from the 6 dimension scores.

3. **Coverage map gap visualization** — The Leaflet map shows article markers but doesn't show what's missing. The demo script says "Two stories from the main hall. The mentoring room: zero coverage." Highlighting empty areas is what makes the map a journalism tool rather than just a pin board.

4. **Anonymous/pseudonymous contribution** — PRODUCT.md says "By [Name] or anonymous" but there's no way to post anonymously. For a hackathon demo this is fine, but for any real deployment it's critical for accountability journalism (the highest-value use case).

5. **Post-publication community flagging** — The `Flagged` field exists but there's no reader-facing flag button. QUALITY_PROBLEM.md calls this the "second layer" for catching what AI misses. Even a simple "Report this article" button would demonstrate awareness of the problem.

---

## WHAT THE ARCHIVE VISION GOT RIGHT (AND THE LNP INHERITED)

The original Preflight product was a general-purpose content quality tool. When it pivoted to be the engine inside a local news platform, several architectural decisions proved prescient:

- **Measurement, not arbitration** (THE_FULL_PRODUCT.md) — The review system shows what's present and absent, never says "you should." This survived intact in the review prompt's mirror principle.
- **Anti-censorship as hard constraint** (ANTI_CENSORSHIP.md) — The vocabulary constraints ("never say biased, harmful, offensive") are embedded verbatim in the review prompt. This is the most direct carry-over from archive to implementation.
- **Proportional response** (QUALITY_PROBLEM.md) — The evidence-severity matrix, which maps claim gravity to evidence requirements, is the most sophisticated part of the system. Bakery reviews pass freely; criminal accusations require sources. This is fully implemented.
- **Coaching > policing** — The shift from "you can't publish this" to "this would be stronger with..." is in the prompt and in the UI (celebration first, curiosity-framed suggestions).

## WHAT THE ARCHIVE VISION GOT WRONG (OR ISN'T RELEVANT TO LNP)

- **Corpus-backed perspectives** — The archive envisioned empirically discovering perspectives from 50K+ published articles. The LNP uses LLM judgment instead. For local news this is arguably correct — there's no corpus of Kirkkonummi council reporting to analyze.
- **Multi-model consensus** — Filtering flags through 3+ independent models was a core reliability mechanism. The LNP uses single-model (Gemini). For a hackathon, fine. For production, the archive's instinct was right.
- **The sharecard / viral loops** — The weapon/mirror/competition loops were designed for a B2C content tool. They don't translate to a local news platform where the goal is community trust, not virality.
- **"FICO for content quality" / infrastructure standard** — The archive vision's endgame was becoming the industry standard for content quality metadata. The LNP is a specific product, not infrastructure. The standard ambition is premature.
