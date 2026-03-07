# Voice-to-Article: Technical Research

Research date: 2026-03-07

The pipeline: voice recording -> transcript -> structured article. This document covers what works, what breaks, and where the hard problems are.

---

## 1. Voice-to-Text Quality (Whisper)

### Accuracy Numbers

Whisper Large-v3 achieves **2.7% WER** (Word Error Rate) on clean audio, **7.88%** on mixed real-world recordings, and degrades to **17.7%** on low-quality audio like call center recordings. Human-level accuracy sits at 4-6.8% WER, so Whisper is near-human on clean audio and below-human on anything messy.

### Common Failure Modes

**Hallucinations are the biggest danger.** Whisper fabricates text that was never spoken. This is not a rare edge case -- University of Michigan research found issues in 8 out of 10 medical transcriptions studied. On silent audio, Whisper generates entire sentences of fabricated text. On audio with pauses, it fills silences with invented content. OpenAI has since updated the model to skip silence and retranscribe on suspected hallucination, and a 2025 research paper (Calm-Whisper) achieved 80%+ reduction in non-speech hallucination by fine-tuning specific decoder heads, with less than 0.1% WER degradation.

**Filler words** ("um," "uh," "like," "you know") are handled inconsistently. Whisper sometimes transcribes them, sometimes drops them. Minor normalization differences shift WER by 2-5 points. This inconsistency matters because a voice-to-article pipeline needs to know what is filler and what is intentional speech.

**Background noise.** Whisper handles real-world noise better than most competitors -- it was trained on diverse, messy audio. But at severe noise levels (SNR 10dB), WER jumps to ~9%. Critically, denoising audio before transcription often makes things worse: enhanced audio shows 25.83% WER vs 8.82% on the raw noisy audio. The denoising distorts spectral features that Whisper relies on. Recommendation: feed Whisper raw audio, do not preprocess.

**No native speaker diarization.** Whisper cannot tell you who is speaking. For a journalism pipeline with interviews, this is a hard gap. The standard solution is combining Whisper with Pyannote for speaker diarization. WhisperX bundles this: Whisper + Pyannote + improved word-level timestamps. This adds pipeline complexity but is a solved integration problem.

**Accents and dialects.** Whisper shows bias in dialect and accent recognition. Performance varies with speaker demographics. For a local news platform where contributors have regional accents, this is a real concern that needs testing with actual contributor recordings.

**Irregular speech patterns.** Whisper fails on speech with lots of pauses, repetitions, and fragmented sentences -- exactly the kind of speech casual voice memos produce. This was documented specifically for dementia speech but applies to any disfluent casual speech.

### Practical Implications

Voice memos from community contributors will be casual, sometimes recorded outdoors, with background noise, filler words, self-corrections, and non-linear storytelling. This is close to worst-case for Whisper: unscripted, disfluent, potentially noisy. Expect 8-15% WER on typical voice memos, not the 2.7% headline number. Every transcript needs human review or at minimum automated quality scoring before article generation.

---

## 2. The Speech-to-Article Gap

Spoken language and written journalism are structurally different. Converting one to the other is not cleanup -- it is a transformation.

### What Spoken Language Does That Writing Does Not

- **Repetition.** Speakers repeat key points, circle back, restate. An article states something once and moves on.
- **Filler and hedging.** "I mean," "kind of," "sort of," "you know what I mean" -- these serve social functions in speech but are noise in text.
- **Non-linear structure.** Speakers start stories, digress, return, add context mid-sentence. Articles follow inverted pyramid or logical flow.
- **Incomplete sentences and false starts.** "We went to the -- actually, first we stopped at the store, and then we went to the park." Written journalism does not do this.
- **Run-on structure.** Speech connects ideas with "and" and "but" chains. Written journalism uses shorter, complete sentences.
- **Context dependence.** Speech assumes shared context ("that thing we talked about"). Written journalism makes context explicit.
- **Tone mismatch.** Spoken language is conversational; written journalism aims for neutral, objective, third-person construction.

