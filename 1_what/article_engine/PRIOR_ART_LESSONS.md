# Prior Art Lessons: What to Steal, What to Avoid

Date: 2026-03-07 UTC+3

Actionable lessons extracted from LANDSCAPE.md, VOICE_TO_ARTICLE.md, JOURNALISM_CRAFT.md, and TOP_5_CHALLENGES.md. Each lesson names who proved it, what they proved, and ends with a concrete DO THIS.

---

## PIPELINE DESIGN

### Lesson 1: Multi-step chains beat single-shot generation

**WHO:** Published prompt engineering research (VOICE_TO_ARTICLE.md Section 4); Bloomberg and AP's template-based pipelines.

**WHAT:** Single-shot "write me an article" prompts produce generic, hallucination-prone blog posts. Bloomberg and AP both decompose the task: structured data extraction first, then template/narrative generation. Research confirms a 4-step chain (extract -> structure -> draft -> verify) produces fewer hallucinations and more consistent output than one-shot generation.

**DO THIS:** Build the pipeline as 4 separate LLM calls, not one:
1. **Extract** -- pull facts, quotes, names, dates, locations from transcript
2. **Structure** -- organize into inverted pyramid (or detect which structure fits)
3. **Draft** -- generate the article from structured extraction
4. **Verify** -- cross-check draft against original transcript for faithfulness

Each step has its own prompt. Each step's output is inspectable and debuggable. This is slower but the accuracy difference is not marginal -- it is the difference between publishable and dangerous.

---

### Lesson 2: Do NOT preprocess audio before Whisper

**WHO:** Whisper benchmarking research (VOICE_TO_ARTICLE.md Section 1).

**WHAT:** Denoising audio before feeding it to Whisper makes transcription WORSE: 25.83% WER on denoised vs. 8.82% on raw noisy audio. Denoising distorts spectral features Whisper was trained on.

**DO THIS:** Feed raw audio directly to Whisper. No denoising, no audio cleanup, no preprocessing. This is counterintuitive but empirically proven. Skip any "audio enhancement" step.

---

### Lesson 3: Source-label every input modality

**WHO:** Multimodal RAG research; faithfulness verification literature (VOICE_TO_ARTICLE.md Sections 5, 8).

**WHAT:** When combining transcript + photos + typed notes into one prompt, the model (and later verification) needs to trace every claim back to its origin. Without source labels, you cannot distinguish hallucination from legitimate information.

**DO THIS:** In the combined prompt, clearly tag each input:
```
[FROM TRANSCRIPT]: "About 50 people came to the event..."
[FROM PHOTO 1]: A crowd of people in a park, banner reads "Kaisaniemi Day"
[FROM TYPED NOTES]: "This was at Kaisaniemi park, the mayor was there"
```
Then require the draft to indicate which source supports each claim. This makes the verify step tractable.

---

## PROMPT TECHNIQUES

### Lesson 4: Role + structure specification + anti-patterns list

**WHO:** Prompt engineering research (VOICE_TO_ARTICLE.md Section 4); JOURNALISM_CRAFT.md entire document.

**WHAT:** "You are a local news journalist" produces better journalistic tone than generic prompts. Structured output specification (headline, lead, body, quotes, attribution) produces more consistent format. But the biggest win is telling the model what NOT to do -- because LLMs default to blog voice every time (TOP_5_CHALLENGES.md Challenge 1).

**DO THIS:** The draft prompt must include:
- Role: "You are a local news editor at a community newspaper"
- Structure spec: inverted pyramid with lead, nut graf, LQTQ rhythm
- Anti-pattern list from JOURNALISM_CRAFT.md Section 10: no first person, no question leads, no "On a beautiful Tuesday evening...", no editorializing adjectives, no stacked quotes without transitions, "said" as default attribution verb
- The cheat sheet from JOURNALISM_CRAFT.md Section 10 (the quick-reference block at the end) should be included verbatim or near-verbatim in the system prompt

This is not optional decoration. Without the anti-pattern list, ChatGPT/Claude drift to blog voice within a few articles.

---

### Lesson 5: Article type detection before drafting

**WHO:** JOURNALISM_CRAFT.md Sections 1, 2; Otter.ai's customizable summary templates.

