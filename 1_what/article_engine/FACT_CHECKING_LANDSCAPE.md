# Fact-Checking and Hallucination Detection — What Exists, What We Use
# Date: 2026-03-07 UTC+3

How current systems verify that LLM output is grounded in source material. Research for the article engine's verify step — checking that the generated article only contains claims from the contributor's transcript.

---

## THE CORE PATTERN

Almost every system in this space does the same thing:

**Break the output into claims -> check each claim against the source -> flag unsupported claims.**

The differences are in HOW they do the checking. Three tiers exist, from simplest to most sophisticated.

---

## TIER 1: LLM-AS-JUDGE

Send the generated output + the source document to a second LLM and ask: "Is each claim in the output supported by the source?"

This is what's behind most "we solved hallucinations" marketing. Every major platform offers a version of it.

### OpenAI Guardrails — Hallucination Detection

Validates factual claims against a vector store of reference documents using a second model call. You configure a vector store ID (containing your reference documents), a model (e.g. gpt-4.1-mini), and a confidence threshold (0.0-1.0). The system analyzes text for factual claims, flags content that is contradicted or unsupported by the knowledge base, and provides confidence scores with reasoning for detected issues.

Key limitation: it does NOT claim global factual accuracy — only grounding against YOUR documents. It does not flag opinions, questions, or supported claims. This is exactly the right constraint for our use case (checking against a transcript, not against world knowledge).

Part of OpenAI's broader Guardrails framework which also includes PII detection, moderation, jailbreak detection, off-topic filters, prompt injection detection, and URL filtering.

Source: https://openai.github.io/openai-guardrails-python/ref/checks/hallucination_detection/

### Guardrails AI — Provenance Validators (open source)

Provenance validators detect and limit hallucinations from LLMs that depart from the material in the supplied source documents. Two modes: check the whole text, or check each sentence in turn. The validators inspect each sentence for potential hallucinations and remove the parts that have no foundation in the source text.

Two validator versions: v1 prompts a second LLM to check grounding. Both NVidia NeMo Guardrails, LlamaIndex faithfulness check, and Guardrails AI all follow the same pattern: send the AI's response and the supporting documents to a model and ask if the answer is grounded in the evidence.

Source: https://www.guardrailsai.com/blog/reduce-ai-hallucinations-provenance-guardrails

### Fiddler — Enterprise Faithfulness Guardrails

Enterprise-grade guardrails with a "faithfulness" metric that measures whether input data supports the output, and a "groundedness" metric that evaluates whether the answer is based on reliable sources or retrieved context. Handles 5M+ requests/day with latency under 100ms. Three lines of code to integrate. Uses Fiddler's own Trust Models for scoring, eliminating the need to route sensitive data through external platforms.

Released a 2025 Benchmarks Report comparing speed, cost, and accuracy for faithfulness metrics across six models.

Sources:
- https://docs.fiddler.ai/developers/tutorials/guardrails/guardrails-faithfulness
- https://www.fiddler.ai/guardrails-benchmarks

### Google FACTS Grounding Benchmark

A benchmark (not a tool) for evaluating whether all factual claims in model responses can be traced to provided source material. Uses diverse, extended context inputs (up to 32k tokens) from domains like finance, legal, and medical. Two-stage evaluation with ensemble of three judge models (Gemini 1.5 Pro, GPT-4o, Claude 3.5 Sonnet) with score averaging to minimize bias.

The ensemble approach is the key insight: using multiple model families as judges mitigates the self-enhancement bias where a model rates its own outputs more favorably.

Source: https://deepmind.google/blog/facts-grounding-a-new-benchmark-for-evaluating-the-factuality-of-large-language-models/

### LLM-as-Judge Best Practices (2025-2026)

The field has converged on these practices:

1. **Specific criteria.** "Factually accurate and free of unsupported claims" not "good quality."
2. **Chain-of-thought prompting.** Ask the judge to explain reasoning step-by-step before giving a final score. Improves reliability 10-15%.
3. **Different model family as judge.** Mitigates self-enhancement bias. Using Claude to judge GPT (or vice versa) is more reliable than using the same model.
4. **Explicit uncertainty handling.** "If you cannot verify a fact, mark it as 'unknown' and pass to human review."
5. **GPT-4 as judge achieves ~80% agreement with human evaluators**, matching human-to-human consistency.

Sources:
- https://www.evidentlyai.com/llm-guide/llm-as-a-judge
- https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge

---

## TIER 2: SPECIALIZED SMALL MODELS

Purpose-built models that do one thing — check faithfulness — cheaply and fast. Surprisingly good accuracy for their size.

### Vectara HHEM-2.1-Open

770M parameter model. Checks whether a summary is factually consistent with its source. Available on Hugging Face and Kaggle. Runs on consumer hardware: <600MB RAM at 32-bit precision, ~1.5 seconds for 2k-token input on a modern x86 CPU. Apache 2.0 license (open source).