### The Transformation Required

The gap is not just cleaning up filler words. The LLM must:

1. Identify the core facts and narrative in rambling speech
2. Reorder into logical or chronological structure
3. Separate direct quotes from paraphrased information
4. Add context that was implicit in the speaker's delivery
5. Convert first-person casual speech to third-person journalistic prose
6. Maintain accuracy while restructuring -- no invented facts, no misrepresentation

This is a summarization + restructuring + style transfer task, all at once. It is substantially harder than simple transcript cleanup.

---

## 3. Existing Voice-to-Content Pipelines

### What Exists Today

**Descript** is the closest to voice-memo-to-article. Their "Turn into Blog Post" AI Action takes a transcript and generates a blog post in one click. They market it as "publication-ready." In practice, the output is a useful first draft that still needs editing for accuracy and tone. Descript is built for podcasters and video creators repurposing content -- not for journalism where accuracy is non-negotiable.

**Otter.ai** generates meeting summaries with keywords, overview paragraphs, timestamped notes, and action items. It offers customizable summary templates (Team Meeting, Sales Call, etc.) with sections like Progress Review, Challenges, Decisions. This is structured extraction from transcripts, not article generation.

**Fireflies.ai** produces similar structured summaries: keywords, meeting overview, timestamped notes, action items. Users can customize sections. Again, structured extraction, not narrative article writing.

**tl;dv** competes with Fireflies on meeting transcription and summary. Same category: structured notes, not articles.

**Podsqueeze** specifically converts podcast episodes and voice recordings into "keyword-rich blog posts" in one click. Aimed at SEO content, not journalism.

**Copy.ai** offers a "Create Content from a Transcript" tool that generates various content types from transcript input.

### The Gap

None of these tools produce journalism. They produce:
- Meeting notes (Otter, Fireflies, tl;dv)
- SEO blog posts (Podsqueeze, Descript)
- Marketing content (Copy.ai)

The voice-memo-to-article pipeline for local news does not exist as a product. The closest precedent is **Civic Sunlight** and **LocalLens**, which transcribe public government meetings and generate summaries for local journalists. Chalkbeat uses LocalLens to monitor ~80 school districts across 30 states. Midcoast Villager in Maine has published stories using leads and quotes from Civic Sunlight transcripts. But even these require journalists to independently verify everything and write the actual article.

### Key Insight

The market has converged on transcription + structured extraction (summaries, action items, key points). Nobody has built transcription + narrative article generation with journalistic standards. This is the gap.

---

## 4. Prompt Engineering for Article Generation

### What Works

**Structured output specification.** Tell the LLM exactly what the output should look like: headline, lead paragraph, body paragraphs, quotes, attribution. The more specific the format instruction, the more consistent the output.

**Role assignment.** "You are a local news journalist writing for a community newspaper" produces better journalistic tone than generic prompts.

**Chain-of-thought for complex restructuring.** Breaking the task into steps works better than asking for the article in one shot:
1. First identify the key facts in this transcript
2. Then identify any direct quotes and who said them
3. Then determine the news angle (what is the most important or interesting thing)
4. Then write the article following inverted pyramid structure

**Format-specific transcript input.** TXT format works best for clean text that LLMs process easily. JSON format with speaker labels helps when attribution matters. SRT with timestamps helps when temporal sequence matters.

**Customizable templates.** Different article types need different prompts: event coverage, interview profile, meeting summary, community announcement. A single prompt will not work for all.

### What Does Not Work

**Single-shot "write me an article" prompts.** These produce generic, often hallucinated content. The LLM fills gaps with plausible but invented details.

**Assuming LLM accuracy.** LLMs will hallucinate details, smooth over uncertainty, and present fabricated information with high confidence. For journalism, every claim must be traceable to the source transcript.

**Ignoring evaluation.** Published research emphasizes that LLM output for journalism must be evaluated on information accuracy and bias, including both political and representational bias.

### Recommended Prompt Chain

Based on the research, a multi-step approach works best:

1. **Extract**: Pull out facts, quotes, names, dates, locations from transcript
2. **Structure**: Organize extracted information into news structure (inverted pyramid or narrative)
3. **Draft**: Generate article from structured extraction
4. **Verify**: Cross-check draft against original transcript for faithfulness

Each step is a separate LLM call. This is slower but more reliable than one-shot generation.

---

## 5. Multi-Modal Input Handling

### The Problem

A contributor sends: a 3-minute voice memo, two photos of an event, and a typed text message saying "This was at Kaisaniemi park, the mayor was there." The system needs to combine all three into one article.

### Current Capabilities

Modern multimodal LLMs (GPT-4V, Claude with vision, Gemini) can process text + images in a single context window. The practical approach:

1. Transcribe the voice memo (Whisper)
2. Generate descriptions of the photos (vision model)
3. Combine transcript + photo descriptions + typed notes into a single prompt
4. Generate the article from the combined context

This is not a research problem anymore -- it is an engineering problem. The models can do it. The challenge is prompt design: how to weight the different sources, what to do when they conflict, and how to indicate which information came from which source.

### Prior Art

Research on Automatic News Article Creation (ANAC) from images uses deep learning to extract information from images and generate corresponding news text. The academic approach uses ResNet-50 + BERT, but in practice, a modern multimodal LLM handles this more naturally.

Multimodal RAG systems combine text, images, and tables from multiple sources into coherent outputs. The key technique is embedding alignment: ensuring different modalities are represented in a shared semantic space so the model understands their relationships.

### Practical Approach

The simplest architecture that works:
1. Voice memo -> Whisper -> transcript text
2. Photos -> vision model -> structured descriptions (who/what/where visible)
3. Typed notes -> pass through as-is
4. All three -> single LLM prompt with clear source labels -> article draft

Label each input source so the model (and later verification) can trace claims back to their origin.

---

## 6. Quote Extraction from Transcripts

This is one of the hardest technical challenges in the pipeline.

### The Problem

A contributor records: "I talked to Maria from the school and she said um she thinks the new playground is great but you know she's worried about the um the parking situation because like parents can't find spots in the morning."

The system needs to produce: Maria [from the school] said the new playground is "great" but expressed concern about the parking situation, noting that "parents can't find spots in the morning."

This requires:
1. Identifying that Maria is the quoted source, not the contributor
2. Separating what Maria actually said from the contributor's paraphrase
3. Cleaning filler words from the quote while preserving meaning
4. Deciding what is a direct quote vs. a paraphrase
5. Correct attribution

### Existing Systems

**The Guardian** built a quote extraction system using spaCy NER models trained on 800+ annotated news articles. They decompose quotes into three components: **source** (who said it), **cue** (the speech verb), and **content** (what was said). They achieved 89% accuracy across all three components. Key challenge: quotation marks used for non-quote purposes (e.g., scare quotes around "woke").

**BBC Citron** is an experimental system that extracts quotes from text, attributes them to speakers, and resolves pronouns. It handles direct quotes, indirect quotes, and mixed quotes. However, the system is fragile: "as soon as sentences are structured differently or references are mixed up, the attribution falters."

**Stanford CoreNLP** provides quote extraction and attribution using tokenization, POS tagging, NER, dependency parsing, and coreference resolution.

### The Voice Memo Twist

All existing quote extraction systems work on written text that already has quotation marks and clear attribution structures. Voice memos have none of this. In speech:
- There are no quotation marks
- Attribution is implicit ("she said" vs. "I think")
- The contributor may paraphrase without signaling it
- Reported speech blends with the contributor's own opinion
- Speaker changes are marked by vocal cues, not punctuation

### LLM-Based Approach

Recent research shows LLMs can extract quotes from text using structured output (Pydantic validation for names, dates, content). For voice transcripts, the LLM needs to:
1. Identify speech acts: who is reporting whose words
2. Distinguish direct quotes (what someone actually said) from paraphrased summaries
3. Clean quotes: remove filler, fix grammar, but preserve meaning and word choice
4. Flag uncertainty: when it is unclear whether something is a direct quote or paraphrase

