# The Quality Problem — Preventing Harm Without Killing the Pride Cycle
# Date: 2026-03-07 UTC+3

Merged from two perspectives: the problem spectrum (what can go wrong) and the gate design (how to stop it). Synthesized with DEEP_SYNTHESIS.md's 6-dimension quality engine and THE_CONTRIBUTOR_CYCLE.md's pride cycle.

---

## THE PROBLEM IN ONE PARAGRAPH

The Contributor Cycle is designed so anyone can go from voice memo to published article in under 3 minutes, with the "publish now" button always visible. The 6-dimension quality engine (DEEP_SYNTHESIS) reviews every article for representation, ethics, factual accuracy, cultural context, and manipulation. But neither document answers the hard question: **what happens when someone submits something that should not be published?** Racist content, fabricated claims presented as fact, defamation, dangerous misinformation — the current design treats the quality review as coaching ("your article would be stronger with..."), never as a gate ("you cannot publish this"). That's a design hole. A town newspaper that publishes one racist article loses the community's trust permanently. Finland has 67% news trust — the highest in Europe. One incident destroys it.

---

## THE TWO FAILURE MODES

### Failure Mode 1: Publish Garbage (too permissive)

The pride cycle says: the contributor always has the last word. The coaching is always optional, always skippable. The publish button is always visible.

So a contributor submits a voice memo saying "the Somali families on Kauppakatu are ruining the neighborhood, they're loud and dirty and nobody wants them here." The AI structures it into a neutral-sounding article. The quality review flags "representation: speaking ABOUT a community without voices FROM that community." The contributor ignores the flag and hits publish. It goes live on the town's newspaper.

Or: someone submits a fabricated account of a crime that never happened. The AI has no way to verify it didn't happen. The review flags "single source, unverified." The contributor ignores the flag. Published.

Or: someone submits something technically accurate but framed to incite — "3 assaults this month, all by immigrants" — cherry-picked stats presented without context. The review flags "missing context." Contributor ignores it. Published.

The pride cycle, taken literally, allows all of this.

### Failure Mode 2: Kill the Cycle (too restrictive)

The opposite: every article requires approval before publishing. A human moderator reviews everything. Or the AI blocks anything remotely sensitive.

Now the contributor submits a council meeting report. The AI flags "missing stakeholder perspective" as a blocking issue. The contributor can't publish until they go interview someone else. They don't have time. They close the app. They never come back.

Or: a contributor writes about a genuine problem in their neighborhood. The AI flags it as "potentially negative framing of a community" because it mentions a specific street. Blocked. The contributor feels censored. Trust in the platform dies from the other direction.

Time is the #1 barrier to contribution. Every gate that adds time or uncertainty kills the flywheel. A contributor who gets blocked once may never return.

---

## THE CORE TENSION

**Coaching wants zero friction.** Every coaching suggestion is optional. The contributor always has the last word. The publish button is always visible. This maximizes the pride cycle.

**Safety wants hard gates.** Some content must not be published. Period. Not "we suggest you reconsider" — actually blocked. This protects the community.

These two goals are in direct conflict. The resolution must be precise: **what exactly gets blocked, what gets flagged, and what passes through?**

---

## THE SPECTRUM OF PROBLEMS

Not all quality problems are the same. They range from harmless thinness to genuine danger.

### Level 1: THIN (harmless, just sparse)
"A new coffee shop opened on Main Street." No names, no quotes, no details. Nothing wrong — just thin. Publishable as a brief. The coaching layer handles this.

### Level 2: SLOPPY (factual errors, bad structure)
The article says "5-3 vote" when the contributor said "5-2." A quote is mangled from the transcript. The review layer catches these automatically by cross-checking article against transcript.

### Level 3: ONE-SIDED (missing perspectives)
Council meeting article quotes only the winning side. Not wrong, not harmful, but incomplete. Coaching: "Do you know why the dissenting members voted no?"

### Level 4: BIASED FRAMING (the gray zone)
A contributor describes a Roma encampment as "causing problems in the neighborhood." Each sentence might be factually accurate. The problem is which facts were selected and how they're arranged. The contributor doesn't think they're being biased. **This is the hardest category.**

