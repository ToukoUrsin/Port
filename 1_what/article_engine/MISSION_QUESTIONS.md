# Top Questions About the Mission
# Date: 2026-03-07 UTC+3

The mission: contributor feels proud, reader feels interested, community feels represented. These are the questions we need to answer to make that real.

---

## 1. How do you make someone proud of something the AI wrote?

The biggest tension in the whole product. The AI transforms a rambling voice memo into a polished article. If the transformation is too large, the contributor doesn't recognize their own work — "I didn't write that, the AI did." If the transformation is too small, the output isn't good enough to be proud of.

**Where's the line?** The contributor must read the article and think "yes, that's what I meant" — not "wow, the AI is smart." The voice, the observations, the story choices must feel like THEIRS. The AI only provides structure, not substance.

**Sub-questions:**
- Should the contributor see the AI's structural choices? ("I moved your strongest quote to the opening — here's why")
- Should there be a "voice slider" — how much the AI restructures vs. preserves original flow?
- What if the contributor's input is genuinely thin? A 30-second voice clip with one fact. Does the AI pad it? (No — it should produce a short article and ask for more.)
- How do we handle the moment when a contributor reads the output and feels intimidated by their own article? ("I could never write like that") — does that create pride or imposter syndrome?

**The test:** Show 10 contributors their AI-generated articles. Ask: "Did you write this?" If they say "yes, with help" — we're right. If they say "the AI wrote it" — we've gone too far.

---

## 2. How does the AI ask for more without making people feel inadequate?

The back-and-forth is the core feature. The AI identifies what's missing and asks for it. But there's a fine line between "your article would be even better with..." and "your article isn't good enough."

**The wrong tone:**
- "Missing: parent perspective." (clinical, feels like a grade)
- "Your article lacks balance." (judgmental)
- "Error: insufficient sources." (machine language)

**The right tone:**
- "The part about the school board is strong. Do you know any parents who had a reaction? Even one quote would make this the complete picture."
- "You mentioned 3 teams — the one you quoted sounds great. Were any of the others doing something interesting? That detail could make this stand out."

**Sub-questions:**
- How many suggestions is too many? (Probably max 2-3 per round. More feels like a homework assignment.)
- Should suggestions be ranked by impact? ("This one change would raise your score the most")
- What if the contributor ignores all suggestions? Does the AI accept gracefully? (Yes. Always. No nagging.)
- Should the AI explain WHY it's asking? ("Readers trust articles more when they hear from multiple people" — is this helpful or patronizing?)
- What's the tone in Finnish? (Directness norms differ. Finnish communication tends to be more direct and less flowery than English.)

---

## 3. What makes a local news article genuinely interesting to read?

Not "informative." Not "accurate." INTERESTING. The kind of article where someone reads it and sends it to a friend.

Most local news is boring. Council voted on budget. New store opened. School had event. Technically news. Nobody cares. What makes local news interesting?

- **Specific human details.** Not "residents discussed the budget" but "Maria Korhonen stood up and said 'our children deserve better than this' while holding her grandson's hand."
- **Surprise.** Something the reader didn't know. "The 90-year-old who hasn't missed a council meeting in 30 years voted for the first time against the budget."
- **Conflict or tension.** Not manufactured drama, but real disagreement that the reader recognizes.
- **Connection to the reader's life.** "If you drive on Kauppalankatu, this affects your commute starting Monday."

**Sub-questions:**
- Can the AI identify which part of a contributor's input is most interesting? Can it tell the contributor "lead with THIS"?
- Should the AI suggest story angles? ("This could be a story about the budget, or it could be a story about a 90-year-old's lifelong dedication to civic duty. The second one is more interesting.")
- How do we prevent the AI from making things MORE interesting by adding details? (The fundamental hallucination risk — a "more interesting" article may be a less truthful one.)
- Is there a tension between "interesting" and "neutral journalism"? (Yes. The AI must make it interesting through structure and emphasis, not through editorializing.)

---

