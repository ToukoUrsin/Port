# Interaction Model — How the Contributor Talks to Their Article
# Date: 2026-03-07 UTC+3

The contributor never sees markdown. The contributor never sees a text editor. The article is always a rendered newspaper page. The only way to change it is to POINT at something and TELL the AI what should be different. This document specifies how.

---

## The Core Decision

The article is read-only but selectable. The contributor can select text (desktop) or tap a paragraph (mobile) and give a voice or text instruction about that specific selection. The AI modifies just that part. The rest stays untouched.

This is not editing. This is directing. The contributor says "this part here — she actually said 'can't afford' not 'can't find'" and the AI fixes it. They never type replacement text. They never see markdown. They never see a cursor.

The metaphor: pointing at a newspaper and telling your editor what should change.

---

## Why Not Expose Markdown?

We looked at every major markdown editor to understand what's available:

### The Landscape (2025-2026)

**Typora-style inline rendering (markdown disappears as you type):**
- **Typora** — the gold standard. `# Heading` vanishes into a rendered heading. Click to edit, raw syntax reappears. Desktop only, proprietary ($15).
- **Vditor** — the only browser-based editor with Typora's "Instant Rendering" mode. MIT license, React wrapper available. Three modes: WYSIWYG, IR (instant rendering), split view.
- **Mark Text** — open-source Typora clone. Desktop only (Electron). MIT.

**WYSIWYG editors (rich text, markdown as import/export):**
- **Tiptap** — most mature. ProseMirror-based. Used by The Guardian, NYT, GitLab. React/Vue/Svelte. MIT core. Notion-like template available.
- **Milkdown** — headless, ProseMirror + remark. Typora-inspired. Total visual control. MIT. Bare-bones React integration (you build the UI).
- **MDXEditor** — built on Lexical (Meta). True inline WYSIWYG for MDX. React-native. MIT.
- **Novel** — Notion-style with AI autocomplete. Tiptap + OpenAI. Beautiful defaults. Apache-2.0.
- **BlockNote** — Notion-style blocks on ProseMirror + Tiptap. Most out-of-box features. MPL-2.0.
- **Yoopta Editor** — 20+ plugins, each block runs its own Slate.js instance. MIT. Export to markdown/HTML/plaintext.

**Split-pane editors (raw left, preview right):**
- **StackEdit** — classic browser editor. Cloud sync. Apache-2.0. Not embeddable.
- **ByteMD** — Svelte-based, compiles to vanilla JS. React wrapper. MIT. Lightweight.
- **Toast UI Editor** — dual-mode (MD + WYSIWYG). Charts/UML. MIT. Development slowed.

**Underlying frameworks:**
- **Lexical** (Meta) — powers Ghost's new editor, MDXEditor, Facebook's own editors. MIT. React bindings.
- **ProseMirror** — powers Tiptap, Milkdown, BlockNote. The foundation of most modern rich text editors.

**For rendering (reading, not editing):**
- **Tailwind Typography** — `prose` class gives beautiful typographic defaults to any HTML from markdown. Dark mode, size modifiers. Already in our stack.
- **Prose UI** — React components for MDX rendering with code highlighting, callouts, math.
- **react-markdown** — renders markdown to React components. Already specified in FRONTEND_CONTRACT.md.

### How Ghost, Notion, and Obsidian Handle Raw vs. Rendered

| Product | Approach | Raw Markdown Visible? |
|---------|----------|----------------------|
| **Ghost (Koenig/Lexical)** | Block-based WYSIWYG. No raw mode. Markdown available only as a special card type (CodeMirror). | Never (except in markdown card) |
| **Notion** | WYSIWYG with markdown shortcuts. Type `# ` → heading appears, syntax vanishes. | Never. Markdown is input, not display. |
| **Obsidian** | Three modes: Source (raw), Live Preview (Typora-style), Reading View (rendered). Live Preview is default — syntax appears only when cursor enters an element. | Yes, but hidden by default in Live Preview |

### The Decision: Ghost/Notion Model, Not Obsidian

Our contributors are Liisa (58, retired teacher), Matias (34, grocery worker), and Tero (50, lifelong resident). They will never type `## Heading` or `**bold**`. Showing them markdown — even elegantly like Typora or Obsidian Live Preview — would break the illusion that they just wrote a newspaper article.

Ghost got this right: the editor IS the rendered view. There is no "source mode." Markdown is the storage format, not the user-facing format.