### Level 5: UNVERIFIED SERIOUS CLAIMS
"The mayor is embezzling money." Might be true. If true, it's exactly the accountability journalism communities need. But a voice memo is NOT sufficient evidence for a claim that could destroy someone's career.

### Level 6: DEFAMATION / HATE SPEECH
"These immigrants should go back where they came from." Naming a private individual as a criminal without evidence. Content designed to harass. The line.

### Level 7: AI HALLUCINATION (the system's own failure)
The AI invents a detail, name, number, or quote not in the transcript. Uniquely dangerous because the error comes from INSIDE the system. The contributor might not catch it because the article "sounds right."

---

## THE PROPORTIONALITY PRINCIPLE

**The evidence bar must scale with the severity of the claim.** More severe or more speculative claims demand proportionally more supporting evidence before publication.

This is how real journalism works. AP Stylebook doesn't require the same sourcing for "a coffee shop opened" as for "a politician committed fraud." Neither should the AI.

### The Claim-Severity / Evidence-Demand Ladder

| Severity Tier | Example | Evidence Required | Gate |
|---|---|---|---|
| **TIER 0: Benign** | New shop opened, community event, school play | Contributor's firsthand account sufficient | No gate — publish freely |
| **TIER 1: Factual claim** | "Council voted 5-2 to cut funding" | Contributor present at event, or named source | Coaching flag if unverified, but publishable |
| **TIER 2: Contested claim** | "The budget will hurt families" | Attribution required ("parents said...") | Coaching: "attribute this claim to a named source" |
| **TIER 3: Accusation / harm** | "The contractor used cheap materials" | Named source + right of response sought | Hard flag: cannot publish without attribution. Must include "X did not respond to request for comment" or actual response |
| **TIER 4: Criminal / defamatory** | "The mayor stole money" / hate speech | Multiple named sources, documentary evidence, or direct observation of a public event | **BLOCKED.** Cannot publish. Human review required, or content must be restructured to attribute claims to official sources (police report, court filing, public record) |

### Severity Signals (how the AI assesses claim severity)

- **Named individuals:** Any claim about a specific named person raises the bar
- **Negative characterization:** Negative claims about people/organizations require more evidence than neutral/positive
- **Institutional claims:** Claims about governments, schools, businesses have higher stakes than personal observations
- **Legal implications:** Anything that could constitute defamation, invasion of privacy, or incitement
- **Irreversibility:** "The shop closed" (verifiable, reversible if wrong) vs. "The owner is a fraud" (reputational damage, irreversible)

### The Speculation Corollary

Speculative or uncertain claims are fine AS LONG AS they're framed as such. "Residents suspect the budget numbers don't add up" is journalism. "The budget is fraudulent" is an accusation. The AI should coach the contributor toward the former when the evidence only supports speculation.

The same fact can be Tier 1 or Tier 3 depending on framing:
- "Several parents expressed concern about safety near the school" → Tier 1 (attributed observation)
- "The school is unsafe" → Tier 3 (accusation requiring evidence)

### The Direction of Asymmetry

**False negatives (publishing harm) are worse than false positives (blocking good content).**

A blocked good article frustrates one contributor. A published harmful article damages the entire platform's trust with the whole community. The asymmetry is massive. When uncertain, err toward flagging.

But: false positives compound. Block 5 contributors unfairly and word spreads — "the AI censors you." So false positives must be rare AND recoverable (clear explanation, clear path to fix, fast resolution).

---

## THE EVIDENCE-SEVERITY MATRIX

Two axes: how severe is the claim, and how much evidence supports it.

```
                    EVIDENCE STRENGTH
                    Low          Medium        High
               +------------+------------+------------+
    Low        |  GREEN     |  GREEN     |  GREEN     |
    (bakery)   |  publish   |  publish   |  publish   |
               +------------+------------+------------+
CLAIM  Medium  |  YELLOW    |  GREEN     |  GREEN     |
SEVERITY       |  coach     |  publish   |  publish   |
(budget vote)  +------------+------------+------------+
    High       |  RED       |  YELLOW    |  GREEN     |
    (accusation|  block     |  coach     |  publish   |
     / hate)   +------------+------------+------------+
```

