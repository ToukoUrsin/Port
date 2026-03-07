# FRONTEND_CONTRACT.md — API Contract Changes for Frontend
# Date: 2026-03-07 UTC+3
# Plan: 1_what/article_engine/spec/ARCHITECTURE.md
# Depends on: PROMPTS_SPEC.md (data shapes), BACKEND_UPDATE_SPEC.md (endpoints)

Maps old frontend types to new types, specifies component changes for PostPage, ArticlePage, and shared utilities. A developer can implement from this file alone.

---

## 1. Type Changes (`lib/types.ts`)

### 1.1 Types to Remove

```typescript
// REMOVE — articles are markdown now, not blocks
export type Block = {
  type: string;
  content: string;
  src?: string;
  caption?: string;
  alt?: string;
  level?: number;
  author?: string;
};

// REMOVE — replaced by RedTrigger and YellowFlag
export type ReviewFlag = {
  type: string;
  text: string;
  suggestion: string;
};

// REMOVE — replaced by new ReviewResult
export type ReviewResult = {
  score: number;
  flags: ReviewFlag[];
  approved: boolean;
};
```

### 1.2 New Types to Add

```typescript
// --- Review types (matches PROMPTS_SPEC.md canonical schema) ---

export type VerificationEntry = {
  claim: string;
  evidence: string;
  status: 'SUPPORTED' | 'NOT_IN_SOURCE' | 'POSSIBLE_HALLUCINATION' | 'FABRICATED_QUOTE';
};

export type QualityScores = {
  evidence: number;        // 0.0-1.0
  perspectives: number;
  representation: number;
  ethical_framing: number;
  cultural_context: number;
  manipulation: number;
};

export type RedTrigger = {
  dimension: string;
  trigger: string;
  paragraph: number;
  sentence: string;
  fix_options: string[];
};

export type YellowFlag = {
  dimension: string;
  description: string;
  suggestion: string;
};

export type Coaching = {
  celebration: string;
  suggestions: string[];
};

export type ReviewResult = {
  verification: VerificationEntry[];
  scores: QualityScores;
  gate: 'GREEN' | 'YELLOW' | 'RED';
  red_triggers: RedTrigger[];
  yellow_flags: YellowFlag[];
  coaching: Coaching;
};

// --- Article metadata (from generation) ---

export type ArticleMetadata = {
  chosen_structure: 'news_report' | 'feature' | 'photo_essay' | 'brief' | 'narrative';
  category: string;
  confidence: number;       // 0.0-1.0
  missing_context: string[];
};

export type ArticleVersion = {
  article_markdown: string;
  metadata: ArticleMetadata;
  review: ReviewResult;
  contributor_input: string;
  timestamp: string;        // ISO 8601
};
```

### 1.3 Updated SubmissionMeta

```typescript
// BEFORE
export type SubmissionMeta = {
  blocks?: Block[];
  review?: ReviewResult;
  summary?: string;
  category?: string;
  // ... other fields
};

// AFTER
export type SubmissionMeta = {
  // NEW
  article_markdown?: string;
  article_metadata?: ArticleMetadata;
  versions?: ArticleVersion[];
  transcript?: string;           // persisted from first pipeline run

  // CHANGED type (same field name)
  review?: ReviewResult;       // now uses new ReviewResult

  // KEPT
  summary?: string;
  category?: string;
  model?: string;
  generated_at?: string;
  slug?: string;
  featured_img?: string;
  sources?: string[];
  event_date?: string;
  place_name?: string;
  co_authors?: string[];
  published_at?: string;
  published_by?: string;
  scheduled_at?: string;
  flagged?: boolean;
  flag_reason?: string;
  edit_history?: EditEntry[];

  // DEPRECATED — may exist on old data, pipeline no longer writes it
  blocks?: Block[];
};
```

### 1.4 Updated Status Constants

```typescript
// ADD to SubmissionStatus
export const SubmissionStatus = {
  Draft: 0,
  Transcribing: 1,
  Generating: 2,
  Reviewing: 3,
  Ready: 4,
  Published: 5,
  Archived: 6,
  Refining: 7,     // NEW
  Appealed: 8,     // NEW
} as const;
```

### 1.5 New SSE Complete Event Type

```typescript
// The SSE complete event data shape
export type SSECompleteEvent = {
  article: string;           // markdown text
  metadata: ArticleMetadata;
  review: ReviewResult;
};
```

