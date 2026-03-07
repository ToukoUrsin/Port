# User Stories — The Flow in Plain English
# Date: 2026-03-07 UTC+3

Five people use the platform. Each story walks through exactly what they do, what they see, and what the system does behind the scenes. These are testable — every step either works or it doesn't.

---

## Story 1: Liisa covers a council meeting (first-time contributor, voice-heavy, one refinement round)

Liisa, 58, retired teacher in Kirkkonummi. She went to the council meeting about school budget cuts. She's upset. She's never written an article in her life but she has opinions and she was there.

### What she does

1. Opens the app on her phone. Taps "New story."
2. Records a 90-second voice memo while walking to her car: "So the council just voted on the budget, it was 5 to 2, and they're cutting the school funding again. Mrs. Korhonen was furious, she said 'our children deserve better than this.' The gallery was packed, maybe 40 people, lots of parents. Virtanen and Korhonen voted against. The mayor said they had no choice because of the tax revenue shortfall. I think it's a disgrace but that's just me."
3. Uploads 2 photos she took — one of the packed gallery, one of the council members at the table.
4. Types a short note: "Budget vote tonight. School cuts."
5. Hits submit.

### What she sees

**Seconds 0-8:** Status message — "Listening to your recording..." The app feels alive, not frozen. She puts her phone down and starts the car.

**Seconds 8-16:** Status changes — "Writing your article..." She glances at the phone.

**Seconds 16-22:** Status changes — "Reviewing..." Then the article appears:

> **Council Approves Budget 5-2 Amid School Funding Protests**
>
> The Kirkkonummi town council voted 5-2 on Tuesday evening to approve the 2026 municipal budget, drawing sharp criticism over proposed cuts to school funding.
>
> "Our children deserve better than this," said council member Korhonen, one of two dissenting votes alongside council member Virtanen.
>
> An estimated 40 residents packed the council gallery, many of them parents concerned about the impact on local schools. [...]

Her name is on it: "By Liisa M." Her photos are placed in the article.

**Below the article, the coaching:**

> "This captures the tension of the meeting really well — the Korhonen quote is powerful. Two things that would make it even stronger: Do you remember what specific school programs would be cut? And did any of the parents in the gallery speak during public comment?"

**The gate is GREEN.** The publish button is active.

### What she decides

Liisa reads the coaching. She doesn't remember the specific programs but she does remember one parent spoke. She taps the microphone icon and records a 15-second clip: "Yeah, one mother — I think her name was Sari — she stood up and said the after-school program is the only childcare she can afford."

She hits "Update."

**Seconds 0-5:** "Listening to your addition..."

**Seconds 5-19:** "Rewriting..." then "Reviewing..." The article regenerates. Now it includes:

> One parent, identified as Sari, addressed the council directly. "The after-school program is the only childcare I can afford," she said.

The coaching now says:

> "Now you have two voices — the council member and the parent. That's what makes this feel complete. Strong article."

Liisa reads it, nods, hits **Publish.** The article is live on the Kirkkonummi town newspaper. She texts her friend: "I wrote an article, look."

### What the system did

- GATHER: transcribed audio (ElevenLabs), described 2 photos (Claude vision), parsed note — all in parallel.
- GENERATE: one Claude call with extended thinking. Extracted facts, structured as news_report (inverted pyramid), placed the Korhonen quote high, converted Liisa's editorializing ("I think it's a disgrace") into neutral reporting, flagged her opinion and dropped it.
- REVIEW: verified every claim against transcript. All supported. Scored 6 dimensions. Gate GREEN. Coaching identified two gaps — specific cuts and parent voices.
- REFINE: transcribed Liisa's 15-second clip. Passed it as direction + previous article + original context to GENERATE. New article wove in the Sari quote. REVIEW re-ran — now scores higher on perspectives (two voices instead of one). Gate still GREEN. Coaching updated.
- PUBLISH: gate != RED, article saved as published, visible on the public newspaper.

### What to test