We go further than Ghost: our contributor doesn't even edit the rendered view. They DIRECT the AI to change it. This is more accessible than any editor — you don't need to know how to write, you need to know how to talk.

**Hidden escape hatch:** A small `</>` icon buried in a menu (not visible by default) opens the raw markdown for power users. This is for Samu (the tech student) and future editors, not for the core flow. Implementation priority: last.

---

## The Four Interaction Modes

The contributor has four ways to request changes, covering every scenario from the user stories:

### Mode 1: Select + Instruct (targeted fix)

**When:** The contributor sees something specific they want changed — a wrong name, an awkward phrase, a missing detail in one paragraph.

**Desktop:** Select text with mouse/trackpad → floating bar appears above selection.
**Mobile:** Tap a paragraph → paragraph highlights with subtle border → action bar slides up below it.

```
Desktop:
  "council member Korhonen, one of two dissenting"
                ━━━━━━━━━━━━━━━
          [Mic] [Type instruction...] [Not accurate] [Rephrase]

Mobile:
  ┌─────────────────────────────────────┐
  │ "Our children deserve better than   │
  │ this," said council member Korhonen,│ ← highlighted paragraph
  │ one of two dissenting votes...      │
  └─────────────────────────────────────┘
  [Mic]  [Type...]  [Not accurate] [Rephrase]
```

**What gets sent to the backend:**

```typescript
type TargetedRefinement = {
  selected_text: string;       // the highlighted text
  instruction: string;         // voice transcription or typed text
  paragraph_index: number;     // which paragraph (for context)
};
```

**Example — Liisa (Story 1):** Selects "council member Korhonen" → records: "She's not a council member, she's a parent who stood up." → AI fixes just that reference. The rest of the article stays identical.

**Example — Samu (Story 4):** Selects the headline → taps "Rephrase" → AI generates 2-3 alternatives → he picks one. Done in 5 seconds.

### Mode 2: Quick Action Chips (one-tap operations)

Chips appear alongside the mic/text input when text is selected:

| Chip | What it does | When to use |
|------|-------------|-------------|
| **Not accurate** | Prompts: "What actually happened?" (mic or text) | A fact is wrong |
| **Add detail** | Prompts: "What detail is missing?" (mic or text) | Paragraph is too thin |
| **Rephrase** | AI automatically rephrases the selection, shows 2-3 options | Awkward wording |
| **Remove** | Removes the selected text from the article | Something shouldn't be there |

The chips are context-sensitive shortcuts. They reduce the common cases to one or two taps.

"Not accurate" and "Add detail" open the mic/text input with a pre-filled prompt. "Rephrase" and "Remove" are immediate — the AI acts without further input.

**Mobile simplification:** On screens <768px, only show "Not accurate" and "Rephrase" as chips. Other actions through the mic/text input.

### Mode 3: Coaching-Anchored Suggestions (system-initiated)

The coaching panel doesn't just say "the families you're writing about haven't had a chance to speak." It links to the specific paragraph it's about. Tapping the coaching suggestion:

1. Scrolls the article to the relevant paragraph
2. Highlights that paragraph
3. Opens the instruction bar anchored to it

This turns the coaching from passive text into an interactive guide. The contributor reads the suggestion, taps it, sees the relevant text highlighted, and can immediately record a response.

```
COACHING PANEL:                        ARTICLE (after tap):

  "The Korhonen quote really           ┌───────────────────────┐
   captures the tension."              │ "Our children deserve │
                                       │ better than this,"    │ ← highlighted
  Two things that would make           │ said Korhonen...      │
  it even stronger:                    └───────────────────────┘

  1. Do you remember what    ←tap      [Mic] [Type...] [Add detail]
     specific programs
     would be cut?

  2. Did any parents speak   ←tap      (scrolls to relevant paragraph)
     during public comment?
```

**Implementation:** Each coaching suggestion includes a `paragraph_ref` (0-indexed paragraph number from the article markdown). The frontend maps this to the rendered paragraph and adds click-to-scroll behavior.

```typescript
type CoachingSuggestion = {
  text: string;
  paragraph_ref?: number;  // which paragraph this suggestion is about
};
```

**For RED gate coaching:** The "What's here / What's not here" mirror text also links to specific paragraphs. Tero (Story 6) sees "one perspective on what's happening on Kauppakatu" linked to the paragraph that contains only his perspective. The fix options ("a conversation with someone from the families") anchor to the same paragraph — tap to add material there.