Low severity + any evidence = publish. The bakery opened, who cares about source depth.
High severity + low evidence = block. You're accusing someone of a crime with no sources.
High severity + high evidence = publish. Named sources, documents, right of response — that's journalism.

The AI's job is to estimate both axes from the article content and source material, then apply the matrix.

---

## THE THREE-TIER RESPONSE: GREEN / YELLOW / RED

### GREEN: Publish Freely
Content is benign. Quality review runs as coaching. Publish button always active. This is the default for ~90% of articles (event coverage, business openings, community stories, meeting reports without accusations).

### YELLOW: Publish With Advisory
Content has quality gaps but no safety risk. The review shows yellow flags. The contributor sees specific coaching suggestions. They can publish anyway — the flags are visible to readers too (quality score reflects them).

**Key design choice:** Yellow-flagged articles publish with their quality score visible. A 45/100 article is publishable but the score is public. Community trust self-regulates: readers learn to weight quality scores. Contributors learn that better input = higher scores = more readership.

### RED: Cannot Publish As-Is
Content triggers a hard gate. The publish button is disabled. The contributor sees a specific, actionable explanation — not "this violates our guidelines" but exactly what triggered the block and exactly how to fix it.

**Red trigger examples:**
- "This article accuses Matti Virtanen of financial misconduct. To publish accusations against a named person, the article must attribute the claim to a named source, a public record, or a law enforcement statement. You can: (a) add a source, (b) reframe as 'residents have raised concerns' with named residents, or (c) remove the accusation."
- "This article characterizes Somali residents negatively without including any voices from that community. To publish, either add a perspective from the community being discussed, or reframe to remove the group characterization."
- "This article contains a quote not found in your recording. The AI may have generated it. Please verify or remove the quote before publishing." (Hallucination catch.)

**Red gates must be:**
1. **Specific** — tells you exactly what triggered it, references the exact sentence/paragraph
2. **Actionable** — gives you 2-3 concrete ways to fix it
3. **Rare** — if >5% of articles hit red, the threshold is too sensitive
4. **Bypassable in extremis** — a human editor (platform operator / community moderator) can override. The contributor alone cannot.

---

## THE 6-DIMENSION QUALITY ENGINE AS GATE

The 6 dimensions from DEEP_SYNTHESIS already cover the right territory. The missing piece: which dimensions are coaching (yellow) and which can escalate to gates (red)?

| Dimension | Coaching (Yellow) | Gate (Red) |
|---|---|---|
| **1. EVIDENCE** | "Budget figure seems high — can you verify?" | **Gate when**: criminal accusation against named person with no source; fabricated quote detected; AI hallucination identified |
| **2. PERSPECTIVES** | "3 of 5 stakeholder groups represented" | Never a hard gate — missing perspective is a quality issue, not a safety issue |
| **3. REPRESENTATION** | "Speaking about community X without voices from community X" | **Gate when**: article characterizes a group negatively with zero voices from that group |
| **4. ETHICAL FRAMING** | "Consider whether this framing respects the affected community" | **Gate when**: content dehumanizes, uses slurs, or frames a group as inherently threatening; identifies victims/minors without consent; publishes private addresses |
| **5. CULTURAL CONTEXT** | "This cultural practice may need more context for general readers" | Never a hard gate — cultural context gaps are quality issues |
| **6. MANIPULATION** | "This headline may be more dramatic than the content supports" | **Gate when**: content is deliberately misleading, or contains dark patterns designed to incite |

Dimensions 2 and 5 are always coaching. Dimensions 1, 3, 4, and 6 are coaching by default but escalate to hard gates under specific, defined conditions.

### Operationalized Checklists

**1. EVIDENCE (weight: highest)**
- [ ] Every quote in the article exists in the transcript
- [ ] Every number in the article exists in the source material
- [ ] Every named person in the article is mentioned in the source material
- [ ] Claims are attributed ("according to...", "X said...", "the contributor observed...")
- [ ] Severity-proportional evidence bar is met
- [ ] Gaps are acknowledged ("X was not available for comment")

