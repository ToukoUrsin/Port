import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowUp, Send, X, Loader2,
  CheckCircle, Camera, Mic, Square, Type,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { useToast } from "@/components/Toast.tsx";
import {
  createSubmission,
  publishArticle,
  refineSubmission,
  appealSubmission,
  getToken,
} from "@/lib/api.ts";
import { streamPipeline } from "@/lib/sse.ts";
import type {
  ReviewResult,
  ArticleMetadata,
  SSEStatusEvent,
} from "@/lib/types.ts";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import "./PostPage.css";

// --- Voice Recorder ---
function VoiceRecorder({
  onRecording,
  compact,
}: {
  onRecording: (blob: Blob) => void;
  compact?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number>(0);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunks.current = [];
    recorder.ondataavailable = (e) => chunks.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
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
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  const btnClass = compact ? "record-btn record-btn--compact" : "record-btn";

  return (
    <div className="voice-recorder">
      {recording ? (
        <button
          type="button"
          className={`${btnClass} record-btn--active`}
          onClick={stopRecording}
        >
          <Square size={compact ? 14 : 20} />
          <span className="record-timer">{formatTime(elapsed)}</span>
        </button>
      ) : (
        <button type="button" className={btnClass} onClick={startRecording}>
          <Mic size={compact ? 18 : 24} />
        </button>
      )}
      {audioURL && !recording && (
        <div className="recording-strip">
          <audio src={audioURL} controls />
          <button
            type="button"
            onClick={() => {
              setAudioURL(null);
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// --- Step 1: Input ---
function InputStep({ onSubmit }: { onSubmit: (submissionId: string) => void }) {
  const [text, setText] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const sel = e.target.files;
    if (!sel) return;
    const added = Array.from(sel).map((f) => ({
      file: f,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
    }));
    setFiles((p) => [...p, ...added].slice(0, 10));
    e.target.value = "";
  }

  function removeFile(i: number) {
    setFiles((p) => {
      if (p[i].preview) URL.revokeObjectURL(p[i].preview);
      return p.filter((_, j) => j !== i);
    });
  }

  const canSubmit = text.trim().length > 0 || files.length > 0 || audioBlob !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      if (audioBlob) {
        formData.append("audio", audioBlob, "recording.webm");
      }
      for (const f of files) {
        formData.append("photos[]", f.file);
      }
      if (text.trim()) formData.append("notes", text);

      const res = await createSubmission(formData);
      onSubmit(res.submission_id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setError(msg);
      toast(msg, "error");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="compose">
      <h1 className="compose-prompt">What happened?</h1>
      <p className="compose-hint">
        Record what you saw, add photos, or type notes.
      </p>

      {error && <p className="auth-error">{error}</p>}

      <form className="compose-form" onSubmit={handleSubmit}>
        {/* File thumbnails */}
        {files.length > 0 && (
          <div className="compose-files">
            {files.map((f, i) => (
              <div key={i} className="compose-file">
                {f.preview ? (
                  <img
                    src={f.preview}
                    alt={f.file.name}
                    className="compose-file-thumb"
                  />
                ) : (
                  <div className="compose-file-badge">
                    {f.file.type.startsWith("audio/") ? "AUD" : "FILE"}
                  </div>
                )}
                <button
                  type="button"
                  className="compose-file-remove"
                  onClick={() => removeFile(i)}
                  disabled={isSubmitting}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Notes textarea — togglable */}
        {showNotes && (
          <textarea
            className="compose-textarea"
            placeholder="budget vote, school cuts, heated..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={isSubmitting}
            autoFocus
          />
        )}

        {/* Bottom toolbar: Camera | Mic | Notes */}
        <div className="compose-toolbar">
          <div className="compose-actions">
            <button
              type="button"
              className="compose-action"
              onClick={() => fileRef.current?.click()}
              disabled={isSubmitting}
            >
              <Camera size={20} />
            </button>
            <VoiceRecorder
              onRecording={(blob) => setAudioBlob(blob)}
            />
            <button
              type="button"
              className={`compose-action ${showNotes ? "compose-action--active" : ""}`}
              onClick={() => setShowNotes(!showNotes)}
              disabled={isSubmitting}
            >
              <Type size={20} />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={onFiles}
          />
          <button
            type="submit"
            className="compose-submit"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <ArrowUp size={20} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Step 2: Processing with SSE ---
const STEP_LABELS: Record<string, string> = {
  transcribing: "Listening to your recording...",
  describing_photos: "Looking at your photos...",
  generating: "Writing your article...",
  reviewing: "Reviewing quality...",
};

function ProcessingStep({
  submissionId,
  onDone,
  onError,
}: {
  submissionId: string;
  onDone: (article: string, review: ReviewResult, metadata: ArticleMetadata) => void;
  onError: (message: string) => void;
}) {
  const [stepKeys, setStepKeys] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string>("");

  useEffect(() => {
    const token = getToken();
    if (!token) {
      onError("Not authenticated");
      return;
    }

    const controller = streamPipeline(submissionId, token, {
      onStatus(event: SSEStatusEvent) {
        setCurrentStep(event.step);
        setStepKeys((prev) =>
          prev.includes(event.step) ? prev : [...prev, event.step],
        );
      },
      onComplete(event) {
        onDone(event.article, event.review, event.metadata);
      },
      onError(event) {
        onError(event.message);
      },
    });

    return () => controller.abort();
  }, [submissionId, onDone, onError]);

  return (
    <div className="processing">
      <div className="processing-spinner">
        <Loader2 size={32} />
      </div>
      <h2 className="processing-title">Creating your article</h2>
      <div className="processing-steps">
        {stepKeys.map((key) => {
          const isDone = currentStep !== key;
          const isActive = currentStep === key;
          return (
            <div
              key={key}
              className={`processing-step ${isDone ? "done" : isActive ? "active" : "pending"}`}
            >
              {isDone ? (
                <CheckCircle size={16} />
              ) : (
                <Loader2 size={16} className="spin" />
              )}
              <span>{STEP_LABELS[key] || key}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Gate Badge ---
function GateBadge({ gate }: { gate: "GREEN" | "YELLOW" | "RED" }) {
  const config = {
    GREEN: { className: "gate-green", label: "Ready to publish" },
    YELLOW: { className: "gate-yellow", label: "Suggestions available" },
    RED: { className: "gate-red", label: "Needs changes" },
  };
  const { className, label } = config[gate];
  return (
    <span className={`gate-badge ${className}`}>
      <span className="gate-dot" />
      {label}
    </span>
  );
}

// --- Coaching Panel ---
function CoachingPanel({
  review,
  onAppeal,
}: {
  review: ReviewResult;
  onAppeal: () => void;
}) {
  return (
    <div className="coaching-panel">
      <p className="coaching-celebration">{review.coaching.celebration}</p>

      {review.coaching.suggestions.length > 0 && (
        <ol className="coaching-suggestions">
          {review.coaching.suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      )}

      {review.gate === "YELLOW" && review.yellow_flags.length > 0 && (
        <div className="yellow-flags">
          {review.yellow_flags.map((flag, i) => (
            <p key={i} className="yellow-flag">
              {flag.suggestion}
            </p>
          ))}
        </div>
      )}

      {review.gate === "RED" && (
        <div className="red-gate-coaching">
          {review.red_triggers.map((trigger, i) => (
            <div key={i} className="red-trigger">
              <p className="trigger-context">&ldquo;{trigger.sentence}&rdquo;</p>
              <ul className="fix-options">
                {trigger.fix_options.map((opt, j) => (
                  <li key={j}>{opt}</li>
                ))}
              </ul>
            </div>
          ))}
          <button className="appeal-link" onClick={onAppeal}>
            I think this review is wrong
          </button>
        </div>
      )}
    </div>
  );
}

// --- Refinement Input ---
function RefinementInput({
  onRefineText,
  onRefineVoice,
}: {
  onRefineText: (text: string) => void;
  onRefineVoice: (blob: Blob) => void;
}) {
  const [text, setText] = useState("");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);

  function handleSubmit() {
    if (voiceBlob) {
      onRefineVoice(voiceBlob);
      setVoiceBlob(null);
    } else if (text.trim()) {
      onRefineText(text.trim());
      setText("");
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
        className="btn btn-primary refinement-submit"
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        Update article
      </button>
    </div>
  );
}

// --- Version Info ---
function VersionInfo({ round }: { round: number }) {
  if (round < 1) return null;
  return (
    <div className="version-info">
      <span className="version-round">Round {round + 1}</span>
    </div>
  );
}

// --- Step 3: Preview (editorial screen) ---
function PreviewStep({
  articleMarkdown,
  review,
  metadata,
  submissionId,
  currentRound,
  onRefine,
}: {
  articleMarkdown: string;
  review: ReviewResult;
  metadata: ArticleMetadata | null;
  submissionId: string;
  currentRound: number;
  onRefine: (data: FormData | { text_note: string }) => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [publishing, setPublishing] = useState(false);

  // Extract headline from markdown
  const headlineMatch = articleMarkdown.match(/^# (.+)$/m);
  const headline = headlineMatch ? headlineMatch[1] : "Untitled";

  async function handlePublish() {
    setPublishing(true);
    try {
      const result = await publishArticle(submissionId);
      if ("error" in result && result.error === "gate_red") {
        toast("This article needs changes before publishing.", "error");
        setPublishing(false);
        return;
      }
      toast("Article published!", "success");
      navigate("/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Publish failed";
      toast(msg, "error");
      setPublishing(false);
    }
  }

  async function handleAppeal() {
    try {
      await appealSubmission(submissionId);
      toast("Your story has been sent for editorial review.", "info");
    } catch {
      toast("Appeal failed. Please try again.", "error");
    }
  }

  function handleRefineText(text: string) {
    onRefine({ text_note: text });
  }

  function handleRefineVoice(blob: Blob) {
    const formData = new FormData();
    formData.append("voice_clip", blob, "feedback.webm");
    onRefine(formData);
  }

  return (
    <div className="editorial" style={{ animation: "fadeIn 0.4s ease" }}>
      {/* Top bar */}
      <div className="editorial-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="editorial-header-right">
          <GateBadge gate={review.gate} />
          <button
            className="btn btn-primary"
            onClick={handlePublish}
            disabled={review.gate === "RED" || publishing}
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
        </div>
      </div>

      {/* Two-column body */}
      <div className="editorial-body">
        {/* Left: Article (read-only) */}
        <article className="editorial-article">
          <h1 className="article-headline">{headline}</h1>
          <div className="article-byline">
            By {user?.profile_name || "Anonymous"} &middot;{" "}
            {new Date().toLocaleDateString()}
            {metadata?.category && (
              <span className={`badge badge-${metadata.category}`}>
                {metadata.category}
              </span>
            )}
          </div>
          <div className="article-prose">
            <ReactMarkdown>{articleMarkdown}</ReactMarkdown>
          </div>
        </article>

        {/* Right: Coaching sidebar */}
        <aside className="editorial-coaching">
          <CoachingPanel review={review} onAppeal={handleAppeal} />
          <RefinementInput
            onRefineText={handleRefineText}
            onRefineVoice={handleRefineVoice}
          />
          <VersionInfo round={currentRound} />
        </aside>
      </div>
    </div>
  );
}

// --- Main ---
type FlowStep = "input" | "processing" | "preview";

export default function PostPage() {
  const [step, setStep] = useState<FlowStep>("input");
  const [submissionId, setSubmissionId] = useState<string>("");
  const [articleMarkdown, setArticleMarkdown] = useState<string>("");
  const [reviewData, setReviewData] = useState<ReviewResult | null>(null);
  const [metadata, setMetadata] = useState<ArticleMetadata | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [processingError, setProcessingError] = useState<string>("");
  const { toast } = useToast();

  const handleSubmissionCreated = useCallback((id: string) => {
    setSubmissionId(id);
    setStep("processing");
  }, []);

  const handleProcessingDone = useCallback(
    (article: string, review: ReviewResult, meta: ArticleMetadata) => {
      setArticleMarkdown(article);
      setReviewData(review);
      setMetadata(meta);
      setStep("preview");
    },
    [],
  );

  const handleProcessingError = useCallback(
    (message: string) => {
      setProcessingError(message);
      toast(message, "error");
      setStep("input");
    },
    [toast],
  );

  const handleRefine = useCallback(
    async (data: FormData | { text_note: string }) => {
      setStep("processing");
      try {
        await refineSubmission(submissionId, data);
        setCurrentRound((r) => r + 1);
        // The processing step will re-open the SSE stream
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Refinement failed";
        toast(msg, "error");
        setStep("preview");
      }
    },
    [submissionId, toast],
  );

  return (
    <>
      <Navbar />
      <div
        className={`post-page ${step === "processing" ? "post-page--centered" : ""}`}
      >
        {step === "input" && (
          <>
            {processingError && (
              <div
                style={{
                  padding: "var(--space-4)",
                  maxWidth: "var(--size-container-sm)",
                  margin: "0 auto",
                }}
              >
                <p className="auth-error">{processingError}</p>
              </div>
            )}
            <InputStep onSubmit={handleSubmissionCreated} />
          </>
        )}
        {step === "processing" && (
          <ProcessingStep
            submissionId={submissionId}
            onDone={handleProcessingDone}
            onError={handleProcessingError}
          />
        )}
        {step === "preview" && articleMarkdown && reviewData && (
          <PreviewStep
            articleMarkdown={articleMarkdown}
            review={reviewData}
            metadata={metadata}
            submissionId={submissionId}
            currentRound={currentRound}
            onRefine={handleRefine}
          />
        )}
      </div>
      <BottomBar />
    </>
  );
}