---

## 2. API Client Changes (`lib/api.ts`)

### 2.1 New Functions

```typescript
/**
 * Submit a refinement (voice clip or text note).
 * After this returns, open a new SSE stream to get the updated article.
 */
export async function refineSubmission(
  id: string,
  data: FormData | { text_note: string }
): Promise<{ status: string }> {
  if (data instanceof FormData) {
    // Voice clip — send as multipart
    return apiFetch(`/submissions/${id}/refine`, {
      method: 'POST',
      body: data,
      // Don't set Content-Type — browser sets it with boundary for FormData
    });
  } else {
    // Text note only
    return apiFetch(`/submissions/${id}/refine`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }
}

/**
 * Appeal a RED-gated submission for human review.
 */
export async function appealSubmission(id: string): Promise<{ status: string }> {
  return apiFetch(`/submissions/${id}/appeal`, { method: 'POST' });
}
```

### 2.2 Updated publishArticle

Handle the 422 response when gate is RED:

```typescript
export type GateRejection = {
  error: 'gate_red';
  gate: 'RED';
  coaching: Coaching;
  red_triggers: RedTrigger[];
};

export async function publishArticle(id: string): Promise<{ status: string } | GateRejection> {
  const res = await fetch(`${BASE_URL}/submissions/${id}/publish`, {
    method: 'POST',
    headers: authHeaders(),
  });

  if (res.status === 422) {
    // RED gate — return the coaching for display
    return res.json() as Promise<GateRejection>;
  }

  if (!res.ok) throw new Error(`Publish failed: ${res.status}`);
  return res.json();
}
```

The caller checks `if ('error' in result && result.error === 'gate_red')` to distinguish a gate rejection from a successful publish.

---

## 3. SSE Changes (`lib/sse.ts`)

### 3.1 New Status Step

The backend may emit a `"describing_photos"` status step (when photos are submitted). Refinement voice clip transcription happens in the `/refine` handler before the SSE stream opens, so there is no `"transcribing_direction"` SSE event.

```typescript
const STEP_LABELS: Record<string, string> = {
  transcribing: 'Transcribing audio...',
  describing_photos: 'Analyzing photos...',        // NEW
  generating: 'Writing article...',
  reviewing: 'Reviewing quality...',
};
```

**Dynamic step list:** The hardcoded `allStepKeys` array in ProcessingStep must become dynamic. The pipeline may skip `"transcribing"` (notes-only) or add `"describing_photos"` (photos submitted). Build the step list from received SSE events:

```typescript
// Instead of: const allStepKeys = ["transcribing", "generating", "reviewing"];
// Use state that grows as events arrive:
const [stepKeys, setStepKeys] = useState<string[]>([]);

// In onStatus callback:
setStepKeys(prev => prev.includes(event.step) ? prev : [...prev, event.step]);
```

### 3.2 Updated Complete Event

The `onComplete` callback receives the new shape:

```typescript
type SSECompleteData = {
  article: string;           // markdown, not blocks
  metadata: ArticleMetadata;
  review: ReviewResult;      // new ReviewResult with gate, coaching, scores
};
```

No changes to the SSE mechanism itself (fetch + ReadableStream parsing). Only the payload shape changes.

---

## 4. PostPage Changes (`pages/PostPage.tsx`)

### 4.1 InputStep — Voice Recording + Toolbar Rearrangement

The input step gets voice recording as the primary input method. The existing text area and file upload stay, but the interaction hierarchy changes: voice first, photos second, notes third.

#### Add: Voice Recording Component

New component using the MediaRecorder API:

```tsx
function VoiceRecorder({ onRecording }: { onRecording: (blob: Blob) => void }) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number>(0);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunks.current = [];
    recorder.ondataavailable = (e) => chunks.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' });
      setAudioURL(URL.createObjectURL(blob));
      onRecording(blob);
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    mediaRecorder.current = recorder;
    setRecording(true);
    setElapsed(0);
    timer.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
    clearInterval(timer.current);
  }

  function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  return (
    <div className="voice-recorder">
      {recording ? (
        <button className="record-btn record-btn--active" onClick={stopRecording}>
          <Square size={20} />
          <span className="record-timer">{formatTime(elapsed)}</span>
        </button>
      ) : (
        <button className="record-btn" onClick={startRecording}>
          <Mic size={24} />
        </button>
      )}
      {audioURL && !recording && (
        <div className="recording-strip">
          <audio src={audioURL} controls />
          <button onClick={() => { setAudioURL(null); }}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
```