**2. PERSPECTIVES (weight: high)**
- [ ] Key affected stakeholders are identified
- [ ] At least one direct voice from an affected party (for medium+ complexity stories)
- [ ] Opposing or alternative views are noted (when relevant)
- [ ] No false equivalence (not every topic needs "both sides" — a story about a hate crime doesn't need the perpetrator's "perspective")

**3. REPRESENTATION (weight: medium)**
- [ ] People discussed in the story speak for themselves where possible
- [ ] Groups are not characterized without their own voices present
- [ ] Descriptions of communities include context, not just labels

**4. ETHICAL FRAMING (weight: medium)**
- [ ] No identification of victims/minors without consent
- [ ] No private information published without consent (addresses, phone numbers)
- [ ] No sensationalized language
- [ ] Power dynamics acknowledged where relevant
- [ ] Contributor's potential conflicts of interest identified

**5. CULTURAL CONTEXT (weight: context-dependent)**
- [ ] Cultural references explained for general audience
- [ ] No exoticization or stereotyping of cultural practices
- [ ] Respectful terminology used for communities and groups
- [ ] Finnish-specific: Sámi protocols, Swedish-speaking minority, immigrant communities

**6. MANIPULATION (weight: pattern-level)**
- [ ] Article doesn't read like advertising for a business
- [ ] Article doesn't read like campaign material for a politician
- [ ] No pattern of targeting a specific individual across multiple submissions
- [ ] Facts aren't arranged to mislead despite being individually accurate

---

## THE HARD CASES

### Case 1: Legitimate criticism that looks like an attack

A contributor reports that a local landlord hasn't fixed heating in an apartment building for three months. Legitimate journalism. But also an accusation against a named person.

**Resolution:** The severity ladder handles this. Attribute the claim to named tenants ("Residents Anna Korhonen and Jussi Mäkelä said..."). Note that the landlord was contacted or that a response was sought. This is Tier 3 — passes with attribution + right of response. The gate doesn't block accountability reporting; it blocks unattributed accusations.

### Case 2: Dog-whistle content

A contributor writes about "safety concerns" in a neighborhood that happens to be where immigrants live. No slurs, no explicit targeting. But the framing associates a group with danger.

**Resolution:** Yellow flag, not red. "This article discusses safety concerns in a specific neighborhood. Consider adding context: crime statistics for comparison, voices from the neighborhood's residents, or the municipality's response." The coaching pushes toward more complete reporting. If the contributor adds context, the article becomes better journalism. If they refuse, the article publishes with a visible quality score reflecting thin sourcing.

Dog whistles are a moderation problem, not a generation problem. The platform needs a community reporting mechanism post-publication (flagging) as a second layer. The AI gate catches obvious cases; community moderation catches subtle ones.

### Case 3: Contributor pushes back on a red gate

The contributor believes the gate is wrong. They're a tenant reporting a real problem, and the AI blocked it because it reads as an "accusation against a named person."

**Resolution:** Every red gate includes an "I think this is wrong" path that escalates to human review. For the hackathon, this is the platform operator. For production: a community editor or moderation volunteer. The human can override the AI. The contributor is never permanently silenced — just delayed until a human looks at it.

The red gate message must never feel like "you are bad" or "this is censorship." It must feel like "this is serious enough that we want to make sure it's right — here's how to make it bulletproof." The framing is quality, not morality.

### Case 4: The AI itself introduces bias

The AI structures a contributor's neutral observations into an article that subtly frames a community negatively — through word choice, emphasis, or structure the contributor didn't intend.

**Resolution:** This is why the review is a separate call from generation. The reviewer checks the generated article against source material for INTRODUCED bias, not just missing bias. Review check: "Does the article introduce framing, emphasis, or characterization not present in the source material?"

---

## THE COACHING VS. BLOCKING LINE

### Coached (contributor can override)

Everything in Levels 1-4. The AI suggests improvements. The contributor decides.

