# The Contributor Cycle — How to Bring the Best Out of People
# Date: 2026-03-07 UTC+3

Synthesized from HOW_PROS_MAKE_NEWS.md and HOW_PEOPLE_WANT_NEWS.md. Not tech — just the ideal human experience.

---

## The Core Insight

Citizens are MORE interested in sharing daily life than in "journalism." The barrier isn't skill — it's that "news writing" feels like a professional activity, not a natural human activity (Robinson & DeShano 2011). The #1 barrier to contributing is time. The #2 is intimidation by journalistic standards. 63% of smartphone users have never sent a voice note.

So the product shouldn't feel like "write a news article." It should feel like **"tell your neighbors what happened."** The journalism is what the AI adds, not what the human does.

---

## The Seven Phases

### Phase 1: WITNESS

Something happens in your town. A council vote, a new shop opening, a playground being built, a weird thing at the market. Right now, this person texts a friend or posts in a Facebook group. That's the energy we want to capture — not "I should write an article" but "you won't believe what just happened."

### Phase 2: CAPTURE

Record it like you'd tell a friend. Voice memo + photos. 60-120 seconds. The input feels like a WhatsApp voice note, not a writing assignment. No forms, no fields, no "select a category." Just talk.

Voice is natural for exactly this situation — hands busy, emotion matters, too long to type but too casual for a structured form. 7 billion WhatsApp voice messages are sent daily. The input UX should feel that familiar.

Optional: add a text note ("budget vote, school cuts, heated"). But never required.

### Phase 3: DRAFT

AI transforms the raw input into a real article. ~15 seconds. The contributor sees their rambling voice memo become a headline, a lead, proper structure, their quotes attributed correctly.

**This is the first pride moment** — "it made my words sound professional."

Their name is on it. Their photos are placed. The story is recognizably theirs — their observations, their words, their perspective — but shaped into something that reads like journalism.

The AI chooses the article's structure based on the content (see OUTPUT_FORMAT.md). A council vote becomes an inverted pyramid news report. A bakery opening becomes a feature story. A 30-second clip about a new coffee shop becomes a 3-sentence brief. Each article feels crafted for its content, not stamped from a template.

### Phase 4: REFINE — The AI-Human Loop

The contributor sees the draft. Now two things can happen — and they interleave freely:

**The AI asks** (coaching): 1-2 questions, driven by curiosity, not criticism. This replaces the editor that small newsrooms lost.

The research says the top editorial feedback types are: "you buried the lede," "need another source," "what's the nut graf?" The AI handles the first and third automatically. The second — another source, a missing detail, a name — that's what it asks the contributor.

- "You mentioned the baker — do you know her first name?"
- "About how many people were at the meeting?"
- "You said the vote was heated — did anyone speak against it?"

**The contributor directs** (refinement): they see the draft and have opinions. The emphasis is wrong, a quote isn't quite right, the angle should be different.

The key design decision: **the contributor directs, the AI rewrites.** Not direct text editing — that's exactly the intimidation barrier the research identified ("I'm not a writer"). Instead, the contributor talks to the AI about the article, and the AI incorporates their direction.

Five refinement modes, all expressed as natural language (voice or text):

| Mode | Example | What happens |
|---|---|---|
| **Correction** | "She didn't say it like that, she said [records correction]" / "It was 5-2 not 3-2" | AI fixes the specific detail |
| **Direction** | "Focus more on the kids, not the vote" / "The protest is the real story, not the budget" | AI restructures with new emphasis |
| **Addition** | "I forgot to mention — there was also a vote on parking" / [records 20-second voice clip] | AI weaves new material into the article |
| **Removal** | "Don't include the part about the neighbor, she asked me not to mention her" | AI removes and adjusts surrounding text |
| **Tone** | "This sounds too formal" / "Can it feel more like a local paper?" | AI adjusts register and voice |

The interaction feels like a conversation, not an editing interface. The contributor talks to the AI about the article the way they'd talk to an editor: "Hey, can you change the opening?" Not "click edit on paragraph 1, select text, retype."

**This is the second and stronger pride moment.** The first (Phase 3) was "it made my words sound professional." The second is "I shaped it into exactly what I wanted." Now they're truly the author — not just the source of raw material, but the editorial voice that decided what the story is about.