#### Rearrange: Toolbar Layout

The bottom toolbar changes from `[Image] [MapPin]` to a three-button row with mic as primary:

```tsx
{/* OLD toolbar */}
<div className="compose-actions">
  <button className="compose-action" onClick={() => fileRef.current?.click()}>
    <Image size={20} />
  </button>
  <button className="compose-action" onClick={() => setShowLocation(!showLocation)}>
    <MapPin size={20} />
  </button>
</div>

{/* NEW toolbar */}
<div className="compose-actions">
  <button className="compose-action" onClick={() => fileRef.current?.click()}>
    <Camera size={20} />
  </button>
  <VoiceRecorder onRecording={(blob) => {
    setAudioBlob(blob);
    // Add to files for FormData submission
  }} />
  <button className="compose-action" onClick={() => setShowNotes(!showNotes)}>
    <Type size={20} />
  </button>
</div>
```

Mic button is center, larger (`record-btn` class with bigger padding/size). Camera left, Notes right.

#### Remove: Location Selector

Remove the `LocationSelect` component and `showLocation` state from InputStep. The AI infers location from content. Location can be added to metadata post-generation if needed.

#### New State

```typescript
const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
const [showNotes, setShowNotes] = useState(false);
```

The notes textarea is hidden by default. Tapping the Notes button toggles it. The text area placeholder stays: "budget vote, school cuts, heated" — showing that terse is fine.

#### Updated FormData Assembly

```typescript
async function handleSubmit(e: React.FormEvent) {
  // ...existing logic...
  const formData = new FormData();
  if (audioBlob) {
    formData.append('audio', audioBlob, 'recording.webm');
  }
  for (const f of files) {
    formData.append('photos[]', f.file);
  }
  if (text.trim()) formData.append('notes', text);
  // location removed
  const res = await createSubmission(formData);
  onSubmit(res.submission_id);
}
```

#### CSS for Voice Recorder

```css
.record-btn {
  width: 56px; height: 56px;
  border-radius: var(--radius-full);
  background: var(--color-error);
  color: var(--color-text-inverse);
  display: flex; align-items: center; justify-content: center;
  border: none; cursor: pointer;
  transition: transform var(--transition-fast);
}
.record-btn:active { transform: scale(0.95); }
.record-btn--active {
  animation: pulse 1.5s ease-in-out infinite;
  background: var(--color-error);
}
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(211, 47, 47, 0.4); }
  50% { box-shadow: 0 0 0 12px rgba(211, 47, 47, 0); }
}
.record-timer { font-size: var(--text-sm); margin-left: var(--space-2); }
.recording-strip {
  display: flex; align-items: center; gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}
.recording-strip audio { flex: 1; height: 32px; }
```

### 4.2 ProcessingStep — Label Updates + Elapsed Time

Update labels to human-friendly versions and add elapsed time per step:

```typescript
const STEP_LABELS: Record<string, string> = {
  transcribing: 'Listening to your recording...',       // was "Transcribing audio..."
  describing_photos: 'Looking at your photos...',       // NEW
  generating: 'Writing your article...',                 // was "Writing article..."
  reviewing: 'Reviewing quality...',                     // unchanged
};
```

Add elapsed time display per completed step:

```tsx
// Track when each step started
const stepStartTime = useRef<Record<string, number>>({});

// In onStatus callback:
if (!stepStartTime.current[event.step]) {
  stepStartTime.current[event.step] = Date.now();
}

// In the step display, show elapsed time for completed steps:
{isDone && (
  <span className="processing-step-time">
    {Math.round((Date.now() - stepStartTime.current[key]) / 1000)}s
  </span>
)}
```

The existing step display logic (checkmarks for completed, spinner for current) works unchanged.

### 4.3 PreviewStep — Major Rewrite (Editorial Screen)

This is the biggest change. The block editor (lines ~302-703 of current PostPage.tsx) is replaced with a two-column editorial screen: read-only article preview + coaching sidebar with refinement controls.