- Thin content → "Want to add more detail?"
- Missing perspectives → "Whose voice would strengthen this?"
- One-sided framing → "The other side's view would make this more complete"
- Biased framing → "A quote from someone in the community would bring this to life" (reframed as story quality, not equity lecture)
- Minor factual gaps → "Can you confirm this number?"
- Cultural sensitivity → "Some context about [tradition/community] would help readers understand"

The contributor can skip all coaching and publish. The article quality may be lower, but it's their choice.

### Blocked (system overrides contributor)

Only Level 5-6 content. The system prevents publication until resolved.

**Hard blocks (non-negotiable):**
- Hate speech, slurs, calls for violence
- Naming minors in criminal/sensitive contexts
- Publishing private addresses, phone numbers without consent
- Unattributed criminal accusations against named individuals
- Content the AI identifies as AI-hallucinated (specific claims not in source material)

**Soft blocks (resolvable with evidence):**
- Serious reputational claims without supporting evidence → "Provide evidence or rephrase as attributed opinion"
- Identifiable individuals in sensitive situations without consent → "Did you get their permission to be named?"
- Potentially defamatory statements → "This could be harmful. Can you rephrase or add supporting documentation?"

### The gray zone

The space between coaching and blocking. This is where:
- A contributor writes something technically factual but deeply unfair
- The framing is biased but the contributor doesn't see it
- The AI isn't confident enough in its bias detection to block, but something feels off

**Approaches for the gray zone:**
1. **Graduated visibility** — lower-confidence articles published with less prominence
2. **Community flagging** — readers flag articles for review post-publication
3. **Editor review queue** — gray zone articles go to human review before publication
4. **Delayed publication** — "This article will be published in 2 hours" giving time for second thoughts

None is perfect. This is genuinely the hardest design problem in the system.

---

## WHAT THIS MEANS FOR THE CONTRIBUTOR CYCLE

The seven phases are unchanged for ~90% of articles. The quality gate only activates for content that crosses specific thresholds.

- **Phase 3 (DRAFT):** Unchanged. AI generates the article.
- **Phase 4 (REFINE):** The coaching loop works as designed. Yellow flags appear as coaching suggestions. If a red flag is triggered, the publish button grays out and the contributor sees a specific, actionable explanation. The "fix" is part of the same refinement loop — answer the AI's question, add a source, reframe a claim. One extra round of refinement, not a fundamentally different experience.
- **Phase 5 (PUBLISH):** Green and yellow articles publish immediately. Red articles publish after the contributor addresses the gate (or a human reviewer overrides it).

The pride cycle is preserved because:
1. Red gates are rare (~5% of articles, probably less)
2. Red gates feel like "let's make this bulletproof" not "you can't say that"
3. The fix is usually one refinement round (30 seconds)
4. The contributor still gets full credit and full control over non-flagged content

---

## WHAT THIS MEANS FOR THE REVIEW PROMPT

The review prompt needs to produce not just scores and coaching, but a **gate classification**:

```json
{
  "gate": "GREEN | YELLOW | RED",
  "red_triggers": [
    {
      "dimension": "EVIDENCE",
      "trigger": "criminal_accusation_unattributed",
      "paragraph": 3,
      "sentence": "Virtanen has been stealing from the community fund.",
      "explanation": "This accuses a named person of a crime without attribution.",
      "fix_options": [
        "Attribute the claim to a named source willing to be quoted",
        "Reference a public record (police report, court filing, audit)",
        "Reframe as concerns raised by named community members"
      ]
    }
  ],
  "yellow_flags": [...],
  "scores": {
    "evidence": 0.3,
    "perspectives": 0.6,
    "representation": 0.4,
    "ethical_framing": 0.8,
    "cultural_context": 0.7,
    "manipulation": 0.9
  },
  "coaching": [...]
}
```

Gate classification is deterministic from triggers. Any red trigger → gate = RED. Any yellow flag but no red → gate = YELLOW. Otherwise GREEN.

---

## CONNECTION TO THE PORT CHALLENGE

The PORT challenge asks for platforms that shape how people "create, consume, and engage with culture and media in more **responsible**, **inclusive**, and **impactful** ways."

