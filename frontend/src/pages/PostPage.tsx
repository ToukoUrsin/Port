import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUp, X, Loader2,
  CheckCircle, Camera, Type,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { useToast } from "@/components/Toast.tsx";
import {
  createSubmission,
  publishArticle,
  refineSubmission,
  rephraseSubmission,
  appealSubmission,
  getToken,
} from "@/lib/api.ts";
import { streamPipeline } from "@/lib/sse.ts";
import type {
  ReviewResult,
  ArticleMetadata,
  SSEStatusEvent,
} from "@/lib/types.ts";
import { EditorialScreen } from "@/components/editor";
import { VoiceRecorder } from "@/components/editor/VoiceRecorder";
import type { TargetedRefinement, GeneralRefinement, RephraseRequest } from "@/components/editor/types";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import "./PostPage.css";

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
  const { user } = useAuth();

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
      formData.append("location_id", user?.location_id || "a0000000-0000-0000-0000-000000000004");

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
        Tell us in your own words — we'll turn it into an article you can
        review before anything is published.
      </p>

      {error && <p className="auth-error">{error}</p>}

      <form className="compose-form" onSubmit={handleSubmit}>
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

      <ul className="compose-tips">
        <li>Voice works best — just talk like you're telling a friend</li>
        <li>Photos help but aren't required</li>
        <li>Don't worry about polish — that's what the AI is for</li>
      </ul>
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

// --- Main: Thin Orchestrator ---
type FlowStep = "input" | "processing" | "preview";

export default function PostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<FlowStep>("input");
  const [submissionId, setSubmissionId] = useState<string>("");
  const [articleMarkdown, setArticleMarkdown] = useState<string>("");
  const [reviewData, setReviewData] = useState<ReviewResult | null>(null);
  const [metadata, setMetadata] = useState<ArticleMetadata | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [processingError, setProcessingError] = useState<string>("");

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

  // --- Editorial screen callback wiring ---

  const handleRefineTargeted = useCallback(
    async (r: TargetedRefinement) => {
      setStep("processing");
      try {
        await refineSubmission(submissionId, { type: "targeted", ...r });
        setCurrentRound((n) => n + 1);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Refinement failed";
        toast(msg, "error");
        setStep("preview");
      }
    },
    [submissionId, toast],
  );

  const handleRefineGeneral = useCallback(
    async (r: GeneralRefinement) => {
      setStep("processing");
      try {
        if (r.voice_clip) {
          const fd = new FormData();
          fd.append("voice_clip", r.voice_clip, "feedback.webm");
          fd.append("type", "general");
          await refineSubmission(submissionId, fd);
        } else {
          await refineSubmission(submissionId, {
            type: "general",
            text_note: r.text_note,
          });
        }
        setCurrentRound((n) => n + 1);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Refinement failed";
        toast(msg, "error");
        setStep("preview");
      }
    },
    [submissionId, toast],
  );

  const handleRephrase = useCallback(
    async (r: RephraseRequest) => {
      return rephraseSubmission(submissionId, r);
    },
    [submissionId],
  );

  const handlePublish = useCallback(async () => {
    const result = await publishArticle(submissionId);
    if ("error" in result && result.error === "gate_red") {
      toast("This article needs changes before publishing.", "error");
      return;
    }
    toast("Article published!", "success");
    navigate("/");
  }, [submissionId, toast, navigate]);

  const handleAppeal = useCallback(async () => {
    try {
      await appealSubmission(submissionId);
      toast("Your story has been sent for editorial review.", "info");
    } catch {
      toast("Appeal failed. Please try again.", "error");
    }
  }, [submissionId, toast]);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

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
        {step === "preview" && articleMarkdown && reviewData && metadata && (
          <EditorialScreen
            articleMarkdown={articleMarkdown}
            review={reviewData}
            metadata={metadata}
            userName={user?.profile_name || "Anonymous"}
            currentRound={currentRound}
            onRefineTargeted={handleRefineTargeted}
            onRefineGeneral={handleRefineGeneral}
            onRephrase={handleRephrase}
            onPublish={handlePublish}
            onAppeal={handleAppeal}
            onBack={handleBack}
          />
        )}
      </div>
      <BottomBar />
    </>
  );
}