**Design reference:** Article side looks like a Ghost published page (serif body, generous whitespace). Coaching side feels like Google Docs suggesting mode (feedback alongside content). See `FRONTEND_DESIGN.md` for full rationale.

#### Remove

- `EditorBlock` type and all block state (`blocks`, `setBlocks`)
- `BlockTypeMenu` component (drag handle + type dropdown)
- `SlashMenu` component (triggered by `/`)
- `CoverImage` component (drag-to-reposition)
- All `contentEditable` div rendering and event handlers
- `handleBlockInput`, `handleBlockKeyDown`, `handlePlusBlock` functions
- Block-level editing UI (drag handles, type selectors, plus buttons)
- `AI_EDITS` hardcoded responses and `matchAiEdit` function
- AI edit bar with chip buttons ("Shorter", "More formal")

#### Layout: Two-Column Desktop, Stacked Mobile

```tsx
<div className="editorial">
  {/* Top bar */}
  <div className="editorial-header">
    <button className="btn-back" onClick={() => navigate(-1)}>
      <ArrowLeft size={16} /> Back
    </button>
    <div className="editorial-header-right">
      <GateBadge gate={review.gate} />
      <PublishButton gate={review.gate} onPublish={handlePublish} publishing={publishing} />
    </div>
  </div>

  {/* Two-column body */}
  <div className="editorial-body">
    {/* Left: Article (read-only) */}
    <article className="editorial-article">
      <h1 className="article-headline">{article.title}</h1>
      <div className="article-byline">
        By {user?.display_name || 'Anonymous'} &middot; {formatDate(new Date())}
        {metadata?.category && (
          <span className={`badge badge-${metadata.category}`}>{metadata.category}</span>
        )}
      </div>
      <div className="article-prose">
        <ReactMarkdown>{articleMarkdown}</ReactMarkdown>
      </div>
    </article>

    {/* Right: Coaching sidebar */}
    <aside className="editorial-coaching">
      <CoachingPanel review={review} />
      <RefinementInput
        onRefineText={handleRefineText}
        onRefineVoice={handleRefineVoice}
      />
      <VersionInfo round={currentRound} onViewPrevious={handleViewPrevious} />
    </aside>
  </div>
</div>
```

#### CSS: Two-Column Layout

```css
.editorial-body {
  display: grid;
  grid-template-columns: 1fr;        /* mobile: single column */
  gap: var(--space-6);
  max-width: var(--size-container);
  margin: 0 auto;
  padding: var(--space-4);
}

@media (min-width: 1024px) {
  .editorial-body {
    grid-template-columns: 65% 35%;  /* desktop: article left, coaching right */
    gap: var(--space-8);
    padding: var(--space-6);
  }
}

/* Article side — newspaper feel */
.editorial-article {
  max-width: var(--size-content);
}
.article-headline {
  font-family: var(--font-serif);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  color: var(--color-secondary);
  margin-bottom: var(--space-3);
}
.article-byline {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-6);
  display: flex; align-items: center; gap: var(--space-2);
}
.article-prose {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
  color: var(--color-text);
}
.article-prose blockquote {
  border-left: 3px solid var(--color-primary);
  padding-left: var(--space-4);
  margin: var(--space-6) 0;
  font-style: italic;
  color: var(--color-text-secondary);
}
.article-prose img {
  width: 100%;
  border-radius: var(--radius-md);
  margin: var(--space-4) 0;
}

/* Coaching side — mentor feel */
.editorial-coaching {
  font-family: var(--font-sans);
  font-size: var(--text-base);
}
@media (max-width: 1023px) {
  .editorial-coaching {
    background: var(--color-bg-secondary);
    border-top: 1px solid var(--color-border);
    padding-top: var(--space-6);
    margin-top: var(--space-4);
  }
}
```

The article side is read-only. No cursor, no contentEditable, no editing controls. The contributor reads what their neighbors will read. This is the pride moment.

#### Add: Markdown Article Rendering

```tsx
import ReactMarkdown from 'react-markdown';

// Article state is a single string, not EditorBlock[]
<div className="article-prose">
  <ReactMarkdown>{articleMarkdown}</ReactMarkdown>
</div>
```

#### Add: Gate Badge Component

A small status indicator in the header, not a traffic light:

```tsx
function GateBadge({ gate }: { gate: 'GREEN' | 'YELLOW' | 'RED' }) {
  const config = {
    GREEN: { className: 'gate-green', label: 'Ready to publish' },
    YELLOW: { className: 'gate-yellow', label: 'Suggestions available' },
    RED: { className: 'gate-red', label: 'Needs changes' },
  };
  const { className, label } = config[gate];
  return (
    <span className={`gate-badge ${className}`}>
      <span className="gate-dot" />
      {label}
    </span>
  );
}
```

```css
.gate-badge {
  display: inline-flex; align-items: center; gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-sm); font-weight: 600;
}
.gate-dot { width: 8px; height: 8px; border-radius: var(--radius-full); }
.gate-green { background: var(--color-success-light); color: var(--color-success); }
.gate-green .gate-dot { background: var(--color-success); }
.gate-yellow { background: var(--color-warning-light); color: var(--color-warning); }
.gate-yellow .gate-dot { background: var(--color-warning); }
.gate-red { background: var(--color-error-light); color: var(--color-error); }
.gate-red .gate-dot { background: var(--color-error); }
```

#### Add: Coaching Panel Component

The coaching display adapts based on gate status. Always starts with celebration. The tone is a mentor talking, not a report card.

```tsx
function CoachingPanel({ review }: { review: ReviewResult }) {
  return (
    <div className="coaching-panel">
      {/* Always: celebration first */}
      <p className="coaching-celebration">{review.coaching.celebration}</p>

      {/* GREEN / YELLOW: coaching suggestions as questions */}
      {review.coaching.suggestions.length > 0 && (
        <ol className="coaching-suggestions">
          {review.coaching.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}

      {/* YELLOW: optional improvement flags */}
      {review.gate === 'YELLOW' && review.yellow_flags.length > 0 && (
        <div className="yellow-flags">
          {review.yellow_flags.map((flag, i) => (
            <p key={i} className="yellow-flag">{flag.suggestion}</p>
          ))}
        </div>
      )}

      {/* RED: mirror coaching — what's here, what's not, paths forward */}
      {review.gate === 'RED' && (
        <div className="red-gate-coaching">
          {review.red_triggers.map((trigger, i) => (
            <div key={i} className="red-trigger">
              <p className="trigger-context">"{trigger.sentence}"</p>
              <ul className="fix-options">
                {trigger.fix_options.map((opt, j) => (
                  <li key={j}>{opt}</li>
                ))}
              </ul>
            </div>
          ))}

          {/* Appeal link */}
          <button className="appeal-link" onClick={handleAppeal}>
            I think this review is wrong
          </button>
        </div>
      )}
    </div>
  );
}
```

**RED gate coaching note:** The `coaching.celebration` field still renders first, even for RED articles. The review prompt produces warm framing: "You've raised real concerns..." before listing what's needed. The `red_triggers[].fix_options` are rendered as paths forward, not error messages. The trigger `sentence` gives context. No paragraph numbers, no dimension labels — those are internal data. The contributor sees the specific text and the specific fix.

```css
.coaching-panel {
  display: flex; flex-direction: column; gap: var(--space-4);
}
.coaching-celebration {
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
}
.coaching-suggestions {
  display: flex; flex-direction: column; gap: var(--space-3);
  padding-left: var(--space-5);
}
.coaching-suggestions li {
  color: var(--color-text);
  line-height: var(--leading-relaxed);
}
.yellow-flag {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  padding: var(--space-3);
  background: var(--color-warning-light);
  border-left: 3px solid var(--color-warning);
  border-radius: var(--radius-sm);
}
.red-gate-coaching {
  padding: var(--space-4);
  background: var(--color-error-light);
  border-radius: var(--radius-md);
}
.trigger-context {
  font-style: italic;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}
.fix-options {
  padding-left: var(--space-5);
  display: flex; flex-direction: column; gap: var(--space-2);
}
.fix-options li { color: var(--color-text); }
.appeal-link {
  background: none; border: none; cursor: pointer;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  text-decoration: underline;
  margin-top: var(--space-4);
  padding: 0;
}
```

#### Add: Refinement Input (Voice + Text)

The refinement input supports both voice clips and text, matching the capture screen's casual feel:

```tsx
function RefinementInput({
  onRefineText,
  onRefineVoice,
}: {
  onRefineText: (text: string) => void;
  onRefineVoice: (blob: Blob) => void;
}) {
  const [text, setText] = useState('');
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);

  function handleSubmit() {
    if (voiceBlob) {
      onRefineVoice(voiceBlob);
      setVoiceBlob(null);
    } else if (text.trim()) {
      onRefineText(text.trim());
      setText('');
    }
  }

  const canSubmit = text.trim().length > 0 || voiceBlob !== null;

  return (
    <div className="refinement-input">
      <div className="refinement-input-row">
        <VoiceRecorder onRecording={setVoiceBlob} compact />
        <textarea
          className="refinement-textarea"
          placeholder="Or type a response..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
        />
      </div>
      <button
        className="btn-primary refinement-submit"
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        Update article
      </button>
    </div>
  );
}
```

The `VoiceRecorder` component from InputStep is reused with a `compact` prop for smaller styling. The mic is always available — voice refinement is a first-class input, not optional.

#### Add: Appeal Handler

```typescript
async function handleAppeal() {
  try {
    await appealSubmission(submissionId);
    toast('Your story has been sent for editorial review.', 'info');
    // Optionally navigate away or show an appeal-pending state
  } catch (err) {
    toast('Appeal failed. Please try again.', 'error');
  }
}
```

#### Add: Version Info

```tsx
function VersionInfo({
  round,
  onViewPrevious,
}: {
  round: number;
  onViewPrevious: () => void;
}) {
  if (round < 1) return null;
  return (
    <div className="version-info">
      <span className="version-round">Round {round}</span>
      {round > 0 && (
        <button className="version-link" onClick={onViewPrevious}>
          View previous version
        </button>
      )}
    </div>
  );
}
```

Small, bottom of sidebar. Safety net, not a feature.

#### Refinement Handlers

```typescript
async function handleRefineText(text: string) {
  setStep('processing');
  await refineSubmission(submissionId, { text_note: text });
  // Re-open SSE stream
  openStream();
}

async function handleRefineVoice(blob: Blob) {
  setStep('processing');
  const formData = new FormData();
  formData.append('voice_clip', blob, 'feedback.webm');
  await refineSubmission(submissionId, formData);
  openStream();
}

function openStream() {
  const token = getToken();
  if (!token) return;
  streamPipeline(submissionId, token, {
    onStatus: (event) => setCurrentStep(event.step),
    onComplete: (event) => {
      setArticleMarkdown(event.article);
      setReview(event.review);
      setMetadata(event.metadata);
      setCurrentRound((r) => r + 1);
      setStep('preview');
    },
    onError: (event) => setError(event.message),
  });
}
```

#### Update: Publish Button

Disable when gate is RED. Show in the header bar alongside the gate badge:

```tsx
function PublishButton({
  gate,
  onPublish,
  publishing,
}: {
  gate: 'GREEN' | 'YELLOW' | 'RED';
  onPublish: () => void;
  publishing: boolean;
}) {
  return (
    <button
      className="btn-primary"
      onClick={onPublish}
      disabled={gate === 'RED' || publishing}
    >
      {publishing ? (
        <Loader2 size={16} className="spin" />
      ) : (
        <>
          <Send size={16} />
          Publish
        </>
      )}
    </button>
  );
}
```

The `handlePublish` function handles the 422 response:

```typescript
async function handlePublish() {
  setPublishing(true);
  const result = await publishArticle(submissionId);
  if ('error' in result && result.error === 'gate_red') {
    // Shouldn't happen if button is disabled, but handle gracefully
    toast('This article needs changes before publishing.', 'error');
    setPublishing(false);
    return;
  }
  toast('Article published!', 'success');
  navigate('/');
}
```

#### State Changes

Old state:
```typescript
const [blocks, setBlocks] = useState<EditorBlock[]>([]);
const [review, setReview] = useState<{ score: number; flags: ReviewFlag[]; approved: boolean } | null>(null);
```

New state:
```typescript
const [articleMarkdown, setArticleMarkdown] = useState<string>('');
const [review, setReview] = useState<ReviewResult | null>(null);
const [metadata, setMetadata] = useState<ArticleMetadata | null>(null);
const [currentRound, setCurrentRound] = useState(0);
```

#### Flow Support for Refinement Loop

The step state machine adds a transition:

```
preview → processing → preview  (refinement loop)
```

This reuses the existing `input → processing → preview` flow. When the contributor refines, the UI goes back to `processing` (showing SSE steps), then returns to `preview` with the updated article. The ProcessingStep component needs no structural changes — just the new step labels.