**WHAT:** Different article types need different structures. Inverted pyramid for hard news, hourglass for dramatic events, diamond for features. Otter.ai's customizable templates (Team Meeting, Sales Call) demonstrate that detecting input type FIRST and then applying the right template outperforms one-size-fits-all.

**DO THIS:** Add a classification step between Extract and Structure:
- Classify the voice memo content: hard news event, meeting coverage, community event, human interest, announcement
- Select the appropriate structure template (inverted pyramid for most; hourglass for dramatic events; diamond for profiles/features)
- Rule of thumb to encode: under 500 words = inverted pyramid; 800+ words = consider hourglass or diamond

---

### Lesson 6: Constrain generation to prevent hallucination

**WHO:** Faithfulness verification research (VOICE_TO_ARTICLE.md Section 8); every production journalism AI system (Cleveland Plain Dealer, Chalkbeat, Midcoast Villager).

**WHAT:** LLMs add plausible but invented context -- dates, vote counts, organizational details, causation. The most dangerous hallucinations LOOK like specific facts ("voted 5-2 to approve a $4.2M budget" when no numbers were given). Grounding instructions in the prompt significantly reduce this.

**DO THIS:** Include this constraint verbatim in the draft prompt:
"Only include information that appears in the source material. Do not add background information, context, or details not mentioned by the contributor. If information is unclear or incomplete, say so explicitly rather than guessing. If a vote happened but no count was given, write 'the council voted' not 'the council voted 5-2'. Mark any gaps with [INFORMATION NOT PROVIDED]."

Also require the model to output a "confidence note" listing what information was NOT available (missing vote count, missing timeline, unnamed sources).

---

## QUOTE HANDLING

### Lesson 7: The Guardian's three-component decomposition

**WHO:** The Guardian (spaCy NER, 800+ annotated articles, 89% accuracy).

**WHAT:** Quotes decompose into three components: **source** (who said it), **cue** (the speech verb), and **content** (what was said). Training a model to extract all three separately, then reassemble, achieves 89% accuracy on written text. Key failure mode: quotation marks used for non-quote purposes (scare quotes).

**DO THIS:** In the Extract step, require the LLM to output quotes as structured objects:
```json
{
  "source": "Maria, from the school",
  "cue": "said",
  "content_direct": "the new playground is great",
  "content_paraphrase": "she's worried about the parking situation",
  "confidence": "medium — contributor paraphrased Maria's parking concern",
  "transcript_location": "timestamp or sentence reference"
}
```
This structured extraction is more reliable than asking the model to handle quotes inline during drafting. Extract first, then place in the article.

---

### Lesson 8: Conservative quote cleaning only

**WHO:** BBC Citron (fragile attribution system); JOURNALISM_CRAFT.md Section 4; VOICE_TO_ARTICLE.md Section 6.

**WHAT:** BBC Citron showed that automated quote attribution "falters" when sentences are structured differently or references are mixed. The journalism standard: you can remove filler words ("um," "uh," "like") without notation, but you CANNOT change meaning, make someone sound smarter, or alter substance. LLMs consistently over-clean quotes, making them more articulate than what was actually said.

**DO THIS:** The quote cleaning instruction must say: "Remove only filler words (um, uh, like, you know, niinku, tota, silleen). Remove false starts. Do NOT rephrase, do NOT improve grammar beyond removing fillers, do NOT make the quote more articulate. If in doubt, paraphrase instead of direct-quoting. Flag any quote where cleaning required judgment with [CLEANED - VERIFY AGAINST RECORDING]."

---

### Lesson 9: The LQTQ placement pattern

**WHO:** Professional journalism practice documented in JOURNALISM_CRAFT.md Section 4C.

**WHAT:** Quotes in professional articles follow a Lead-Quote-Transition-Quote rhythm. Never stack two quotes from different sources back-to-back. Include a direct quote every 3-4 paragraphs. For multi-sentence quotes, attribute after the first sentence, not at the end.

**DO THIS:** Encode LQTQ as a structural rule in the draft prompt. Specifically: "After placing a direct quote, write at least one transition paragraph of context or new information before the next direct quote from a different source. Attribute multi-sentence quotes after the first sentence: 'First sentence,' Source said. 'Second sentence.'"

---

## FAITHFULNESS / HALLUCINATION PREVENTION

### Lesson 10: Use MiniCheck for NLI-based entailment checking