#### The Loop Structure

```
Draft appears
  |
  v
Contributor reviews
  |
  +---> "Looks good" ---> Phase 5 (publish)
  |
  +---> Gives direction (voice/text) ---> AI regenerates ---> back to review
  |
  +---> Answers AI's coaching question ---> AI regenerates ---> back to review
  |
  +---> Both: answers question AND gives direction ---> AI regenerates ---> back to review
```

#### How Many Rounds?

Time is the #1 barrier. The loop must be fast and never feel mandatory.

- **Most articles:** 0-1 rounds. Contributor glances at draft, says "looks good" or gives one direction.
- **Some articles:** 2 rounds. Contributor refines, then answers one coaching question.
- **Rare:** 3+ rounds. Contributor really cares about this one — a story about their family's business, a council vote they're passionate about.
- **The "publish now" button is always visible.** The article is publishable from the moment the first draft appears. Every round of refinement makes it better, but none is required.

Each round takes 15-30 seconds (contributor speaks/types direction + AI regenerates). A two-round refinement adds about a minute. The total experience for most articles: **under 3 minutes from voice memo to published article.**

#### What the Contributor Learns (Without Studying)

The coaching questions teach journalism instincts through repetition:

- After 3 articles: contributor starts mentioning names without being asked
- After 5 articles: contributor naturally includes "about 30 people showed up" type details
- After 10 articles: contributor asks someone else for a quote before submitting

The AI's refinement loop is a teaching loop disguised as a conversation. The contributor never sits in a classroom. They just notice that their articles keep getting better, and the AI asks fewer questions each time.

#### Critical Design Rules for the Loop

**Additive, never critical.** "This would be even better with..." not "this is missing..." Feedback that feels like judgment kills intrinsic motivation. Feedback that feels like a mentor believing in your potential strengthens it (PMC community contribution studies).

**Celebrate first, then suggest.** Before any coaching question, acknowledge what's good. "The quote from Maria really captures the frustration. One more voice would make this complete."

**Maximum 2 coaching questions per round.** More than 2 feels like an interrogation. The AI picks the highest-impact questions only.

**The contributor always has the last word.** If they say "no, keep it as is" — that's final. The AI never insists. The article is theirs.

**Show the improvement.** When the contributor provides a correction or direction and the AI regenerates, make it visible what changed. Not a diff view (too technical) — but something like briefly highlighting the new/changed sections. The contributor sees the direct connection between their input and the output.

### Phase 5: PUBLISH

Contributor approves. Article goes live on the town's digital newspaper. One tap.

The article lives alongside other contributors' articles. Different people, different perspectives. This is not one person's blog — it's the community telling its own story. A reader browsing the newspaper sees articles by their neighbor, by a parent at their kid's school, by the retiree who always goes to council meetings.

### Phase 6: IMPACT

The contributor sees evidence that their community noticed. Not vanity metrics — real impact.

- "Your article about the school was read by 83 people in Kirkkonummi."
- "3 people shared your article."
- "You've contributed 4 articles this month."

The research is emphatic: **seeing tangible impact is the strongest retention driver.** Volunteers who feel valued show significantly higher retention (PMC studies on online community contributors). Recognition that validates intrinsic motivation strengthens it; metrics that feel transactional weaken it.

The ultimate impact moment isn't a number on a screen. It's when the contributor's neighbor says "I read your article about the playground." That moment is the product. Everything else exists to make that moment happen.

### Phase 7: RETURN

Next time something happens, the barrier is lower. They've done it once. It took 2 minutes. The article was good. Their neighbor mentioned it. They do it again.

They've also learned something. The AI's questions from Phase 4 trained their instincts without them realizing it. A contributor who has done 10 articles will naturally provide better raw material than on their first — more sources, better quotes, more context. Not because they studied journalism, but because the AI's curiosity became their curiosity.

---

## The Flywheel: A Pride Cycle, Not a Content Cycle