## 4. How do you build community pride in a digital newspaper?

Individual articles create individual pride. But community pride requires something more — a sense that "OUR town has a newspaper" and "WE are telling our own story."

**Sub-questions:**
- Does the newspaper need a name and identity? ("The Kirkkonummi Chronicle" vs. "kirkkonummi.lnp.app") — a name creates ownership.
- Should there be a visible contributor count? ("12 community reporters this month") — social proof that this is a community effort.
- How important is visual quality? A newspaper that looks cheap undermines community pride. A newspaper that looks like the New York Times feels aspirational and worth sharing.
- Should community milestones be celebrated? ("Your town's 100th article!" "First article from the east side in 6 months!")
- How do you handle the first week when there are only 2-3 articles? An empty newspaper creates the opposite of pride. (Seed with AI-generated summaries from public records?)
- Can the newspaper reflect local identity? (Local landmarks in the header, town colors, regional language/dialect)

---

## 5. Who decides what "represented" means?

The quality engine checks for missing perspectives and representation. But representation is culturally contextual. What counts as a "missing perspective" in Kirkkonummi is different from Atlanta.

**Sub-questions:**
- Who defines the stakeholder groups for a given community? The AI? The first contributors? A community calibration process?
- What if the community disagrees with the AI's assessment? ("The AI says we're missing immigrant voices, but there are only 3 immigrant families in our town of 2,000")
- Is the AI imposing external norms? (A review engine trained on US/English-language journalism standards applied to a Finnish small town)
- Should the representation check be adjustable per community? Or is the whole point that it surfaces what the community doesn't see?
- How do you check for Finnish-specific representation issues? (Sámi communities, Swedish-speaking Finns, Russian-speaking minority — these are invisible to a US-trained model)

---

## 6. Does the back-and-forth actually work under time pressure?

The ideal flow: contribute → AI suggests → contributor adds → AI regenerates → publish. Beautiful in theory. But in practice:

- A council meeting just ended. The contributor wants to publish NOW, while it's fresh. Will they tolerate 2-3 rounds of AI feedback?
- The contributor is on their phone, walking home. How much friction can a "quick addition" have?
- What if the AI's best suggestion requires going BACK to the event? ("Can you get a quote from the other side?") — that might be impossible.
- Is there a "quick publish" mode that skips the back-and-forth? (Probably yes. You can always improve later.)

**The tension:** Higher quality requires more interaction. But local news is time-sensitive and contributors are volunteers. Every extra step is friction that might kill the contribution entirely.

**The test:** Time 10 contributors through the full flow. If the back-and-forth adds more than 5 minutes to a 15-minute process, most people will skip it. The suggestions need to be answerable in 30 seconds or less.

---

## 7. What does "the AI is invisible" actually mean in practice?

The mission says the AI should be invisible — the contributor gets credit, the AI disappears. But the quality review is an AI feature. The coaching suggestions are an AI feature. The before/after improvement is an AI story.

**Sub-questions:**
- Do readers know the article was AI-assisted? (Transparency says yes. "AI-invisible" says no. Tension.)
- Is there a "Written by [Name], structured with AI assistance" credit line? Or just "By [Name]"?
- During the pitch, we WANT to show the AI. But in the product, we want to hide it. How do we reconcile this?
- What's the equivalent of Grammarly's approach? (Grammarly is invisible in the final output — nobody reads an email and thinks "Grammarly wrote this." But everyone knows it helped.)
- Is "AI-assisted" a mark of quality (like "professionally edited") or a mark of shame (like "ghostwritten")?

---

## Priority

If I had to pick the 3 most important to answer before building:

1. **#1 — The pride line.** How much does the AI transform? This determines the entire prompt design.
2. **#2 — The asking tone.** This determines the coaching UX. Get it wrong and the feature feels like criticism.
3. **#6 — Time pressure.** This determines whether the back-and-forth is real or theoretical. If contributors won't do it, it's a nice idea that doesn't ship.

Everything else can be iterated after launch.