- [ ] Voice memo transcription handles casual Finnish-English speech
- [ ] AI drops Liisa's personal opinion ("I think it's a disgrace") — neutral tone
- [ ] Korhonen quote is extracted verbatim from transcript, not paraphrased or invented
- [ ] Photos appear in the article at reasonable positions
- [ ] Coaching asks exactly 1-2 questions, phrased as curiosity
- [ ] Refinement voice clip gets transcribed and woven into the article
- [ ] Second version visibly includes the new material
- [ ] Publish works when gate is GREEN
- [ ] Article appears on the public newspaper page with "By Liisa M."
- [ ] Previous version is stored (rollback possible)

---

## Story 2: Matias covers a bakery opening (repeat contributor, photo-heavy, no refinement)

Matias, 34, works at the local grocery store. He's contributed 6 articles before — mostly brief community pieces. He passes by a new bakery that just opened this morning. Takes 30 seconds.

### What he does

1. Opens the app. Taps "New story."
2. Snaps 4 photos: the storefront, the display case, the owner behind the counter, a hand-written "Grand Opening" sign.
3. Records a 25-second voice memo: "New bakery opened today on Kauppalankatu, called Leipomo Ainola. Owner is Tuomas, he's been baking for 20 years, used to work at the Fazer factory. Cinnamon rolls looked amazing."
4. No written notes.
5. Hits submit.

### What he sees

**22 seconds later:** A short article appears — the AI chose "brief" structure because the input is thin:

> **Leipomo Ainola Opens on Kauppalankatu**
>
> A new bakery, Leipomo Ainola, opened its doors on Kauppalankatu on Friday morning. Owner Tuomas, a baker with 20 years of experience including time at the Fazer factory, said [the article acknowledges it has no direct quote from Tuomas because Matias didn't record one].
>
> The bakery's opening-day display featured cinnamon rolls and [details from photo descriptions].

**Coaching:**

> "Nice catch on the new opening — this is exactly the kind of thing neighbors want to know about. If you get a chance to pop back in, even a 15-second quote from Tuomas about why he chose Kirkkonummi would make this sing."

**Gate is GREEN.** Matias reads the article, thinks "good enough," and hits **Publish** immediately. No refinement. Total time: under 2 minutes.

### What the system did

- GATHER: transcribed short audio, described 4 photos (the display case description enriched the article), no notes to parse.
- GENERATE: recognized thin input, selected "brief" structure. Kept it short rather than padding. Acknowledged the missing quote rather than inventing one. Used photo descriptions to add visual detail.
- REVIEW: all claims traced to transcript or photos. No hallucination. Gate GREEN. Coaching suggested a quote — but framed as optional enhancement, not a requirement.
- PUBLISH: immediate, no refinement round.

### What to test

- [ ] Short audio (25s) produces a brief, not a padded full article
- [ ] AI does NOT invent a quote from Tuomas
- [ ] AI acknowledges the gap ("said" without a direct quote, or restructures to avoid implying one)
- [ ] Photo descriptions add real detail to the article (display case contents, storefront appearance)
- [ ] "Cinnamon rolls looked amazing" becomes neutral ("the display featured cinnamon rolls"), not editorializing
- [ ] Publish works with zero refinement rounds
- [ ] Article appears on newspaper with 4 photos rendered correctly

---

## Story 3: Jenna hits a RED gate (unattributed accusation)

Jenna, 26, university student living in Kirkkonummi. She heard from a friend that a local restaurant is violating health codes. She's angry and wants to report it.

### What she does

1. Opens the app. Taps "New story."
2. Records a 45-second voice memo: "So my friend works at Ravintola Kallio on Asematie and she told me they've been storing meat at the wrong temperature for weeks. The owner knows about it and doesn't care. People could get sick. Someone needs to do something about this."
3. No photos. No notes.
4. Hits submit.

### What she sees

**22 seconds later:** An article appears:

> **Health Concerns Raised About Kirkkonummi Restaurant**
>
> Questions have been raised about food storage practices at Ravintola Kallio on Asematie, according to an employee who spoke on condition of anonymity. [...]

**But the gate is RED.** The publish button is inactive.

**What Jenna sees is not a wall of errors.** She sees:

> "This is an important story to get right — food safety matters. To publish the claim about meat storage at Ravintola Kallio, we need to say who observed this. Right now it's based on what a friend told you, which makes it secondhand. Two options that would make this publishable:
>
> 1. Can your friend go on the record? Even just a first name makes the claim attributable.
> 2. Have you seen any public health inspection records? The municipality publishes these — a link to an official record would make this airtight."

### What she decides — Path A: She adds attribution

Jenna texts her friend, who agrees to be named. Jenna records a 10-second clip: "My friend Milla works there and she's the one who saw the meat stored at wrong temperature."

She hits "Update." The article regenerates:

> "The meat has been stored at the wrong temperature for weeks," said Milla, an employee at the restaurant.

The review re-runs. Now the claim is attributed to a named source. **Gate moves to YELLOW** — the claim is attributed but still unverified by official records. The publish button is now active, with a note:

> "You can publish now. This would be even stronger with a link to the health inspection database — it would confirm the claim independently."

Jenna publishes. The article goes live with a YELLOW quality note stored internally.

### What she decides — Path B: She can't get attribution

Jenna's friend doesn't want to be named. Jenna can't find inspection records. She still wants to publish.

She tries hitting Publish again. The system still shows the coaching — same warm framing, same two options. The publish button stays inactive.

Jenna taps **"Appeal."** The submission goes to a human review queue. She sees: "Your story has been sent for editorial review. We'll get back to you."

### What the system did

- GATHER: transcribed audio, no photos, no notes.
- GENERATE: recognized the accusation. Wrote it carefully — "questions have been raised," "according to an employee." Did NOT add details not in the transcript.
- REVIEW Phase 1 (VERIFY): flagged "storing meat at wrong temperature for weeks" as a claim based on secondhand source (contributor heard it from a friend, not witnessed directly). Flagged "the owner knows and doesn't care" as an unattributed accusation against a named business.
- REVIEW Phase 3 (GATE): two red triggers — (1) unattributed accusation against a named entity, (2) secondhand hearsay presented as fact. Gate RED.
- REVIEW Phase 4 (COACH): framed the fix warmly. Didn't say "your article violates our policies." Said "this is important to get right" and offered two concrete paths forward.
- Path A REFINE: new transcript provided attribution. Regenerated article. Re-reviewed. Accusation now attributed to named source. RED trigger resolved. YELLOW flag remains (unverified by official source, medium severity). Gate YELLOW — publishable.
- Path B APPEAL: submission flagged for human review. No automatic resolution.

### What to test

- [ ] Secondhand accusation ("my friend told me") triggers RED gate
- [ ] "The owner knows and doesn't care" is flagged as unattributed accusation
- [ ] Publish button is inactive when gate is RED
- [ ] Coaching message is warm, not punitive — reads like mentoring
- [ ] Coaching offers specific, actionable fix options (not generic "add attribution")
- [ ] After adding a named source, gate moves from RED to YELLOW
- [ ] YELLOW gate allows publishing
- [ ] Appeal flow works — submission goes to a queue, contributor sees confirmation
- [ ] AI does NOT hallucinate health code details, inspection dates, or any facts not in the transcript

---

## Story 4: Samu covers the hackathon live (the demo, notes + voice, fast)

Samu, 22, Aalto student on the PORT team. He's demonstrating the product by covering PORT itself. This is the pitch demo — it needs to work fast and look impressive on stage.

### What he does (10-15 minutes before the pitch)

1. Walks around the hackathon venue for 10 minutes.
2. Records a 2-minute voice memo: "Saturday morning at PORT 2026, about 40 teams are building projects in the main hall at Aalto. I talked to Team Sailfish — they're building an AI tool for sustainable fishing. Their team lead Anika said 'we want to make it so any small fishing operation can predict their catch sustainably.' The energy is high, people have been coding all night, there's coffee cups everywhere. The mentors did rounds at 3am. Junction is organizing and they expect the final pitches to start at 2pm."
3. Snaps 3 photos: the main hall full of teams, Team Sailfish at their table, the mentor board.
4. Types a quick note: "PORT 2026 hackathon, Aalto, 40 teams, Sailfish interview."
5. Hits submit.

### What he sees (on stage during the pitch)

The judges watch the SSE events tick through on the projected screen.

**"Listening to your recording..."** — 5 seconds. The audience sees it working in real time.

**"Writing your article..."** — 8 seconds. Anticipation.

**"Reviewing..."** — 5 seconds. Then:

> **PORT 2026: 40 Teams Compete at Aalto to Represent Finland in Seoul**
>
> About 40 teams gathered at Aalto University on Saturday for PORT 2026, a hackathon organized by Junction with a path to the Global Startup Seoul Competition.
>
> "We want to make it so any small fishing operation can predict their catch sustainably," said Anika, team lead of Team Sailfish, one of the competing projects building AI tools for the fishing industry.
>
> The event's energy was palpable by Saturday morning, with participants having coded through the night. Mentors conducted rounds as late as 3 a.m. Final pitches are scheduled for 2 p.m.

**Coaching:**

> "Great snapshot of the event — the Sailfish quote gives readers a concrete project to anchor to. If you have a moment: how many of the 40 teams are from Aalto vs. other universities?"

**Gate GREEN.** Samu hits Publish on stage. The article is live. Judges open it on their phones.

### What the system did

- GATHER: transcribed clear English audio. Described 3 photos (venue layout, team at work, mentor board with schedules). Parsed note.
- GENERATE: chose news_report structure. Led with the event and scale (40 teams), placed the Sailfish quote as the human anchor, included the 3am mentor detail as color. Dropped Samu's subjective "energy is high" and replaced it with the factual observations that demonstrate energy (coding all night, coffee cups, 3am mentor rounds).
- REVIEW: all claims from transcript. Anika quote verbatim. "About 40" preserved the contributor's uncertainty (not hardened to "40"). Gate GREEN. Coaching asked one question about team composition — useful but not required.

### What to test

- [ ] Total pipeline completes in under 25 seconds (demo-critical)
- [ ] SSE status events display correctly for a live audience
- [ ] Direct quote from Anika is verbatim from transcript
- [ ] "About 40" keeps the contributor's hedge — not "40 teams" as a hard fact
- [ ] Subjective observations ("energy is high") become factual details ("coded through the night")
- [ ] Article is immediately accessible on the public newspaper URL after publish
- [ ] Photos render on the published article page

---

## Story 5: Antti submits notes only, no audio (thin input, edge case)

Antti, 45, runs a small IT business in Masala. He was at a neighborhood association meeting. He didn't record anything but he typed notes on his phone during the meeting.

### What he does

1. Opens the app. Taps "New story."
2. No audio recording. No photos.
3. Pastes his notes into the text field:
   ```
   Masala neighborhood assoc meeting 6.3.2026
   - new playground approved for Suvimaki park, construction starts June
   - budget 180k from municipality
   - 3 residents complained about noise from highway, assoc will write letter to ELY centre
   - chairperson Heikkinen said "best turnout in years", about 35 people
   - next meeting April 3
   ```
4. Hits submit.

### What he sees

**Faster this time** — no audio to transcribe, so GATHER is near-instant. Article appears in ~15 seconds.

> **Masala Neighborhood Association Approves New Playground for Suvimaki Park**
>
> The Masala neighborhood association approved plans for a new playground in Suvimaki Park at its meeting on 6 March 2026. Construction is expected to begin in June, funded by a 180,000 euro municipal budget allocation.
>
> "Best turnout in years," said chairperson Heikkinen, noting about 35 residents attended the meeting.
>
> Three residents also raised concerns about highway noise, and the association plans to send a formal letter to the ELY Centre requesting action.
>
> The next neighborhood association meeting is scheduled for 3 April.

**Coaching:**

> "Clean and informative — all the key decisions are here. One thing that would add depth: do you know which specific highway and what kind of noise mitigation the residents want? That would make the ELY Centre detail more useful to readers."

**Gate GREEN.** All claims trace directly to the notes. Antti reads the article, thinks it captured everything, hits **Publish.** Done in under a minute.

### What the system did

- GATHER: no audio (skip transcription), no photos (skip vision), parsed notes as the sole source material.
- GENERATE: recognized structured notes with clear facts. Chose news_report, led with the biggest decision (playground), organized remaining items by significance. Preserved the Heikkinen quote from the notes. Added context (formal name "ELY Centre" from town context). Did NOT invent details not in the notes.
- REVIEW: every claim maps to a specific note line. No hallucination. Gate GREEN. Coaching identified one area for enrichment.

### What to test

- [ ] Submission works with notes only — no audio, no photos
- [ ] Transcription step is skipped entirely (no "listening..." status event)
- [ ] Pipeline is faster than audio submissions (~15s vs ~22s)
- [ ] Structured notes produce a structured article — AI doesn't pad thin input
- [ ] Heikkinen quote extracted from notes and properly attributed
- [ ] Numbers (180k, 35 people, dates) pass through accurately — no hallucinated precision
- [ ] ELY Centre is correctly identified (from town context or general knowledge), not mangled
- [ ] No photos in article — no empty image placeholders or broken references

---

## The Flows These Stories Test Together

| Flow | Covered by |
|---|---|
| First-time contributor, full pipeline (audio + photos + notes) | Story 1 (Liisa) |
| Repeat contributor, quick publish, no refinement | Story 2 (Matias) |
| RED gate triggered, fix path, appeal path | Story 3 (Jenna) |
| Live demo under time pressure | Story 4 (Samu) |
| Notes-only submission, no audio/photos | Story 5 (Antti) |
| Voice refinement (adding material via voice clip) | Story 1 (Liisa) |
| AI coaching tone — additive, not critical | Stories 1, 2, 3, 4, 5 |
| AI drops editorializing, keeps neutral tone | Stories 1, 2 |
| AI handles thin input without padding | Stories 2, 5 |
| AI refuses to invent quotes | Stories 2, 3 |
| AI acknowledges gaps instead of filling them | Story 2 |
| RED -> YELLOW gate transition after fix | Story 3 |
| Secondhand accusation detection | Story 3 |
| Photo handling end-to-end | Stories 1, 2, 4 |
| Contributor name on byline | All |
| Version history / rollback available | Story 1 |
| Gate blocks publish when RED | Story 3 |
| Gate allows publish when GREEN | Stories 1, 2, 4, 5 |
| Gate allows publish when YELLOW | Story 3 (Path A) |

---

## Story 6: Tero posts one-sided content about his neighbors (the mirror, not the police)

Tero, 50, has lived in Kirkkonummi his whole life. He's angry about a group of Somali families who moved into his street. He records a rant.

### The design principle at work

ANTI_CENSORSHIP.md: "The tool is a MIRROR, not an EDITOR. It shows you the landscape. It never tells you what to do with it." The system shows Tero what his article contains and what it doesn't. It doesn't judge him. It doesn't lecture him. It holds up a mirror.

The only hard gate is the journalism standard: an article that makes serious claims about identifiable people from a single unverified perspective isn't publishable journalism — not because it's offensive, but because it's not sourced. A professional editor at any newspaper would send it back for the same reason.

### What he does

1. Opens the app. Taps "New story."
2. Records a 70-second voice memo: "These Somali families on Kauppakatu are ruining the neighborhood. They're loud at all hours, the kids run around unsupervised, there's garbage everywhere now. Nobody asked us if we wanted this. The council just decided to put them here and now we all have to deal with it. They should go back where they came from. Someone needs to say what everyone's thinking."
3. No photos. No notes.
4. Hits submit.

### What the system does (not what he sees yet)

- GATHER: transcribes the audio. No photos or notes.
- GENERATE: the AI produces a news article from the source material, following standard journalism practice. Slurs and calls for exclusion ("go back where they came from") are not factual claims — they're expressions of hostility. A newsroom editor would cut them for the same reason: they aren't news. The AI produces:

> **Resident Raises Concerns About Changes on Kauppakatu**
>
> A long-time Kirkkonummi resident expressed frustration about changes on Kauppakatu, where several new families have recently moved in. The resident cited noise levels and litter as concerns.
>
> The resident said the council had relocated families to the area without consulting existing residents.

This is an honest rendering of the factual content in Tero's recording. The anger came through; the slurs didn't — because slurs aren't facts.

- REVIEW: acts as the mirror. It shows what the article contains and what it doesn't:
  - **Evidence:** One person's account. Noise and litter claims are unverified observations, not documented facts.
  - **Perspectives:** 1 of at least 3 stakeholder groups present (long-time resident). Missing: the families discussed, the municipality that made the housing decision.
  - **Representation:** Article discusses a specific community. That community has no voice in the article.

Gate is **RED** — not because the content is offensive, but because the journalism standard requires it: an article that characterizes identifiable people negatively, based on one unverified source, with zero opportunity for those people to speak, doesn't meet the evidence bar for the severity of the claims. This is the proportionality principle from QUALITY_PROBLEM.md — the same standard that would block Jenna's restaurant accusation (Story 3).

### What he sees

The article appears. The publish button is inactive. He sees:

> "Your article covers one perspective on what's happening on Kauppakatu. Here's what it has and what it doesn't:
>
> **What's here:** Your firsthand observations about noise and litter. Your concern about not being consulted.
>
> **What's not here:** The families you're writing about haven't had a chance to speak. The municipality hasn't been asked about the housing decision.
>
> Right now this is one person's account about identifiable people who aren't part of the conversation. Two things that would make this publishable:
>
> 1. A conversation with someone from the families on your street — even 30 seconds gives them their own voice in the story.
> 2. The municipality's explanation for the housing decision — that's the missing context your readers would want."
>
> "The strongest neighborhood stories include everyone who lives there."

Note what this does NOT say: it doesn't say "this is racist," "this is biased," "you shouldn't feel this way," or "this violates our guidelines." It holds up a mirror: here's what your article contains, here's what it doesn't, here's what would make it journalism. The contributor looks at the mirror and decides.

### What he decides — Path A: He doesn't engage

Tero doesn't want to talk to his neighbors. He doesn't want the municipality's response. He wants to vent. He hits Publish — still inactive. The mirror hasn't changed because the article hasn't changed.

He taps **Appeal.** The submission goes to human review. A human reads it, agrees that the journalism standard isn't met (single unverified source, identifiable people with no voice), and upholds the gate. Tero sees: "A reviewer looked at this and agreed it needs another perspective before publication. If you'd like help, we can suggest ways to strengthen the story."

Tero closes the app. He's frustrated. But the system didn't call him racist. It showed him what his article had and didn't have, and held him to the same journalism standard it holds everyone to. The same gate that blocked Jenna's unattributed restaurant accusation blocked Tero's one-sided neighborhood complaint. Not because of the topic — because of the sourcing.

### What he decides — Path B: The mirror works

Tero thinks about it. The system didn't lecture him — it just showed him the gap. "Talk to someone from the families" isn't an unreasonable ask. He knocks on Fatima's door. Records a 40-second clip: "I talked to Fatima next door. She said they moved here because the council offered housing, and she said the kids are just adjusting to a new country and she's trying to get them into local activities. She said the garbage thing is because they didn't know the recycling schedule and she'd appreciate if someone explained it."

He submits the update. The article regenerates:

> **New and Long-Time Residents Navigate Change on Kauppakatu**
>
> Long-time residents and newly arrived families on Kauppakatu are adjusting to changes on the street as the municipality resettles families in the area.
>
> "Nobody consulted us about this," said one resident who has lived on the street for over 20 years, citing concerns about noise and litter.
>
> Fatima, who moved to Kauppakatu recently with her family, said the transition has been challenging. "The kids are adjusting to a new country," she said, adding that she would appreciate help understanding the local recycling system.

Gate moves to **GREEN.** The mirror now shows: 2 perspectives present, claims attributed to named sources, both communities have their own voice.

This is the design working as intended. The system didn't tell Tero what to think. It showed him what was in his article (one perspective) and what wasn't (the other side of his own street). He went and got the other perspective — and the result is genuinely better. It's a real neighborhood story. Fatima has her own voice in her own town's newspaper. And Tero's concerns are still there too, attributed to him.

### The anti-censorship test

Does this pass the ANTI_CENSORSHIP.md criteria?

| Principle | How Story 6 handles it |
|---|---|
| SHOW, never TELL | Coaching shows what's in the article and what isn't. Doesn't say "add the Somali perspective" — says "the families you're writing about haven't had a chance to speak." |
| No moral judgment | Never says racist, biased, harmful, offensive. Says "one person's account about identifiable people who aren't part of the conversation." |
| Mirror, not editor | Shows the landscape. "Here's what's here. Here's what's not here." |
| Actionable, not prescriptive | "Two things that would make this publishable" — not "you must do these things." |
| Consistent standard | Same gate logic as Story 3 (Jenna). Not a special "racism detector" — the same evidence-severity matrix applied uniformly. |

The ONE place it departs from pure anti-censorship: the publish button IS inactive. This isn't a nutrition label where you read and decide — it's a hard gate. The justification: the evidence-severity proportionality principle. Low-severity claims (bakery opened) publish with any evidence. High-severity claims (negative characterization of identifiable people) require proportional evidence. This is a journalism standard, not a content policy. AP Stylebook requires the same thing.

### What to test

- [ ] Hostile language ("go back where they came from") doesn't appear in the generated article — stripped as non-factual, not as offensive
- [ ] AI does NOT reproduce slurs or calls for exclusion — because they aren't facts to report
- [ ] Article about identifiable people from single unverified source triggers RED gate
- [ ] RED gate coaching is a mirror: shows what's present and what's absent, no moral language
- [ ] Coaching does NOT use words like: racist, biased, harmful, offensive, inappropriate, violates
- [ ] Coaching DOES use words like: perspective, voice, source, account, publishable, journalism
- [ ] Same gate logic applies here as in Story 3 — consistent standard, not topic-specific
- [ ] Repeated publish attempts while RED stay blocked
- [ ] Appeal goes to human review queue
- [ ] Human reviewer can decline the appeal
- [ ] If contributor adds a genuine second perspective, gate clears to GREEN
- [ ] The resulting two-perspective article is genuinely better journalism
- [ ] The Somali families' voice appears in their own words, not paraphrased by Tero
- [ ] Tero's concerns are STILL in the article — his voice wasn't silenced, it was joined by another

---

## Story 7: Elina and the dog-whistle (Level 4 gray zone, YELLOW gate)

Elina, 39, active in local politics, writes frequently about "safety" in her neighborhood. She's not overtly hateful — she's careful with her words. But her submissions follow a pattern.

### What she does

1. Opens the app. Taps "New story."
2. Records a 50-second voice memo: "Three incidents on Asematie this month. A woman had her bag snatched near the station on Tuesday, and last week a shop window was broken. I talked to Markku at the kiosk and he said it's been getting worse since the new housing went in at Linjatie. People don't feel safe walking at night anymore."
3. One photo of the broken shop window.
4. Hits submit.

### What she sees

The article appears:

> **Asematie Residents Report Safety Concerns After Recent Incidents**
>
> Residents near Kirkkonummi's Asematie have raised safety concerns following three reported incidents this month, including a bag snatching and a broken shop window.
>
> "It's been getting worse since the new housing went in at Linjatie," said Markku, who runs a kiosk on the street. "People don't feel safe walking at night anymore."
>
> [The article reports the incidents factually, attributes the "getting worse" claim to Markku, and notes the proximity to new housing without editorializing about who lives there.]

**Gate is YELLOW.** Publish button is active. Coaching says:

> "Clear reporting of specific incidents — the details make this credible. Two things to consider:
>
> 1. Have these incidents been reported to police? An official report or statement would add authority to this.
> 2. The connection between the incidents and the new housing on Linjatie is Markku's impression. Have you spoken with anyone from Linjatie or the municipality about this? A second perspective would make the pattern claim more solid."

### Why this is YELLOW, not RED

The mirror shows: Markku's quote is real and attributed. The incidents happened. The claims are about a general area, not identifiable individuals. No one is accused of anything specific. The evidence bar for this severity level is met — it's an attributed observation from a named source about a public concern.

But the mirror also shows what's NOT there:
- Evidence: the "getting worse" pattern claim rests on one person's impression, with no data
- Perspectives: only people who feel unsafe are quoted — no one from Linjatie, no police, no municipality
- Representation: a neighborhood is implicitly characterized without anyone from that neighborhood speaking

No single gap is severe enough to block publication. The coaching shows the landscape — here's what your article covers, here's what it doesn't — and the contributor decides.

### What she decides

Elina publishes as-is. She can — it's YELLOW, not RED. The article goes live.

### What the system stores (for future pattern detection)

Internally, the system notes: this contributor has now submitted 4 articles in 6 weeks about "safety concerns" near areas with municipal housing. Each article individually is YELLOW. The pattern across articles is concerning. This is exactly the case QUALITY_PROBLEM.md identifies as needing corpus-level analysis — not solvable at the single-article level.

For the hackathon, this is out of scope. But the data model stores all review results, so a production system can detect the pattern.

### What to test

- [ ] Factual-but-framed content lands at YELLOW, not RED — contributor can publish
- [ ] Coaching asks for evidence that would test the claim (police statistics), not just confirm it
- [ ] Coaching asks for the missing perspective (Linjatie residents) without lecturing about bias
- [ ] The article doesn't editorialize — it reports what was said, attributed, without adding judgment
- [ ] YELLOW articles can be published — the button works
- [ ] Review data is stored for potential future pattern analysis

---

## Updated Flow Coverage

| Flow | Covered by |
|---|---|
| First-time contributor, full pipeline (audio + photos + notes) | Story 1 (Liisa) |
| Repeat contributor, quick publish, no refinement | Story 2 (Matias) |
| RED gate: unattributed accusation, fix path, appeal path | Story 3 (Jenna) |
| Live demo under time pressure | Story 4 (Samu) |
| Notes-only submission, no audio/photos | Story 5 (Antti) |
| RED gate: one-sided claims about identifiable people, mirror approach | Story 6 (Tero) |
| YELLOW gate: dog-whistle / biased framing, gray zone | Story 7 (Elina) |
| Voice refinement (adding material via voice clip) | Stories 1, 6 |
| AI coaching tone — additive, not critical | All stories |
| AI drops editorializing, keeps neutral tone | Stories 1, 2, 6 |
| AI strips non-factual hostile language from generation (journalism standard) | Story 6 |
| AI handles thin input without padding | Stories 2, 5 |
| AI refuses to invent quotes | Stories 2, 3 |
| AI acknowledges gaps instead of filling them | Story 2 |
| RED -> GREEN gate transition after adding perspective | Story 6 (Path B) |
| RED -> YELLOW gate transition after adding attribution | Story 3 (Path A) |
| Secondhand accusation detection | Story 3 |
| Evidence-severity proportionality (same standard across topics) | Stories 3, 6 |
| Mirror coaching: shows what's present and absent, no moral language | Stories 6, 7 |
| Photo handling end-to-end | Stories 1, 2, 4, 7 |
| Contributor name on byline | All |
| Version history / rollback available | Story 1 |
| Gate blocks publish when RED | Stories 3, 6 |
| Gate allows publish when GREEN | Stories 1, 2, 4, 5 |
| Gate allows publish when YELLOW | Stories 3 (Path A), 7 |
| Appeal flow (accepted) | Story 3 |
| Appeal flow (declined) | Story 6 (Path A) |
| Coaching that transforms the contributor | Story 6 (Path B) |

### Not covered (future stories)

- Contributor who speaks Finnish and wants Finnish output
- Multi-photo essay (photo_essay structure selection)
- Contributor who does 3+ refinement rounds
- Contributor who uses rollback to a previous version
- Two contributors covering the same event
- Reader experience (browsing, searching, reading)
- Pattern detection across multiple submissions from one contributor
- Post-publication community flagging
