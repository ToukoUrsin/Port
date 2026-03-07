# Native Virality — How the Product Grows Itself
# Date: 2026-03-07 UTC+3

The question: what mechanism built INTO the product makes it spread without marketing? Not sharecards bolted on. Something where using the product IS distribution.

---

## THE BIG IDEA: Quality Improvement = Growth

In most products, "make the product better" and "get more users" are separate problems. In the LNP, they're the same operation.

The quality engine identifies missing voices in every article. Each missing voice is a real person. Inviting that person to contribute is simultaneously:
- **Quality improvement** — the article gets better
- **User acquisition** — a new contributor joins
- **Content expansion** — their response creates more content
- **Distribution** — they share the article they're now part of

You cannot improve quality without growing. You cannot grow without improving quality. They're the same mechanism.

---

## THREE NATIVE FLYWHEELS

### 1. The Missing Voice Loop (the core engine)

This is the biggest idea. The quality engine already says "this article is missing parent voices" or "no perspective from the immigrant community." Right now, that's coaching for the contributor to fix.

Flip it: **the system invites those missing people directly.**

```
Article published
  -> Quality engine: "missing: cyclist community, parent voices"
  -> System invites those people: "A story about your school
     needs your perspective. Record 60 seconds?"
  -> They respond (low bar -- just a voice clip)
  -> AI integrates their response into the article
  -> Score: 64 -> 78
  -> Their response mentions NEW stakeholders
  -> Quality engine finds MORE missing voices
  -> Those people get invited
  -> ...
```

Why this works:
- People respond because it's about THEM and THEIR community
- The invitation isn't spam — it's "your voice matters in this specific story"
- The bar is incredibly low (60-second voice clip, no account needed)
- Every response improves the article AND recruits a new contributor
- Each new contributor's content branches into MORE missing voices

**The growth rate is proportional to the quality engine's accuracy.** Better AI = more missing voices found = more invitations = more contributors = more articles = more missing voices.

This is Wikipedia's "red links" but for people instead of topics. Red links recruited writers by showing what's missing. Missing-voice prompts recruit contributors by telling specific humans "this story about YOUR community needs YOUR voice." People are more motivated than topics.

### 2. The Mention Loop

Every article mentions real people by name — the school principal, the team captain, the shop owner. Those people will find the article (someone sends it to them, they Google themselves, they get notified).

```
Article mentions 5 people
  -> 5 people find it
  -> 5 people share it ("I'm in the newspaper!")
  -> Their networks visit the town newspaper
  -> Some become contributors
  -> Their articles mention 5 NEW people
  -> ...
```

People don't share "I used a local news app." They share "I was quoted in the Otaniemi newspaper." That's a feeling about themselves. Every person mentioned in an article is a distribution node.

The more people an article mentions, the more it spreads. And local news naturally mentions lots of local people.

### 3. The Gap Map

The newspaper doesn't just show what's covered — it shows what ISN'T.

```
COVERED THIS WEEK:
  Main hall: 4 stories
  Mentoring sessions: 2 stories

NOT COVERED:
  East campus: 0 stories
  Night shift teams: 0 stories
  International teams: 0 stories
```

The gaps are visible in the newspaper itself. Every reader who knows about an uncovered topic feels pulled to contribute. Filling a gap earns credit: "You wrote the first story about the east campus in 3 weeks."

The absence is content. The newspaper is a recruitment poster for itself.

---

## HOW THEY COMPOUND

All three flywheels feed each other:

```
Missing Voice Loop:  quality engine invites new contributors
         |
         v
Mention Loop:        their articles mention new people who share
         |
         v
Gap Map:             new articles reveal new geographic/topic gaps
         |
         v
Missing Voice Loop:  gap visibility attracts contributors who write
                     articles with their own missing voices...
```

---

## WHAT TO BUILD (minimum to activate the flywheel)

The quality engine already identifies missing voices. The flywheel needs two additions:

### Addition 1: Response Endpoint

When the quality engine says "missing: parent perspective," generate a shareable link:

```
[link] -> Landing page:
  "A story about [school board decision] needs your perspective.
   You're part of the [parent] community.
   Record 60 seconds. No account needed."

   [Record button]
```

The respondent records a voice clip. The AI integrates it as a new paragraph/quote in the article. The article's quality score goes up. The respondent is now a contributor.

### Addition 2: "Add Your Voice" on Published Articles

Every published article that has missing perspectives shows a visible prompt to readers:

```
This story is missing perspectives from:
  - Parent community
  - Teacher's union

  Were you there? [Add your voice ->]
```

Any reader can tap, record 60 seconds, and become part of the story. No account, no friction.

### Build Estimate

| Component | Hours | Notes |
|-----------|-------|-------|
| Response recording page | 2-3h | Reuse existing audio recorder component |
| AI integration of responses into articles | 2-3h | New Claude call: merge voice into article |
| "Add Your Voice" prompt on articles | 1h | Frontend, reads missing voices from review JSON |
| Invitation link generation | 1h | Backend, generates unique URL per missing-voice |
| **Total** | **6-8h** | |

---

## THE DEMO MOMENT

```
[Samu's article about PORT_2026. Quality score: 64.]
[Quality engine: "Missing: judge perspective."]

"The AI found a missing voice. Watch what happens."

[Show the invitation on screen — addressed to a judge in the room]
"A story about PORT_2026 needs your perspective. 60 seconds?"

[Judge records on their phone. AI integrates it.]
[Score: 64 -> 79. Judge's voice now in the article.]

"That judge just became a contributor. And the AI already found
the next missing voice — the organizer. Every quality check
doesn't just make the article better. It recruits the person
who makes it better. The product grows BECAUSE it improves."
```

This demonstrates the flywheel live: quality check -> identifies person -> invites them -> they contribute -> quality improves -> next missing voice found.

---

## WHY THIS IS DIFFERENT FROM "INVITE YOUR FRIENDS"

| Referral programs | The Missing Voice Loop |
|-------------------|-----------------------|
| "Invite friends for a discount" | "This story needs YOUR voice" |
| Generic, interruptive | Specific, relevant, flattering |
| Separate from core product | IS the core product (quality engine) |
| Growth team builds it | Quality engine produces it automatically |
| Works once per person | Works every article, every missing voice |
| User does the recruiting | The AI does the recruiting |

The contributor doesn't recruit. The quality engine recruits. Every quality check is a growth event. The flywheel is latent in the quality engine's existing output — it just needs to be exposed.

---

## VISUAL TECH DEPTH (from earlier discussion)

Two elements that show the flywheel AND signal technical depth:

**Quality Radar Chart** — 6-axis spider chart on every article review. Shows WHERE the gaps are visually. The before/after shape transformation (lopsided -> balanced) is the demo's visual peak. Builds in 2-3h with pure SVG.

**Pipeline Architecture Display** — During the 15-second generation wait, show the real pipeline: Audio -> Whisper -> Claude Gen -> 6-Dim Review -> Missing Voice Detection. Turns a loading screen into a tech showcase. 1-2h.

---

*"The quality engine doesn't just check articles. It identifies the specific humans whose voices would make each article better — and invites them. Every quality check is simultaneously an acquisition event. The product grows because it improves. They're the same operation."*