Content cycles optimize for volume: more articles, more engagement, more content. They burn out contributors (time constraints are the #1 barrier) and produce garbage.

A pride cycle optimizes for: **each article makes the contributor prouder than the last.**

```
1. Contributor submits
   -> article is good
   -> contributor is proud

2. Proud contributor submits again
   -> has internalized the AI's past questions
   -> naturally provides better raw input

3. Better input
   -> better article
   -> more pride
   -> more sophisticated coaching from AI

4. Community reads
   -> notices quality
   -> more people want to contribute

5. More contributors
   -> more coverage
   -> more readers
   -> more community pride

6. Community pride
   -> attracts new contributors
   -> cycle accelerates
```

The flywheel compounds. The AI is secretly teaching journalism. This is the City Bureau Documenters model — train citizens to cover their communities — but the AI replaces the 5-week training program with real-time mentorship on every submission.

---

## What the AI Replaces

The research documents what small newsrooms have lost:

| What was lost | What the AI does instead |
|---|---|
| **Copy editors** (cut more than any other role) | AI structures articles, catches style issues, writes headlines |
| **Assignment editors** (story direction) | AI helps contributors see what's interesting about their raw material |
| **The teaching function** (mentoring young reporters) | AI's coaching questions teach journalism instincts over time |
| **Fact-checking layer** (never existed at small papers) | AI flags unverified claims, acknowledges gaps, asks for sources |
| **The second pair of eyes** (most common quality safeguard) | AI review layer catches what a single person always misses |

The AI doesn't replace journalists. It replaces **the editorial infrastructure** that made journalism possible — the infrastructure that 270,000+ lost jobs took with them.

---

## Finnish-Specific Considerations

The research reveals a specific Finnish pattern:

**High civic competence but passive participation.** Finnish teenagers have excellent civic knowledge but lack interest in active participation. They're "happy with living in a steady representative democracy with functional safety networks." Nordic pupils display passivity toward direct political participation.

**Implication:** Finns will contribute if the barrier is low and the system is trustworthy, but will NOT seek out contribution opportunities actively. The system must come to them.

This means:
- **Push, don't pull.** "The council meets tonight at 18:00. Will you be there? Tap to cover it." Not "open the app and look for events to cover."
- **WhatsApp-native feel.** 89% of Finns use WhatsApp. The input UX should feel like sending a voice note in a group, not like using a special journalism app.
- **Trust by design.** Finland has the highest news trust in Europe (67%). The platform must earn that trust by producing journalism that meets Finnish quality expectations — which are high.
- **No hard paywall.** Finnish local papers are behind hard paywalls, pushing readers to free Yle. This platform is free to read. Community-funded, not subscriber-gated. The newspaper belongs to the town.

---

## The Central Tensions to Hold

### Easy in vs. quality out
A 60-second voice memo must produce something publishable. But "publishable" must still mean real journalism — attributed, structured, honest about gaps. The AI bridges this gap. The contributor's effort is low; the output quality is high.

### Coaching vs. friction
Every coaching question is friction — another step before publishing. But coaching is what makes article #10 better than article #1. The solution: coaching is always optional, always skippable, and limited to 1-2 questions maximum. The contributor who skips every question still gets a published article. The one who engages gets a noticeably better one.

### Individual pride vs. collective newspaper
Each contributor wants to feel like the author. But the newspaper works because it's collective — many voices, many perspectives. The design must make both feel true simultaneously. "I wrote this article" AND "we have a newspaper."

### AI invisible vs. AI mentor
The contributor gets full credit — "By [Name]." The AI is invisible to the reader. But to the contributor, the AI is visibly helpful — a mentor who asks good questions. The AI is invisible outward, visible inward.

### Volume vs. quality
More articles = more coverage = more readers. But bad articles = reader distrust = contributor shame. The pride cycle resolves this: quality drives volume, not the other way around. A contributor who is proud of their first article submits a second. One who is embarrassed by a bad article never comes back.

---

## What This Is NOT

- **Not citizen journalism training.** No courses, no certifications, no "learn to be a reporter." The AI teaches through doing.
- **Not a content farm.** Not optimizing for volume, SEO, or engagement metrics. Optimizing for contributor pride and community representation.
- **Not a social media platform.** No feeds, no likes, no algorithmic amplification. A newspaper. Articles, organized by community relevance.
- **Not a blog platform.** Not "post your thoughts." The AI imposes journalistic structure — neutral tone, attribution, acknowledged gaps. The output is journalism, not opinion.
- **Not AI-generated news.** The contributor is the author. The AI is the editor. The byline says their name. The story comes from their eyes, their recording, their presence at the event.