### Critical Journalism Constraint

You cannot fabricate quotes. If the transcript says someone "kind of like said it was um not great," you cannot turn that into them saying "it was terrible." Quote cleaning must be conservative: remove filler words and false starts, but do not change the substance or word choice. This is where most AI tools fail -- they over-clean, making quotes sound polished but inaccurate.

---

## 7. Finnish Language Challenges

### Whisper for Finnish

**Base Whisper Large-v3 WER for Finnish: ~10-15%.** Specifically, on Common Voice 11 the normalized WER is 10.82%, on FLEURS it is 9.63%. Compare this to English at 5-6% WER. Finnish is roughly twice as error-prone.

**Fine-tuned Finnish Whisper models exist.** Finnish-NLP/whisper-large-finnish-v3 on Hugging Face brings Common Voice WER down from 10.82% to 8.23% and FLEURS from 9.63% to 8.21%. This is a meaningful improvement and the model is Apache 2.0 licensed.

**Why Finnish is harder for Whisper:**
- Agglutinative morphology: single Finnish words can encode multiple morphemes, making word boundaries harder to detect
- Less training data than English (Finnish is a "smaller" language in the training set)
- Vowel harmony and consonant gradation create subtle phonetic patterns
- Finnish shows "noticeable improvement" with larger models, suggesting the small/medium models are inadequate

### Finnish for LLM Article Generation

**The morphology problem extends to generation.** Standard BPE tokenization peaks at only 0.31 on morphological integrity scores for Finnish. Finnish words get split at wrong boundaries, fragmenting roots and mishandling affixes. Recommended vocabulary sizes for Finnish are 80k-150k tokens, much larger than typical English models.

**Data scarcity.** Most instruction-tuning datasets and benchmarks are English-only. The Finnish LLM research (Poro project, 2025) found that machine-translating English instruction data into Finnish works reasonably well, and "a few hundred Finnish instruction samples achieves results close to ten times that amount."

**LLM quality for Finnish output.** Claude and GPT-4 can generate Finnish text, but quality varies. Claude 3.5 ranked first in 9/11 language pairs in WMT24 translation, but Finnish was not specifically benchmarked. For grammatical error correction in Finnish, LLMs show promising but imperfect results. The key issue: LLMs trained primarily on English may produce grammatically correct but stylistically unnatural Finnish.

**Code-switching.** Finnish speakers commonly mix Finnish and English, especially for technical terms, brand names, and anglicisms. Whisper handles code-switching reasonably well ("Whisper can handle code-switching where speakers switch between languages"), but sometimes translates English words into the wrong language instead of transcribing them. For a Finnish local news platform, contributors will naturally mix languages, and the system needs to handle this gracefully -- keeping English terms where appropriate rather than forcing everything into Finnish.

### Practical Impact

The Finnish pipeline has two compounding accuracy hits:
1. Whisper transcription: ~10% WER (vs ~5% English)
2. LLM generation: lower-quality Finnish output than English output

These compound. A 10% error rate in transcription fed to an LLM that may mishandle Finnish morphology means the final article needs heavier human review than an English equivalent. The fine-tuned Finnish Whisper model (8% WER) helps significantly on the first problem.

---

## 8. Quality Control and Faithfulness Verification

### The Core Problem

The system must not add information that was not in the source material. A journalist contributor says "about 50 people attended." The article must not say "approximately 50 people attended the event, which was organized by the local community center" unless the community center detail was in the transcript. This is faithfulness -- every claim in the output must be traceable to the input.

### Detection Methods

**NLI-based entailment checking.** The most established approach. Break the generated article into individual atomic claims, then check each claim against the source transcript using a Natural Language Inference model. If the NLI model classifies a claim as "not entailed" by the source, flag it. Tools: DeBERTa-MNLI, MiniCheck (specifically designed for fact-checking LLMs against grounding documents).