---

## 5. ArticlePage Changes (`pages/ArticlePage.tsx`)

### 5.1 Article Body Rendering

Replace block-based rendering with markdown:

```tsx
// OLD: rendering blocks as paragraphs/headings/images
// NEW:
import ReactMarkdown from 'react-markdown';

// In the article body section:
<article className="article-content">
  <ReactMarkdown>{submission.meta.article_markdown}</ReactMarkdown>
</article>
```

### 5.2 Remove QualityScore Component

The current ArticlePage has a `QualityScore` component with 6 hardcoded dimensions and numerical scores. **Remove it entirely.** Per architecture decision, scores are internal data — the contributor never sees them.

Replace with the gate badge only (reuse `GateBadge` from PostPage):

```tsx
// OLD: <QualityScore scores={...} /> showing 6 dimension bars + numbers
// NEW: just the gate badge in the article header
<GateBadge gate={submission.meta.review?.gate || 'GREEN'} />
```

### 5.3 Add Contributor Card

At the bottom of the article, add a contributor attribution section:

```tsx
<div className="contributor-card">
  <div className="contributor-info">
    <span className="contributor-name">By {submission.owner_name}</span>
    <span className="contributor-date">{formatDate(submission.created_at)}</span>
  </div>
  {submission.meta?.article_metadata?.category && (
    <span className={`badge badge-${submission.meta.article_metadata.category}`}>
      {submission.meta.article_metadata.category}
    </span>
  )}
</div>
```

```css
.contributor-card {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-4) 0;
  border-top: 1px solid var(--color-border);
  margin-top: var(--space-8);
}
.contributor-name {
  font-family: var(--font-sans);
  font-weight: 600;
  color: var(--color-text);
}
.contributor-date {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
```

### 5.4 Add "More from Town" Section

Below the contributor card, show other recent articles:

```tsx
<section className="more-from-town">
  <h3>More from Kirkkonummi</h3>
  <div className="more-articles-grid">
    {relatedArticles.slice(0, 3).map((article) => (
      <ArticleCard key={article.id} article={article} compact />
    ))}
  </div>
</section>
```

```css
.more-from-town {
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px solid var(--color-border);
}
.more-from-town h3 {
  font-family: var(--font-heading);
  font-size: var(--text-xl);
  margin-bottom: var(--space-4);
}
.more-articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: var(--space-4);
}
```

This uses existing `ArticleCard` components. The `compact` prop renders a smaller card variant (title + byline + date, no excerpt).

---

## 6. Display Helpers (`lib/types.ts`)

### 6.1 Updated apiSubmissionToDisplay

```typescript
// OLD body extraction:
// body: sub.meta?.blocks?.map(b => b.content).join(' ') || sub.description

// NEW body extraction:
// body: sub.meta?.article_markdown || sub.description
```

The `excerpt` derivation (first N characters for cards) works the same way — just from markdown text instead of concatenated block content.

Full updated function:

```typescript
export function apiSubmissionToDisplay(sub: ApiSubmission): DisplayArticle {
  const meta = sub.meta || {};
  return {
    id: sub.id,
    title: sub.title || 'Untitled',
    excerpt: (meta.article_markdown || sub.description || '').slice(0, 200),
    body: meta.article_markdown || sub.description || '',
    category: meta.category || tagsToCategory(sub.tags),
    author: sub.owner_name || 'Anonymous',
    authorId: sub.owner_id,
    timeAgo: timeAgo(sub.created_at),
    createdAt: sub.created_at,
    image: meta.featured_img || '',
    locationName: sub.location_name || '',
    views: sub.views || 0,
    shareCount: sub.share_count || 0,
  };
}
```

---

## 7. New Dependency

```bash
cd frontend
npm install react-markdown
```

This renders markdown to React components. No additional plugins needed for the content we produce (headings, paragraphs, blockquotes, images, emphasis, horizontal rules).

---

## 8. HomePage Changes (`pages/HomePage.tsx`)

The current HomePage uses hardcoded article data. Update it to fetch real published submissions and display them in a newspaper-style layout.

### 8.1 Layout: Lead Story + Grid

