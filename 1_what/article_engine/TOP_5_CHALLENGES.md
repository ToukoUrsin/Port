# Top 5 Challenges — The Article Engine
# Date: 2026-03-07 UTC+3

These are the hard problems. Everything else (UI, deployment, design) is solved territory. If we can't answer these, the product doesn't work.

---

## 1. Can the AI reliably produce journalism, not blog posts?

The difference between "AI wrote an article" and "AI wrote a NEWS article" is:
- Inverted pyramid structure (most important fact first, not chronological)
- Neutral tone (no editorializing)
- Proper quote attribution
- The nut graf (why should I care?)
- Acknowledged gaps (what we DON'T know)

ChatGPT defaults to blog voice. Every time. It opens with "On a beautiful Tuesday evening..." instead of "The council voted 5-2 to cut school funding."

**The question:** Can we prompt-engineer our way to consistent journalism output, or does it drift back to generic AI writing after a few articles?

**How to test:** Generate 10 articles from 10 different voice memos. Grade each: does it have an inverted pyramid? A real lead? A nut graf? Neutral tone? If 8/10 pass, we're good. If <5/10, the prompt needs more work.

**Status:** Not yet tested.

---

## 2. Quote extraction fidelity — exact quotes from messy speech

A Finnish person rambles for 3 minutes with filler words, half-sentences, tangents, and code-switching. The AI needs to:
- Find the quotable moments in the transcript
- Clean them just enough (remove "um," "niinku," "tota")
- NOT change the meaning
- Attribute them to the right speaker
- Place them in the article where they have maximum impact

One fabricated or misattributed quote kills trust in the entire platform. This is the most dangerous failure mode.

**The question:** Can the AI distinguish between "this is a direct quote worth preserving" and "this is casual speech that should be paraphrased"? Can it clean quotes without altering meaning?

**How to test:** Record 5 voice memos with clear quotes. Run through the pipeline. Check every quote in the output against the transcript. Flag any quote that was invented, misattributed, or had its meaning changed.

**Status:** Not yet tested.

---

## 3. Does the quality review produce specific insights or generic advice?

The difference between a valuable quality review and a useless one:

```
USELESS (generic):
  "Consider adding more perspectives to this article."
  "The article could benefit from additional sources."

VALUABLE (specific):
  "You mentioned three teams but only quoted the winner.
   The two losing teams have no voice in this story."
  "This article covers the budget vote but doesn't include
   the vote count (5-2) mentioned in your recording."
```

Generic coaching = a template anyone can copy in 5 minutes. Specific coaching that references exact details from THIS article = the moat.

**The question:** Can Claude Sonnet consistently produce coaching suggestions that reference specific content from the article and transcript? Not "add more sources" but "you interviewed the principal but not the parents who opposed the budget — and this story is about their children."

**How to test:** Run 10 articles through the review pipeline. Grade each coaching suggestion: is it specific to this article (references exact content) or generic (could apply to any article)? If 7/10 articles produce at least one genuinely specific insight, we're good.

**Status:** Not yet tested.

---

## 4. Finnish — does the full pipeline actually work end-to-end?

Three things that could break:

**Whisper transcription of Finnish casual speech.** Finnish has long compound words, casual speech is very different from written Finnish, and filler words (niinku, tota, silleen) are different from English fillers. How accurate is Whisper on casual Finnish?

**Claude generating proper Finnish journalism.** Finnish journalism has its own conventions. The AI might produce English-structured Finnish — grammatically correct but stylistically wrong. Finnish news writing is more concise than English, uses different quote conventions, and has specific conventions for names and titles.

**Quality review understanding Finnish cultural context.** "Missing perspective: the immigrant community" means something different in Finland than in the US. The review needs to be calibrated to Finnish society, not American media norms.

**The question:** Does the pipeline produce natural, publishable Finnish journalism? Not just "correct Finnish" but Finnish that a native speaker would read without thinking "this was translated from English."

**How to test:** Record 3 voice memos in Finnish about real local topics. Run the full pipeline. Have a Finnish native speaker (ideally with journalism exposure) read the output and grade it: does this sound like a Finnish local newspaper article?

**Status:** Not yet tested. MUST test before the hackathon.

---

## 5. Hallucination — will the AI add facts not in the source?

The cardinal sin: the contributor said "the council voted on the budget" and the AI writes "the council voted 5-2 to approve a $4.2M budget" when no numbers were given. The AI filled in plausible details that aren't real.

This is especially dangerous because:
- The invented details LOOK real (specific numbers, names, dates)
- The contributor might not catch them (they sound right)
- One hallucinated fact published as news destroys the platform's credibility

**The question:** Can we constrain the generation prompt tightly enough that the AI ONLY uses information from the source material? And can the review prompt reliably catch any additions?

**How to test:** Create 5 deliberately incomplete voice memos (mention a vote but not the count, mention a person but not their title). Run through the pipeline. Check: did the AI invent any details not in the source? Did the review catch any inventions?

**Status:** Not yet tested.

---

## Priority Order

All five matter, but if forced to rank:

1. **Hallucination** (#5) — a hallucinated fact published as news is catastrophic
2. **Quote fidelity** (#2) — a fabricated quote is nearly as bad
3. **Journalism vs blog post** (#1) — the core value proposition
4. **Finnish** (#4) — demo-critical, must test before hackathon
5. **Specific review insights** (#3) — important for differentiation but not a blocker

The first two are safety issues (wrong output). The next two are quality issues (mediocre output). The last is a differentiation issue (generic output).

---

## The Gate Test

Before building any UI, run 5 end-to-end tests:
1. Record a voice memo (ideally in Finnish)
2. Transcribe with Whisper
3. Generate article with Claude
4. Run quality review with Claude
5. Grade the output on all 5 challenges above

If 4/5 articles pass on hallucination + quotes + structure: BUILD.
If <3/5: fix the prompts first. The prompts are the product.
