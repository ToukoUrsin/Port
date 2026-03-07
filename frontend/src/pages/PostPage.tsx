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
import type { GeneralRefinement } from "@/components/editor/types";
import { useLanguage } from "@/contexts/LanguageContext";
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
  const [anonymous, setAnonymous] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useLanguage();

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
      if (anonymous) formData.append("anonymous", "true");
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
      <h1 className="compose-prompt">{t("post.whatHappened")}</h1>
      <p className="compose-hint">
        {t("post.hint")}
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
            placeholder={t("post.notesPlaceholder")}
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
          <label className="compose-anon">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              disabled={isSubmitting}
            />
            <span>Anonymous</span>
          </label>
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
        <li>{t("post.tip1")}</li>
        <li>{t("post.tip2")}</li>
        <li>{t("post.tip3")}</li>
      </ul>
    </div>
  );
}

// --- Step 2: Processing with SSE ---
const STEP_LABELS_EN: Record<string, string> = {
  transcribing: "Listening",
  describing_photos: "Seeing photos",
  generating: "Writing",
  reviewing: "Reviewing",
};

const STEP_LABELS_FI: Record<string, string> = {
  transcribing: "Kuunnellaan",
  describing_photos: "Katsotaan kuvia",
  generating: "Kirjoitetaan",
  reviewing: "Tarkistetaan",
};

const STEP_ORDER = ["transcribing", "describing_photos", "generating", "reviewing"];

function ProcessingStep({
  submissionId,
  onDone,
  onError,
}: {
  submissionId: string;
  onDone: (article: string, review: ReviewResult, metadata: ArticleMetadata) => void;
  onError: (message: string) => void;
}) {
  const { language, t } = useLanguage();
  const STEP_LABELS = language === "fi" ? STEP_LABELS_FI : STEP_LABELS_EN;
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

  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const reached = (step: string) => STEP_ORDER.indexOf(step) <= currentIndex;

  const buildingClasses = [
    "building-article",
    reached("transcribing") ? "building--has-headline" : "",
    reached("describing_photos") ? "building--has-image" : "",
    reached("generating") ? "building--has-body" : "",
    reached("reviewing") ? "building--has-review" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className="building">
      <h2 className="building-title">{t("post.creating")}</h2>
      <div className={buildingClasses}>
        {/* Gate badge placeholder */}
        <div className="building-gate">
          <div className="skeleton building-gate-bar" />
        </div>

        {/* Headline */}
        <div className="building-headline">
          <div className="skeleton building-headline-line" style={{ width: "85%" }} />
          <div className="skeleton building-headline-line" style={{ width: "55%" }} />
        </div>

        {/* Byline */}
        <div className="building-byline">
          <div className="skeleton building-byline-avatar" />
          <div className="skeleton building-byline-text" />
        </div>

        {/* Image */}
        <div className="building-image">
          <div className="skeleton building-image-block" />
        </div>

        {/* Body lines */}
        <div className="building-body">
          {[100, 95, 88, 100, 72, 96, 60].map((w, i) => (
            <div key={i} className="skeleton building-body-line" style={{ width: `${w}%`, transitionDelay: `${i * 0.09}s` }} />
          ))}
        </div>
      </div>

      {/* Step labels */}
      <div className="building-steps">
        {STEP_ORDER.map((key) => {
          const isDone = stepKeys.includes(key) && currentStep !== key;
          const isActive = currentStep === key;
          return (
            <div
              key={key}
              className={`building-step ${isDone ? "done" : isActive ? "active" : "pending"}`}
            >
              {isDone ? (
                <CheckCircle size={14} />
              ) : isActive ? (
                <Loader2 size={14} className="spin" />
              ) : null}
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
  const { t: pt } = useLanguage();
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

  const handlePublish = useCallback(async () => {
    try {
      const result = await publishArticle(submissionId);
      if ("error" in result && result.error === "gate_red") {
        toast(pt("post.gateRedError"), "error");
        return;
      }
      toast(pt("post.published"), "success");
      navigate("/");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Publish failed.", "error");
    }
  }, [submissionId, toast, navigate]);

  const handleAppeal = useCallback(async () => {
    try {
      await appealSubmission(submissionId);
      toast(pt("post.appealSent"), "info");
    } catch {
      toast(pt("post.appealFailed"), "error");
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
            onRefineGeneral={handleRefineGeneral}
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