**WHO:** MiniCheck research team; NLI-based faithfulness verification literature (VOICE_TO_ARTICLE.md Section 8).

**WHAT:** The most established automated faithfulness check: break the generated article into atomic claims, then check each claim against the source transcript using a Natural Language Inference model. MiniCheck is specifically designed for fact-checking LLM output against grounding documents. If a claim is classified as "not entailed" by the source, flag it.

**DO THIS:** After the Draft step, add a Verify step that:
1. Extracts every factual claim from the generated article (can be an LLM call)
2. Runs each claim through MiniCheck (or DeBERTa-MNLI) against the source transcript
3. Any claim scored as "not entailed" gets flagged with [UNVERIFIED - NOT FOUND IN SOURCE]
4. The contributor sees these flags and must confirm or remove before publishing

This is not a replacement for human review. It is a filter that catches the worst hallucinations before a human even sees the draft.

---

### Lesson 11: Self-consistency checking for high-stakes content

**WHO:** Faithfulness verification research (VOICE_TO_ARTICLE.md Section 8).

**WHAT:** Generate multiple article drafts from the same transcript. Claims that appear in all drafts are more likely faithful. Claims that vary between drafts are more likely hallucinated. This is computationally expensive but effective for critical content.

**DO THIS:** For the first version, skip this (too expensive per article). But design the pipeline so it CAN generate 2-3 drafts and diff them. This becomes a "high confidence mode" toggle: when a contributor marks their submission as covering a sensitive topic (crime, health, politics), the system generates 3 drafts and flags any claims that differ between them.

---

### Lesson 12: Whisper hallucinates on silence -- detect and filter

**WHO:** University of Michigan research; Calm-Whisper paper (2025) (VOICE_TO_ARTICLE.md Section 1).

**WHAT:** Whisper fabricates entire sentences on silent audio segments and fills pauses with invented content. This is not rare: 8 out of 10 medical transcriptions studied had issues. Calm-Whisper achieved 80%+ reduction in non-speech hallucination by fine-tuning specific decoder heads.

**DO THIS:** After Whisper transcription, add a hallucination filter:
- Detect segments with very low audio energy (near-silence) and flag any text generated during those segments
- Consider using the Calm-Whisper approach if a fine-tuned model is available
- At minimum, warn the contributor: "We detected possible transcription errors in sections where the audio was unclear. Please review the transcript before we generate the article."

The transcript review step is non-negotiable. The contributor MUST see and confirm the transcript before article generation begins.

---

## QUALITY REVIEW

### Lesson 13: Datavault's "spell-check for neutrality" -- real-time, in-workflow

**WHO:** Datavault AI (CMS-integrated bias detection meter).

**WHAT:** Datavault built bias detection that operates INSIDE the editing workflow, giving real-time feedback as the writer works. This is fundamentally different from a post-hoc review. The concept: quality checking as you write, like spell-check, not as a separate review stage after you finish.

**DO THIS:** The quality review should not be a separate "submit and wait" step. Show review feedback alongside the draft, inline:
- Paragraph with editorializing language? Highlight it with a suggestion.
- Missing nut graf? Show a prompt at paragraph 3 position.
- No opposing view? Flag it next to the relevant section.

However, heed the documented risk: "algorithmic sycophancy" -- contributors might write to please the meter, producing false equivalence. The review should flag issues but never auto-correct them. The contributor decides.

---

### Lesson 14: Build the "Editor's Question Set" as the review prompt backbone

**WHO:** Professional editorial practice documented in JOURNALISM_CRAFT.md Section 9.

**WHAT:** The 20-question editor's checklist and the "What's Missing" table are the most codified, specific quality criteria found in the research. These are not abstract principles -- they are concrete yes/no questions that a reviewer (human or AI) can apply to any article.

**DO THIS:** The review prompt should literally walk through these questions against the specific article:
- Does it answer all 5 W's? Which are missing?
- Are all stakeholders represented? Who is affected but not quoted?
- Are numbers, dates, names verified against the source?
- Is there a "what happens next"?
- Is every paragraph doing work?

The review output should be a structured checklist with SPECIFIC references to the article content, not generic advice. This is Challenge 3 from TOP_5_CHALLENGES.md -- the difference between "add more perspectives" (useless) and "you quoted the principal but not the parents whose children are affected" (valuable).

---

### Lesson 15: The editorializing-to-facts transformation table