### Mode 4: General Voice/Text (adding new material)

The sidebar input from the current FRONTEND_CONTRACT.md spec. For adding information that isn't in the article yet — new facts, new quotes, new context from a second conversation.

**When:** Liisa records "Yeah, one mother named Sari spoke up and said the after-school program is the only childcare she can afford." This isn't about fixing existing text — it's new material the AI should weave in.

**Where:** The coaching sidebar, below the coaching text. Same as currently specified: mic button + text area + "Update article" button.

**What gets sent:**

```typescript
type GeneralRefinement = {
  voice_clip?: Blob;       // voice recording
  text_note?: string;      // typed text
  // No selected_text, no paragraph_index — this is general
};
```

**The AI regenerates the full article** when it receives general input, because it needs to decide WHERE to place the new material. Targeted refinements (Mode 1) only affect the specific section.

---

## How the Modes Work Together

| User story moment | Mode | What happens |
|-------------------|------|-------------|
| Liisa sees "council member Korhonen" is wrong | **Select + Instruct** | Selects text, records correction, AI fixes just that |
| Liisa wants to add Sari's quote (new info) | **General** | Records in sidebar, AI regenerates to weave in new quote |
| Samu wants a different headline before demo | **Select + Rephrase chip** | Selects headline, taps Rephrase, picks from options |
| Tero sees RED coaching about missing perspectives | **Coaching-Anchored** | Taps coaching suggestion, scrolls to paragraph, records Fatima interview |
| Matias thinks a paragraph is too long | **Select + Remove** | Selects the excess text, taps Remove |
| Jenna needs to add attribution to fix RED gate | **Coaching-Anchored → General** | Taps coaching, sees the unattributed paragraph, records attribution in sidebar |
| Antti notices a wrong date in the article | **Select + Not accurate chip** | Selects the date, taps Not accurate, types "it was March 6 not March 5" |
| Elina wants to publish YELLOW as-is | **None** | Hits Publish. No refinement needed. |

---

## The Floating Instruction Bar

The component that appears on text selection (desktop) or paragraph tap (mobile).

### Desktop Version

```
┌─────────────────────────────────────────────────────┐
│  [🎤]  [What should change?................]  [→]  │
│                                                      │
│  [Not accurate]  [Add detail]  [Rephrase]  [Remove] │
└─────────────────────────────────────────────────────┘
```

- Appears above the selection (like a tooltip), connected by a small arrow
- Mic button on the left — tap to record, tap again to stop
- Text input in the middle — for typing a quick instruction
- Submit arrow on the right
- Chips below the input row
- Clicking outside dismisses it

### Mobile Version

```
┌─────────────────────────────────┐
│ ▉ highlighted paragraph         │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  [🎤]  [What should change?..]  │
│  [Not accurate]    [Rephrase]   │
│            [Update]             │
└─────────────────────────────────┘
```

- Slides up from below the highlighted paragraph
- Fewer chips (only 2 on mobile to save space)
- Voice is primary (mic button is prominent)
- "Update" button to submit

### CSS

```css
.instruction-bar {
  position: absolute;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: var(--space-3);
  z-index: 50;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  max-width: 400px;
}

.instruction-bar-input {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.instruction-bar-chips {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.instruction-chip {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  cursor: pointer;
  white-space: nowrap;
}
.instruction-chip:hover {
  background: var(--color-bg-tertiary);
}

/* Highlighted paragraph state */
.paragraph-highlighted {
  background: var(--color-primary-light);
  border-radius: var(--radius-sm);
  transition: background var(--transition-base);
}

/* Mobile: bar below paragraph instead of floating */
@media (max-width: 767px) {
  .instruction-bar {
    position: relative;
    max-width: 100%;
    border-radius: var(--radius-md);
    margin-top: var(--space-2);
  }
}
```

---

## Rephrase Flow (Multi-Option)

When the contributor taps "Rephrase" on a selection, the AI generates 2-3 alternatives. These appear in the instruction bar as selectable options:

```
Original: "council member Korhonen, one of two dissenting votes"

  ┌─────────────────────────────────────────────┐
  │  Pick a version:                            │
  │                                             │
  │  ○ "Korhonen, who voted against the budget" │
  │  ○ "dissenting council member Korhonen"     │
  │  ○ "Korhonen, one of two no votes"          │
  │                                             │
  │  [Keep original]                [Apply]     │
  └─────────────────────────────────────────────┘
```

