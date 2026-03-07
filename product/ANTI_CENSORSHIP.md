# ANTI-CENSORSHIP DESIGN: The Hard Constraint

This is a hard design constraint, not a risk to mitigate. If the tool SOUNDS like censorship -- even slightly -- it's dead. Dead with journalists (who will refuse it on principle), dead with politicians (who will legislate against it), dead with users (who will see it as thought police), dead at a pitch ("isn't this just AI telling people what to write?").

---

## Why It Can't Sound Like Censorship

Every actor in the media ecosystem has been burned by censorship concerns:
- Journalists fought for editorial independence for centuries. They won't hand it to an algorithm.
- Platforms are being attacked for BOTH "censoring too much" AND "not moderating enough." They want nothing that adds to either accusation.
- Creators see AI writing tools as threatening their voice. "AI told me to add a paragraph" = creative death.
- Regulators are split: EU DSA wants transparency, but nobody wants government-mandated perspective requirements.

---

## Core Design Principle: SHOW, NEVER TELL

The tool SHOWS what exists. It NEVER says what should be included.

```
WRONG: "You should add the disability perspective."
RIGHT: "The disability community is a stakeholder in AI hiring.
        This perspective is not present in your draft."

WRONG: "Your article is biased."
RIGHT: "Your article covers 4 of 9 identified perspectives on this topic."

WRONG: "This claim is false."
RIGHT: "This claim cites a 2017 estimate. A 2023 revision puts the figure lower."

WRONG: "Fix these issues before publishing."
RIGHT: "Here's what your draft covers and what it doesn't. You decide."
```

The tool is a MIRROR, not an EDITOR. It shows you the landscape. It never tells you what to do with it.

---

## The Nutrition Label Analogy

Nutrition labels don't tell you what to eat. They show you what's in the food. You decide.

- Nutrition labels are NOT censorship of food
- Energy ratings are NOT censorship of appliances
- Ingredient lists are NOT censorship of products
- Content quality scores are NOT censorship of articles

The tool adds information. It removes nothing. It blocks nothing. It changes nothing in the text.

A creator who runs the check and publishes at 3/9 perspectives has CHOSEN to publish with that coverage. The tool respects that choice completely. It just made the choice INFORMED rather than blind.

---

## The "Both Sides" Test

**Right wing test:** A conservative creator runs the tool on a liberal article about gun control. The tool shows: "Missing perspectives: gun rights advocates, rural community, law enforcement, self-defense advocates." The conservative says: "Finally, a tool that shows what liberals are leaving out!"

**Left wing test:** A progressive creator runs the tool on a conservative article about immigration. The tool shows: "Missing perspectives: asylum seekers, immigration attorneys, affected communities, economic research on immigration impact." The progressive says: "This shows what they're ignoring!"

The tool is USEFUL to everyone precisely because it's neutral about what SHOULD be included. It just shows what IS and ISN'T there. Both sides use it to identify the OTHER side's blind spots.

---

## Six Non-Negotiable Product Rules

1. **No "fix" button.** The tool never auto-generates content to fill gaps. It shows gaps. The creator writes the content (or doesn't).

2. **No minimum score requirement.** There's no threshold below which you can't publish. You can publish at 1/9. The tool doesn't care.

3. **No "required perspectives."** The perspective list is descriptive ("these perspectives exist on this topic") not prescriptive ("you must include these").

4. **Full transparency.** The user can see HOW the tool identified each perspective and WHY it thinks a perspective is missing. No black box.

5. **"I disagree" button.** User can flag any perspective as irrelevant for their piece. This feeds back into the model AND shows the tool respects editorial judgment.

6. **Opinion mode.** When a creator marks their piece as "opinion/editorial," the tool adjusts: it shows what perspectives exist but explicitly notes "opinion pieces are expected to represent a particular viewpoint."

---

## Pitch Language That Pre-Empts Censorship

**DON'T say:** "We help you write better articles." (Implies judgment on quality.)
**DO say:** "We show you the full perspective landscape. You decide what to cover."

**DON'T say:** "Our tool catches bias." (Implies the tool defines what's biased.)
**DO say:** "Our tool shows what perspectives exist on a topic and which ones your draft addresses."

**DON'T say:** "Fix your blind spots." (Implies you're wrong.)
**DO say:** "See what you might be missing. Your call."

**The golden pitch line:** "We don't tell you what to write. We show you what's out there. Like a map -- it shows you the roads. You choose where to drive."