Also has a commercial version (HHEM-2.3) with better accuracy, accessible via Vectara's API. Powers the Vectara Hallucination Leaderboard, which benchmarks LLMs on 7,700+ articles across law, medicine, finance, education, and technology.

The updated leaderboard shows that hallucination rates are generally higher under complex benchmarks than the headline numbers suggest. Even the best models (GPT-5 at 8%, Perplexity at 7%) still hallucinate meaningfully.

Sources:
- https://huggingface.co/vectara/hallucination_evaluation_model
- https://www.vectara.com/blog/hhem-v2-a-new-and-improved-factual-consistency-scoring-model
- https://www.vectara.com/blog/hallucination-detection-commercial-vs-open-source-a-deep-dive

### MiniCheck-FT5

770M parameters. Reaches GPT-4-level accuracy at 400x lower cost. Breaks generated text into atomic claims, checks each against the source document. Trained on synthetic data from GPT-4 — structured generation of realistic yet challenging factual errors.

Part of the LLM-AggreFact benchmark, which unifies pre-existing datasets for evaluating fact-checking and grounding of LLM generations.

The key insight from the MiniCheck paper: the problems of faithfulness checking across different applications (summarization, RAG, dialogue) share a common primitive — checking a statement against grounding documents. A small model trained specifically on this primitive can match a large general model.

Sources:
- https://arxiv.org/abs/2404.10774
- https://www.getmaxim.ai/blog/minicheck-llm-fact-check/

### Amazon RefChecker

Breaks claims into knowledge triplets (subject-predicate-object), inspired by knowledge graphs. This is more granular than sentence-level checking — a single sentence can contain multiple knowledge triplets, each of which can be independently verified or hallucinated.

Three-stage pipeline: claim extractor -> hallucination checker -> aggregation rules. Outperforms prior methods by 18.2-27.2 points on their benchmark (11k claim-triplets from 2.1k responses by seven LLMs). Strongly aligned with human judgments. Open source on GitHub, pip-installable.

Three context settings: zero context (factual question alone), noisy context (question + retrieved documents), and clean context. The article engine case is "clean context" — we have the exact source document (transcript).

Sources:
- https://github.com/amazon-science/RefChecker
- https://www.amazon.science/blog/new-tool-dataset-help-detect-hallucinations-in-large-language-models

### FActScore

The granularity pioneer. Breaks generated text into atomic facts — a 110-150 word biography contains 26-41 atomic facts, each checked against 5 documents (130-205 entailment checks per biography). The insight: checking at the sentence level misses errors embedded within otherwise-correct sentences. Checking at the atomic fact level catches them.

Methods like FActScore (Min et al., 2023), MiniCheck (Tang et al., 2024), and ACUEval (Wan et al., 2024) all focus on extracting atomic units from generated text for fine-grained verification.

---

## TIER 3: TOKEN-LEVEL REAL-TIME DETECTION

### HaluGate (vLLM project, December 2025)

Detects hallucinations at the token level as they're being generated. Three-stage pipeline:

1. **HaluGate Sentinel** — binary classifier: does this query even need factual verification? Skips creative/opinion content, only triggers for factual claims.
2. **HaluGate Detector** — identifies exactly which tokens in the response are unsupported by the provided context.
3. **HaluGate Explainer** — NLI-based classification explaining why each flagged span is problematic.

Total overhead: 76-162ms on top of generation — negligible compared to typical LLM generation times of 5-30 seconds. Runs in-process using Hugging Face's Candle ML framework. No separate Python service, sidecars, or model servers needed.

Integrates with vLLM's function-calling workflows: tool results serve as ground truth for verification, detection results propagated via HTTP headers for downstream policy decisions.

Part of vLLM Semantic Router v0.1 (codename Iris), released January 2026 with 600+ PRs from 50+ contributors.

**Not applicable to our architecture** because we call Claude's API rather than self-hosting models via vLLM. But represents where the field is heading: hallucination detection as an infrastructure-level capability rather than an application-level bolt-on.

Sources:
- https://blog.vllm.ai/2025/12/14/halugate.html
- https://huggingface.co/llm-semantic-router/halugate-sentinel

---

## WHAT THIS MEANS FOR THE ARTICLE ENGINE

### Our specific problem

The article engine's verify step checks: **is the generated article grounded in the contributor's transcript?**

This is the cleanest possible version of the faithfulness problem:
- Explicit source document (the transcript)
- Explicit output (the article)
- No web search needed, no knowledge base, no retrieval step
- The source is short (60-180 seconds of speech = ~200-600 words of transcript)
- The output is short (200-800 word article)

### Hackathon approach: Tier 1 (LLM-as-judge)

Use Claude to check Claude's output against the transcript. This is the simplest, most flexible approach and gets ~80% agreement with human evaluators.