**WHO:** JOURNALISM_CRAFT.md Section 6D.

**WHAT:** The document contains a concrete transformation table: "The school board made a terrible decision" -> "The school board voted 5-2 to close Jefferson Elementary." This is exactly the transformation the AI pipeline must perform on community voice input.

**DO THIS:** Include this transformation table (or an equivalent Finnish version) in the draft prompt as few-shot examples. The model needs to see the PATTERN: subjective judgment -> specific verifiable fact. Vague crowd claim ("everyone is upset") -> named sources or specific counts. These examples teach the model the core journalism move better than abstract instructions.

---

## DISTRIBUTION / COMMUNITY

### Lesson 16: Patch proves hyperlocal profitability at scale

**WHO:** Patch (30,000+ communities, 25M+ monthly uniques, profitable, bootstrapped).

**WHAT:** Hyperlocal news CAN be profitable. Patch covers 30,000 communities with 85 staff by using AI for distribution/newsletters and keeping coverage thin but wide. The model is professional staff, not citizen contributors, but the business viability is proven.

**DO THIS:** Study Patch's revenue model (likely local advertising + newsletter sponsorship). The lesson is not to copy their content model (professional staff) but to validate that the hyperlocal advertising market exists and can sustain a platform. For business model planning: aim for Patch's coverage breadth with citizen contributors instead of staff journalists. The unit economics should be dramatically better (no per-reporter salary cost).

---

### Lesson 17: Lokal's vernacular-first approach for non-English markets

**WHO:** Lokal (5M+ users, 180+ districts in India, Telugu/regional language focus, YC S19).

**WHAT:** In non-English markets, language is not just a feature -- it is THE adoption driver. Lokal grew by serving content in Telugu and other regional languages when nobody else did. They combined news with classifieds and jobs (utility + information) to create daily-use stickiness.

**DO THIS:** For Finland: Finnish-first is non-negotiable, not a translation layer on top of English. The entire UX, all prompts, all generated content must feel natively Finnish, not translated. Consider bundling utility features (local event calendar, classified-style community board) alongside news content to create daily engagement beyond just reading articles.

---

### Lesson 18: Hearken's audience-driven coverage model

**WHO:** Hearken (100+ newsroom clients, founded at WBEZ Chicago, acquired January 2025).

**WHAT:** Hearken proved that communities WANT to influence what gets covered. Their model: newsrooms ask communities what to cover, then report on it. This bridges community needs and professional journalism. 100+ newsrooms adopted this, proving the demand is real.

**DO THIS:** Build a "what should we cover?" feature into the platform. Let community members vote on topics or submit story requests, not just finished voice memos. This creates engagement before anyone contributes a full story, lowers the barrier to participation, and surfaces what the community actually cares about. Hearken proved the demand; we should inherit the pattern.

---

### Lesson 19: GroundSource proves SMS/chat intake works

**WHO:** GroundSource (SMS-based community engagement, used by ProPublica, Alabama Media Group, Reveal).

**WHAT:** Meeting people where they are (SMS, not apps) works for collecting community voice at scale. GroundSource turned listeners into sources and donors through simple two-way messaging. No app download required.

**DO THIS:** Consider a WhatsApp/Telegram bot as an alternative intake channel alongside the PWA. A contributor sends a voice memo to a WhatsApp number, the bot acknowledges receipt and runs the pipeline. This dramatically lowers the adoption barrier -- no app install, no account creation, no new UI to learn. The PWA is for power users; messaging is for everyone.

---

## WHAT FAILED AND WHY

### Lesson 20: Civil's blockchain journalism -- technology looking for a problem

**WHO:** Civil (blockchain-based journalism marketplace, token sale, shut down 2020).

**WHAT:** Civil tried to solve the trust/accountability problem in journalism using blockchain. Token sale flopped. The product was too complex for both journalists and audiences. Technology was the answer to a question nobody was asking in that form.

**DO THIS:** Do not add complexity that does not directly serve the contributor or reader. No blockchain, no tokens, no decentralized governance, no Web3 anything. The trust mechanism is the quality review layer -- visible, understandable, and directly connected to the content. Every feature must pass the test: "Does this help someone submit a voice memo and get a good article back?" If not, cut it.

---

### Lesson 21: Generic AI writing tools fail at journalism