```tsx
<div className="newspaper-front">
  {/* Lead story — most recent published */}
  {leadStory && (
    <article className="lead-story" onClick={() => navigate(`/article/${leadStory.id}`)}>
      {leadStory.image && <img className="lead-image" src={leadStory.image} alt="" />}
      <h1 className="lead-headline">{leadStory.title}</h1>
      <p className="lead-excerpt">{leadStory.excerpt}</p>
      <span className="lead-byline">
        By {leadStory.author} &middot; {leadStory.timeAgo}
        {leadStory.category && <span className="badge">{leadStory.category}</span>}
      </span>
    </article>
  )}

  {/* Remaining stories in a responsive grid */}
  <div className="story-grid">
    {stories.map((story) => (
      <ArticleCard key={story.id} article={story} />
    ))}
  </div>
</div>
```

### 8.2 CSS

```css
.newspaper-front {
  max-width: var(--size-container);
  margin: 0 auto;
  padding: var(--space-4);
}

.lead-story {
  cursor: pointer;
  margin-bottom: var(--space-8);
}
.lead-image {
  width: 100%;
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
}
.lead-headline {
  font-family: var(--font-heading);
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
  color: var(--color-secondary);
  margin-bottom: var(--space-3);
}
.lead-excerpt {
  font-family: var(--font-serif);
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--space-3);
}
.lead-byline {
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  display: flex; align-items: center; gap: var(--space-2);
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}
```

### 8.3 Data Fetching

```typescript
const [stories, setStories] = useState<DisplayArticle[]>([]);

useEffect(() => {
  fetchPublishedSubmissions()
    .then((subs) => subs.map(apiSubmissionToDisplay))
    .then(setStories);
}, []);

const leadStory = stories[0];
const restStories = stories.slice(1);
```

The `fetchPublishedSubmissions` function in `lib/api.ts` calls `GET /submissions?status=published&sort=newest`. This endpoint already exists — we're just using it instead of hardcoded data.

### 8.4 Category Filtering

Add optional category tabs above the grid (matching INTERFACE_THINKING.md newspaper wireframe):

```tsx
const categories = ['All', ...new Set(stories.map((s) => s.category).filter(Boolean))];
const [activeCategory, setActiveCategory] = useState('All');
const filtered = activeCategory === 'All' ? restStories : restStories.filter((s) => s.category === activeCategory);
```

Render as a horizontal scrollable row of text buttons. Active category gets `font-weight: 600` and a bottom border.

---

## 9. What Doesn't Change

- **Auth** — login, signup, token management: unchanged
- **Navbar** — unchanged
- **ExplorePage** — Leaflet map, article cards: unchanged (cards use `apiSubmissionToDisplay` which is updated but keeps the same output shape)
- **SSE mechanism** — fetch + ReadableStream parsing in `lib/sse.ts`: unchanged (only the payload shape changes)
- **CSS token system** — design tokens, component classes: unchanged (new `.gate-*`, `.coaching-*`, `.record-*` classes extend the system)
- **Design system page** — unchanged
- **Profile page** — unchanged
- **Router configuration** — no new routes needed

### What IS Removed

- **`CoverImage` component** — drag-to-reposition cover image. Articles use inline photos from markdown instead.
- **`BlockTypeMenu` / `SlashMenu`** — block editor chrome. No longer needed with read-only markdown articles.
- **`LocationSelect` in InputStep** — AI infers location from content. Location metadata handled post-generation.
- **`QualityScore` component** — replaced by `GateBadge`. Numerical scores are internal data, not shown to contributors or readers.

---

## 10. Migration Notes

### Backward compatibility

Old submissions with `blocks` data will still render because:
1. `SubmissionMeta.blocks` is kept as a deprecated optional field
2. `apiSubmissionToDisplay` tries `article_markdown` first, falls back to `description`
3. ArticlePage can check: if `article_markdown` exists, render markdown; otherwise fall back to old block rendering

### Minimal fallback for old data

```typescript
// In ArticlePage, handle both old and new format:
{submission.meta?.article_markdown ? (
  <ReactMarkdown>{submission.meta.article_markdown}</ReactMarkdown>
) : submission.meta?.blocks ? (
  // Legacy block rendering (can be removed after migration)
  submission.meta.blocks.map((block, i) => (
    <p key={i}>{block.content}</p>
  ))
) : (
  <p>{submission.description}</p>
)}
```

This fallback can be removed once all existing submissions have been re-processed through the new pipeline.