The verify prompt from ARCHITECTURE.md already does this:
```
For each factual claim in the article:
1. State the claim
2. Quote the supporting evidence from the transcript, or write "NOT FOUND"
3. If the claim adds specificity not in the source (exact numbers,
   names, dates, titles), flag it as "POSSIBLE HALLUCINATION"
```

Best practices to apply:
- Chain-of-thought: ask Claude to reason through each claim before scoring
- Explicit uncertainty: "If you cannot determine whether a fact is in the source, flag it as UNCERTAIN rather than guessing"
- Specific criteria: check for invented numbers, fabricated quotes, added context, smoothed uncertainty ("about 50" becoming "50")

Cost: ~$0.01 per verification. Latency: ~3-5 seconds.

### Production upgrade: Tier 2 pre-filter + Tier 1 judge

```
STEP 1: FAST PRE-FILTER (HHEM or MiniCheck)
  Run on (article, transcript)
  ~1.5 seconds on CPU, nearly free
  Catches obvious hallucinations:
    - Invented numbers not in transcript
    - Names not mentioned by contributor
    - Fabricated quotes
    - Added institutional details

  If faithfulness score > 0.95: skip the expensive LLM judge
  If faithfulness score < 0.95: run full verification

STEP 2: FULL VERIFICATION (Claude as judge)
  Claim-by-claim cross-reference against transcript
  ~3-5 seconds, ~$0.01
  Catches subtle hallucinations:
    - Inference presented as fact
    - Smoothed uncertainty ("about 50" -> "50")
    - Merged quotes from different speakers
    - Context added from training data, not from source
```

The small model handles ~70% of articles (the clean ones) cheaply. The LLM judge handles the remaining 30% (the ones with borderline faithfulness). Total verification cost drops ~60% while maintaining accuracy.

### What NONE of these tools solve

All fact-checking tools check claims against *provided source documents*. None verify claims about the real world that aren't in any document.

If a contributor says "the council voted on the budget" and the AI writes "the council voted on the budget," that's grounded — the article faithfully represents the transcript. But was there actually a council vote? Did the contributor make it up? Was the contributor confused?

This is not a technical problem. It's a journalism problem. And it's why the QUALITY_PROBLEM.md evidence-severity matrix exists:

- Low-stakes claims (bakery opened) need only the contributor's firsthand account
- Medium-stakes claims (council voted 5-2) need the contributor present at the event or a named source
- High-stakes claims (mayor embezzled money) need multiple named sources, documentary evidence, or public records

The verify step checks: **did the AI faithfully represent what the contributor told it?**
The quality review checks: **is what the contributor told it strong enough evidence for the claims being published?**

These are different questions answered by different stages of the pipeline. The fact-checking tools above solve the first question. The evidence-severity matrix solves the second.

---

## TOOLS AND MODELS TO EVALUATE

| Tool | Type | Cost | Latency | Open Source | Best For |
|---|---|---|---|---|---|
| **Claude as judge** | Tier 1 LLM | ~$0.01/call | ~3-5s | N/A (API) | Hackathon. Flexible, high quality, simple integration. |
| **HHEM-2.1-Open** | Tier 2 model | Free (CPU) | ~1.5s | Yes (HF) | Production pre-filter. Fast binary faithfulness score. |
| **MiniCheck-FT5** | Tier 2 model | Free (CPU) | ~2s | Yes | Production pre-filter. Atomic claim checking. GPT-4 accuracy at 400x less cost. |
| **Amazon RefChecker** | Tier 2 pipeline | Free (CPU) | ~3s | Yes (GitHub) | Production. Knowledge triplet granularity. Best for structured claims. |
| **Guardrails AI** | Tier 1 framework | Free (OSS) + LLM cost | ~3-5s | Yes | If we wanted a framework around the verify step. Probably overkill. |
| **OpenAI Guardrails** | Tier 1 API | OpenAI pricing | ~2-4s | No | Only if using OpenAI models. Not relevant for Claude-based pipeline. |
| **Fiddler** | Tier 1 platform | Enterprise pricing | <100ms | No | Production at scale. 5M+ req/day. Overkill for hackathon. |
| **HaluGate** | Tier 3 token | Free (vLLM) | 76-162ms | Yes | Only if self-hosting via vLLM. Not applicable to API-based pipeline. |

### Recommendation

**Hackathon:** Claude as judge. One API call, well-crafted prompt, claim-by-claim cross-reference. Simple, effective, good enough.

**Production:** HHEM or MiniCheck as fast pre-filter (catches 70% of clean articles without an LLM call) + Claude as judge for borderline cases. Consider RefChecker's knowledge triplet approach if we need finer granularity on complex articles.

**Not worth pursuing:** HaluGate (requires vLLM self-hosting), Fiddler (enterprise pricing for a startup), OpenAI Guardrails (wrong model family).