This is the ONLY place the contributor picks between text options. And they're picking from AI-generated alternatives — they never write the text themselves.

**Backend:** `POST /submissions/:id/rephrase` with `{ selected_text, paragraph_index }` → returns `{ options: string[] }`. This is a lightweight Claude call (no full regeneration).

---

## What This Means for the Backend

### New Endpoint: Targeted Refinement

```
POST /submissions/:id/refine
Content-Type: application/json

{
  "type": "targeted",
  "selected_text": "council member Korhonen",
  "instruction": "She's a parent, not a council member",
  "paragraph_index": 2
}
```

The generation prompt includes the targeted context: "The contributor selected '{selected_text}' in paragraph {n} and said: '{instruction}'. Modify ONLY that section. Keep the rest of the article unchanged."

### New Endpoint: Rephrase Options

```
POST /submissions/:id/rephrase
Content-Type: application/json

{
  "selected_text": "council member Korhonen, one of two dissenting votes",
  "paragraph_index": 2
}

Response:
{
  "options": [
    "Korhonen, who voted against the budget",
    "dissenting council member Korhonen",
    "Korhonen, one of two no votes"
  ]
}
```

Lightweight Claude call — system prompt: "Generate 3 alternative phrasings for this text within the context of the surrounding paragraph. Keep the same meaning. Vary the style."

### Updated Refinement Endpoint: General

```
POST /submissions/:id/refine
Content-Type: multipart/form-data  (if voice clip)
Content-Type: application/json     (if text only)

{
  "type": "general",
  "text_note": "One mother named Sari spoke up..."
}
// OR FormData with voice_clip + type=general
```

The `type` field distinguishes targeted from general refinement. General triggers full GENERATE + REVIEW. Targeted triggers a focused edit + REVIEW.

### Coaching with Paragraph References

The review prompt now asks Claude to include paragraph references in coaching suggestions:

```json
{
  "coaching": {
    "celebration": "The Korhonen quote really captures the tension.",
    "suggestions": [
      {
        "text": "Do you remember what specific programs would be cut?",
        "paragraph_ref": 2
      },
      {
        "text": "Did any parents speak during public comment?",
        "paragraph_ref": 4
      }
    ]
  }
}
```

---

## Rendering Technology

### For the Article Display

**react-markdown** (already specified in FRONTEND_CONTRACT.md) renders the article. Combined with Tailwind Typography `prose` classes for beautiful defaults:

```tsx
<article className="prose prose-lg prose-serif">
  <ReactMarkdown>{articleMarkdown}</ReactMarkdown>
</article>
```

Or with our custom CSS (already specified in FRONTEND_CONTRACT.md Section 4.3) using design tokens for the newspaper feel — `--font-serif`, `--leading-relaxed`, etc.

### For Text Selection Detection

```typescript
function useTextSelection(articleRef: RefObject<HTMLElement>) {
  const [selection, setSelection] = useState<{
    text: string;
    rect: DOMRect;
    paragraphIndex: number;
  } | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const container = articleRef.current;
      if (!container?.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }

      // Find which paragraph the selection is in
      const paragraphs = container.querySelectorAll('p, blockquote, h1, h2, h3');
      let paragraphIndex = -1;
      paragraphs.forEach((p, i) => {
        if (p.contains(range.startContainer)) paragraphIndex = i;
      });

      setSelection({
        text: sel.toString(),
        rect: range.getBoundingClientRect(),
        paragraphIndex,
      });
    }

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [articleRef]);

  return selection;
}
```

### For Paragraph Tap (Mobile)

```typescript
function useParagraphTap(articleRef: RefObject<HTMLElement>) {
  const [tappedParagraph, setTappedParagraph] = useState<{
    index: number;
    element: HTMLElement;
    rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    function handleClick(e: Event) {
      const target = e.target as HTMLElement;
      const container = articleRef.current;
      if (!container) return;

      // Find the closest paragraph-level element
      const paragraph = target.closest('p, blockquote, h1, h2, h3');
      if (!paragraph || !container.contains(paragraph)) {
        setTappedParagraph(null);
        return;
      }

      const paragraphs = container.querySelectorAll('p, blockquote, h1, h2, h3');
      let index = -1;
      paragraphs.forEach((p, i) => {
        if (p === paragraph) index = i;
      });

      setTappedParagraph({
        index,
        element: paragraph as HTMLElement,
        rect: paragraph.getBoundingClientRect(),
      });
    }

    // Only activate on touch devices
    if ('ontouchstart' in window) {
      articleRef.current?.addEventListener('click', handleClick);
    }
    return () => articleRef.current?.removeEventListener('click', handleClick);
  }, [articleRef]);

  return tappedParagraph;
}
```