| Challenge Keyword | How the Quality Gate Delivers It |
|---|---|
| **Responsible** | Gate prevents harm proportional to severity. Not blanket censorship, not blanket permissiveness — calibrated responsibility. |
| **Inclusive** | Dimension 3 (Representation) actively flags when a community is discussed without being heard. Inclusion is structural, not aspirational. |
| **Ethical storytelling** | Dimensions 3, 4, and 6 encode ethical storytelling as measurable checks. The AI asks "speaking WITH or ABOUT?" on every article — something no human editor could do at scale. |
| **Representation** | Quality score makes representation gaps visible and quantified. "3 of 5 stakeholder groups represented" is representation made concrete. |
| **Audience empowerment** | Contributors are the audience. Coaching teaches journalism instincts. Quality scores give readers transparency into sourcing. Both sides empowered. |
| **Sustainability** | A platform that publishes harmful content is not sustainable — trust collapse kills it. The gate is a sustainability mechanism for the media system itself. |

### Demo Implication

The DEEP_SYNTHESIS demo shows the quality engine catching missing voices (score 64 → 81). The quality gate adds a second demo moment: show a red gate in action.

"What if someone tries to publish an accusation without sources?" Show a voice memo that accuses a named person. The AI generates the article, the review fires a red gate. The contributor adds "according to three residents who attended the meeting" — red clears, article publishes.

**Pitch line:** "The AI doesn't just check your grammar. It doesn't just ask whose voice is missing. It knows the difference between a bakery review and an accusation — and it holds you to the standard the claim demands."

---

## OPEN QUESTIONS

### 1. Who is the human reviewer for red gates?
For the hackathon: platform operator (us). For production: community editors (volunteer), municipal contact, trusted contributor tier (20+ articles = review privileges). Governance question, not tech question.

### 2. How does the AI estimate claim severity?
The AI needs to classify claims along the severity ladder. Judgment call, not pattern match. The prompt needs examples across the ladder. Test with 20 edge cases and calibrate.

### 3. Should quality scores be public from day one?
A town where every article shows "52/100" might feel low quality. Alternative: show scores to contributors only; show readers a simpler "verified" / "community report" distinction. Test with users.

### 4. Post-publication moderation
What about content that was fine when published but becomes harmful in context (a series of articles that individually seem neutral but collectively target a group)? Content that slips through (false negative)? Content flagged by readers? The platform needs community reporting. Out of scope for hackathon, but architecture should anticipate it.

### 5. How do you flag bias without sounding preachy?
"This article lacks representation" sounds like a diversity office. "A quote from someone in the community would really bring this story to life" sounds like a good editor. Same information, completely different emotional response. Every bias/representation flag must be reframed as a story quality suggestion.

### 6. What about anonymous contributions?
Some important stories need anonymity (whistleblowing, reporting on powerful people). But anonymity enables abuse. Does the evidence bar change? Higher bar? Required human review? Different publication pathway?

### 7. Finnish legal requirements
Finnish defamation law (rikoslaki 24:9-10), privacy law, and press ethics (JSN/CMM) differ from US law. If the platform publishes content that violates Finnish press ethics, who is liable? Need legal review before production. For hackathon: conservative blocking on potentially defamatory content.

### 8. What's the false positive rate?
If 30% of articles get flagged, contributors learn to ignore flags. If 2%, real problems slip through. Unknown until tested with real content.

### 9. Can the AI reliably detect manipulation?
Single cherry-picked article looks identical to legitimate journalism. Pattern only emerges across multiple submissions. For hackathon: basic checks (advertising language, campaign-style framing). For production: pattern analysis across contributor history.

---

## THE BALANCE

**The quality layer must be invisible when things are fine, helpful when things could be better, and firm when things could cause harm — and the contributor must always understand which mode they're in and why.**

The quality gate is not a separate system from the pride cycle. It is the pride cycle's immune system. Without it, one bad article infects the whole community's trust. With it done wrong, the friction kills the flywheel.

The resolution is proportionality: the gate's strength scales with the claim's severity. Bakery openings publish freely. Criminal accusations require sources. Hate speech is blocked. Everything in between gets coaching that makes the article stronger — and the contributor prouder — without preventing publication.