**WHO:** HyperWrite AI Journalist, Copy.ai, Podsqueeze, and every "AI article writer" tool.

**WHAT:** All of them produce blog posts, SEO content, or marketing copy. None produce journalism. They lack sourcing, attribution, verification, balance, and structure. The output looks like writing but does not function as news. This is not a small gap -- it is a category difference.

**DO THIS:** The fact that generic AI writing tools fail at journalism is actually good news: it means the journalism quality layer is a genuine moat, not a feature that GPT-5 will commoditize. Invest heavily in the prompt engineering, the structured extraction pipeline, and the quality review. These are the defensible assets. Do not worry about competing with generic AI writing tools -- they are in a different category.

---

### Lesson 22: News Painters -- closest concept, stuck in academia

**WHO:** News Painters (UNIST, South Korea, Red Dot Design Award 2025).

**WHAT:** Citizens report local stories, AI generates articles, other citizens add reports, article continuously updates. Three quality layers: report filtering, fact-checking, journalist final review. This is the closest conceptual match to our vision. But it is an academic project, not a product. No voice input. No photo integration. Requires professional journalist final review that does not scale.

**DO THIS:** Study News Painters' three-layer quality model (filter -> fact-check -> final review) and adapt it. Their insight that multiple contributors can paint the same story is worth stealing -- design for additive contributions where a second person can add to an existing story rather than creating a duplicate. But solve their scaling problem: replace the professional journalist final review with the AI quality review layer. That is the entire value proposition.

---

## OPEN-SOURCE TOOLS, MODELS, AND DATASETS TO USE DIRECTLY

| Tool/Model | What It Does | License | Action |
|---|---|---|---|
| **Finnish-NLP/whisper-large-finnish-v3** | Finnish Whisper fine-tune, cuts WER from ~11% to ~8% | Apache 2.0 | Use this for Finnish transcription, not base Whisper |
| **WhisperX** | Whisper + Pyannote diarization + word-level timestamps | Open source | Use for speaker diarization (who said what) |
| **MiniCheck** | NLI-based faithfulness checking of LLM output against source documents | Research (check license) | Use in the Verify step to flag claims not entailed by transcript |
| **DeBERTa-MNLI** | General NLI model for entailment checking | MIT | Fallback if MiniCheck is not available or needs supplementing |
| **spaCy** | NLP pipeline for NER, dependency parsing | MIT | Use for quote extraction component (Guardian-style source/cue/content) |
| **Pyannote** | Speaker diarization | MIT | Already bundled in WhisperX, but available standalone |
| **ClaimBuster API** | Detects which claims are worth fact-checking | Free API | Use to prioritize which claims in generated articles need verification |
| **Google Fact Check Tools API** | Searches existing fact-checks via ClaimReview markup | Free | Use as a supplementary check -- if someone has already fact-checked a claim, surface that |
| **C2PA standard** | Content provenance/authentication for images | Open standard | Adopt for photo provenance -- proves photos are real and unmanipulated |

### Models NOT to use

- **Base Whisper** for Finnish -- use the fine-tuned Finnish model instead
- **Any audio denoiser** before Whisper -- empirically makes results worse
- **Whisper small/medium** for Finnish -- Finnish "shows noticeable improvement with larger models"; small/medium are inadequate

---

## SYNTHESIS: THE THREE THINGS THAT MATTER MOST

1. **The 4-step pipeline (extract -> classify -> draft -> verify) is the product.** Every lesson from Bloomberg, AP, Guardian, MiniCheck, and the faithfulness research points to the same conclusion: decompose the task, verify at each step, never trust a single-shot generation. The prompts are the product.

2. **The quality review layer is the moat.** Transcription is commoditized. Article generation from prompts is commoditized. But a structured editorial quality review that produces specific, content-referencing feedback (not generic advice) is what no one else has built. Datavault tried one dimension (neutrality). We need multi-dimensional: structure, sourcing, balance, faithfulness, readability, completeness. This is the "Grammarly for journalism" that does not exist.

3. **Conservative generation beats comprehensive generation.** An article that says less but says it accurately is better than a comprehensive article with hallucinated details. Every system that works in production (Cleveland Plain Dealer, Chalkbeat, Midcoast Villager) keeps humans in the loop. The AI should generate a tight, minimal, faithful draft and surface what it does NOT know -- rather than filling gaps with plausible fiction.