---

## What We Looked At But Decided Against

### Full Markdown Editor (Typora/Vditor/Milkdown)

Any editor that shows or hides markdown syntax fails the Liisa test. She's 58, never written an article. Even Typora's elegant inline rendering — where `#` appears when you click a heading — would confuse her. The article should look like a newspaper at all times.

### Block-Based Editor (BlockNote/Yoopta/Tiptap)

The current PostPage already has a block editor and it's what we're removing. Block editors assume the user is composing. Our contributor isn't composing — they're reviewing what the AI wrote. Drag handles, slash menus, and type selectors are tools for writers. Our contributors are directors.

### Direct Text Editing (contentEditable)

If you let the contributor click into the article and type, you've built a CMS. The whole design philosophy — "the contributor directs, the AI executes" — exists to lower the intimidation barrier. "I'm not a writer" is the fear. Read-only article + voice instruction removes that fear. The contributor talks about what should change, not how to change it.

### Split Pane (StackEdit/ByteMD)

Raw markdown on the left, preview on the right. This is a developer tool. Nobody in our user stories would benefit from seeing the source.

---

## Component Architecture — The Editor as a Decoupled Module

The editorial screen is the product's core innovation. It should be a self-contained module with clean boundaries: props in, callbacks out, no knowledge of auth, SSE, routing, or API implementation. This lets it be tested in isolation, embedded in different contexts, and worked on independently.

### File Structure

```
components/
  editor/                        ← the decoupled module
    EditorialScreen.tsx           ← top-level: receives data, emits actions
    ArticleRenderer.tsx           ← renders markdown as newspaper (shared with ArticlePage)
    CoachingPanel.tsx             ← coaching display + anchored suggestions
    InstructionBar.tsx            ← floating bar on text selection / paragraph tap
    RefinementInput.tsx           ← sidebar voice/text for general additions
    GateBadge.tsx                 ← GREEN/YELLOW/RED status dot
    RephraseOptions.tsx           ← pick from AI-generated alternatives
    VersionInfo.tsx               ← round counter + previous version link
    VoiceRecorder.tsx             ← mic button + waveform (shared with InputStep)
    PublishButton.tsx             ← gate-aware publish control
    hooks/
      useTextSelection.ts         ← desktop selection detection
      useParagraphTap.ts          ← mobile paragraph tap detection
    types.ts                      ← editor-specific types only
    editor.css                    ← all editor styles, self-contained
```

### The Interface

Everything the editor needs comes through props. Everything it wants to do goes through callbacks. The editor never calls `fetch`, never reads a token, never touches the router.

```typescript
type EditorialScreenProps = {
  // Data in
  articleMarkdown: string;
  review: ReviewResult;
  metadata: ArticleMetadata;
  userName: string;
  versions?: ArticleVersion[];
  currentRound?: number;

  // Actions out
  onRefineTargeted: (r: TargetedRefinement) => Promise<void>;
  onRefineGeneral: (r: GeneralRefinement) => Promise<void>;
  onRephrase: (r: RephraseRequest) => Promise<RephraseResponse>;
  onPublish: () => Promise<void>;
  onAppeal: () => Promise<void>;
  onBack: () => void;
};

// Editor-specific types (in editor/types.ts)
type TargetedRefinement = {
  selected_text: string;
  instruction: string;
  paragraph_index: number;
};

type GeneralRefinement = {
  voice_clip?: Blob;
  text_note?: string;
};

type RephraseRequest = {
  selected_text: string;
  paragraph_index: number;
};

type RephraseResponse = {
  options: string[];
};
```

### PostPage as Thin Orchestrator

PostPage handles auth, SSE, routing, API calls, and the step state machine. It renders `EditorialScreen` with data and wires callbacks to the backend:

```tsx
// PostPage.tsx — orchestration only, no editor logic
function PostPage() {
  const [step, setStep] = useState<'input' | 'processing' | 'preview'>('input');
  const [articleMarkdown, setArticleMarkdown] = useState('');
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [metadata, setMetadata] = useState<ArticleMetadata | null>(null);
  const [versions, setVersions] = useState<ArticleVersion[]>([]);
  const [currentRound, setCurrentRound] = useState(0);

  // ... SSE streaming, auth, submission creation ...

  if (step === 'preview' && review) {
    return (
      <EditorialScreen
        articleMarkdown={articleMarkdown}
        review={review}
        metadata={metadata!}
        userName={user?.display_name || 'Anonymous'}
        versions={versions}
        currentRound={currentRound}
        onRefineTargeted={async (r) => {
          setStep('processing');
          await refineSubmission(submissionId, { type: 'targeted', ...r });
          openStream();
        }}
        onRefineGeneral={async (r) => {
          setStep('processing');
          if (r.voice_clip) {
            const fd = new FormData();
            fd.append('voice_clip', r.voice_clip, 'feedback.webm');
            fd.append('type', 'general');
            await refineSubmission(submissionId, fd);
          } else {
            await refineSubmission(submissionId, {
              type: 'general',
              text_note: r.text_note,
            });
          }
          openStream();
        }}
        onRephrase={(r) => rephraseSubmission(submissionId, r)}
        onPublish={async () => {
          const result = await publishArticle(submissionId);
          if ('error' in result && result.error === 'gate_red') {
            toast('This article needs changes before publishing.', 'error');
            return;
          }
          toast('Article published!', 'success');
          navigate('/');
        }}
        onAppeal={async () => {
          await appealSubmission(submissionId);
          toast('Your story has been sent for editorial review.', 'info');
        }}
        onBack={() => navigate(-1)}
      />
    );
  }

  // ... InputStep, ProcessingStep rendering ...
}
```

### Shared Components

Two components from the editor module are used outside it:

1. **`ArticleRenderer`** — used in `EditorialScreen` (with selection detection) and in `ArticlePage` (read-only, no selection). Takes `markdown: string` and an optional `selectable: boolean` prop.

2. **`VoiceRecorder`** — used in `EditorialScreen` (refinement input + instruction bar) and in `InputStep` (initial capture). Takes `onRecording: (blob: Blob) => void` and an optional `compact: boolean` prop.

Both live in `components/editor/` as the source of truth and are imported by other pages.

### What Stays Outside the Editor Module

| Concern | Lives in | Why |
|---------|----------|-----|
| SSE streaming | `lib/sse.ts` + PostPage | Network concern, not editor concern |
| Auth tokens | `lib/auth.ts` + PostPage | The editor doesn't know about auth |
| API calls | `lib/api.ts` + PostPage | The editor emits intents, PostPage executes them |
| Routing | PostPage + router | The editor doesn't navigate |
| Toast notifications | PostPage | UI feedback about API results |
| Step state machine | PostPage | `input → processing → preview` flow |
| Submission creation | PostPage + InputStep | Happens before the editor exists |

### What This Buys You

1. **Testable in isolation.** Render `EditorialScreen` with hardcoded markdown + review JSON. Every interaction mode works without a backend. Build a Storybook page or test harness with mock data for each user story scenario.

2. **Parallel development.** One person builds the editor module with mock data. Another wires up the backend + SSE + API. They meet at the props interface.

3. **Embeddable.** If you later build an admin review panel, a mobile webview, or a different product, the editor drops in with different callback wiring. The same component works in any React app.

4. **ArticleRenderer is shared.** The newspaper-feel rendering of markdown is the same component in the editor, on ArticlePage, and in the HomePage lead story. Change the typography once, it updates everywhere.

5. **Swappable backend.** Move from stub services to real Claude API? Only `lib/api.ts` and the PostPage callbacks change. The editor module is untouched.

---

## Summary: The Contributor's Experience

1. The article appears, beautifully rendered. Newspaper feel. Their name on it.
2. They read it. Something catches their eye.
3. They select the text (or tap the paragraph on mobile).
4. A small bar appears: mic button, text input, a couple of smart chips.
5. They record a 5-second voice clip: "She actually said 'can't afford' not 'can't find'."
6. The AI fixes that specific part. The rest stays.
7. Or: they read the coaching, tap a suggestion, it highlights the relevant paragraph. They respond right there.
8. Or: they have new information to add. They use the sidebar input. The AI weaves it in.
9. When it looks right, they hit Publish.

No markdown. No editor. No "I'm not a writer" moment. Just a person directing their article with their voice.