**QG-QA (Question Generation - Question Answering).** Generate questions from the article, answer them from the source transcript, compare. If the answers differ, the article has deviated from the source. This is part of the TRUE protocol for unified evaluation.

**Self-consistency checking.** Generate multiple article drafts from the same transcript. Claims that appear in all drafts are more likely faithful. Claims that vary between drafts are more likely hallucinated.

**Claim extraction + verification pipeline.**
1. Extract every factual claim from the generated article
2. For each claim, search the source transcript for supporting evidence
3. Score the proportion of supported claims
4. Flag unsupported claims for human review

### What Works in Practice

**Grounding requirements in the prompt.** Explicitly instruct the LLM: "Only include information that appears in the transcript. Do not add background information, context, or details not mentioned by the speaker. If information is unclear, say so rather than guessing."

**Citation requirements.** Ask the LLM to indicate which part of the transcript supports each statement. This makes verification tractable.

**Conservative generation.** Shorter articles with fewer claims are more likely to be faithful. An article that says less but says it accurately is better than a comprehensive article with hallucinated details.

**Human-in-the-loop.** Every published system (Cleveland Plain Dealer, Chalkbeat, Midcoast Villager) keeps humans in the loop. The AI generates a draft; a human reviews it against the source material before publication. No production journalism system publishes AI-generated content without human review.

### Known Failure Modes

- LLMs add plausible but invented context (dates, locations, organizational details)
- LLMs smooth over uncertainty -- "about 50" becomes "50" or "approximately 50 attendees"
- LLMs infer causation from correlation in the source material
- LLMs merge separate statements by different speakers into a single attributed quote
- LLMs "improve" quotes by making them more articulate than what was actually said

---

## Summary: The Hard Problems

Ranked by difficulty for a voice-memo-to-article pipeline:

1. **Faithfulness** -- ensuring the article contains only what the contributor actually said. This is the journalism-critical problem. No automated solution is fully reliable; human review is mandatory.

2. **Quote handling** -- identifying, cleaning, and attributing quotes from casual speech where there are no quotation marks, speakers blend in and out, and filler words must be removed without changing meaning. Existing NLP systems (Guardian, BBC) achieve ~89% on clean written text; voice transcripts are harder.

3. **Finnish language quality** -- both transcription (10% WER vs 5% English) and generation (morphological complexity, data scarcity, unnatural output). The fine-tuned Finnish Whisper model helps, but compound errors still accumulate.

4. **Whisper hallucination** -- the model fabricates text on silent or noisy segments. Must be detected and filtered before the article generation stage.

5. **Speech restructuring** -- converting rambling, non-linear, repetitive casual speech into structured journalism. LLMs can do this, but the more they restructure, the more opportunity for meaning drift.

6. **Multi-modal fusion** -- combining transcript + photos + notes. Technically feasible with current multimodal models; mainly an engineering and prompt design challenge.

7. **Speaker diarization** -- knowing who said what. Solved by Whisper + Pyannote (WhisperX), but adds pipeline complexity and is imperfect with overlapping speech.

---

## Key Technical Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Whisper model | Finnish-NLP/whisper-large-finnish-v3 for Finnish; whisper-large-v3 for English | Fine-tuned Finnish model cuts WER from ~11% to ~8% |
| Diarization | WhisperX (Whisper + Pyannote) | Standard integration, handles speaker identification |
| Audio preprocessing | None -- feed raw audio | Denoising paradox: preprocessing makes Whisper worse |
| Prompt strategy | Multi-step chain (extract -> structure -> draft -> verify) | Single-shot produces more hallucinations |
| Quote handling | Conservative cleaning -- remove filler only, flag uncertain attribution | Cannot fabricate or alter quotes in journalism |
| Faithfulness check | NLI entailment (MiniCheck) + human review | No automated check is sufficient alone |
| Article language | Generate in the same language as the transcript | Cross-language generation adds error |
| Human review | Mandatory before publication | No production journalism system skips this |
