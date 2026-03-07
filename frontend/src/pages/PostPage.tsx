import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUp, X, Loader2,
  CheckCircle, Camera, Type,
  Mic, ImageIcon, Search, PenTool, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { useToast } from "@/components/Toast.tsx";
import {
  createSubmission,
  publishArticle,
  refineSubmission,
  appealSubmission,
  updateSubmissionMarkdown,
  getToken,
} from "@/lib/api.ts";
import { streamPipeline } from "@/lib/sse.ts";
import type {
  ReviewResult,
  ArticleMetadata,
  SSEStatusEvent,
  SSEGatherData,
  SSEResearchData,
  WebSource,
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

// --- Step 2: Processing with SSE (live data feed) ---

const STEP_ORDER = ["transcribing", "describing_photos", "researching", "generating", "reviewing"];

const STEP_ICONS: Record<string, React.ReactNode> = {
  transcribing: <Mic size={16} />,
  describing_photos: <ImageIcon size={16} />,
  researching: <Search size={16} />,
  generating: <PenTool size={16} />,
  reviewing: <ShieldCheck size={16} />,
};

const STEP_LABELS_EN: Record<string, string> = {
  transcribing: "Listening to your recording",
  describing_photos: "Analyzing your photos",
  researching: "Researching context",
  generating: "Writing the article",
  reviewing: "Quality review",
};

const STEP_LABELS_FI: Record<string, string> = {
  transcribing: "Kuunnellaan äänitettä",
  describing_photos: "Analysoidaan kuvia",
  researching: "Tutkitaan taustaa",
  generating: "Kirjoitetaan artikkelia",
  reviewing: "Laaduntarkistus",
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
  const { language, t } = useLanguage();
  const STEP_LABELS = language === "fi" ? STEP_LABELS_FI : STEP_LABELS_EN;
  const [stepKeys, setStepKeys] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [transcript, setTranscript] = useState<string>("");
  const [photoDescs, setPhotoDescs] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [researchContext, setResearchContext] = useState<string>("");
  const [researchSources, setResearchSources] = useState<WebSource[]>([]);
  const [researchQueries, setResearchQueries] = useState<string[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

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

        // Handle intermediate data
        if (event.step === "gathered" && event.data) {
          const d = event.data as SSEGatherData;
          if (d.transcript) setTranscript(d.transcript);
          if (d.photo_descriptions) setPhotoDescs(d.photo_descriptions);
          if (d.photo_urls) setPhotoUrls(d.photo_urls);
          if (d.notes) setNotes(d.notes);
        }
        if (event.step === "researched" && event.data) {
          const d = event.data as SSEResearchData;
          if (d.context) setResearchContext(d.context);
          if (d.sources) setResearchSources(d.sources);
          if (d.queries) setResearchQueries(d.queries);
        }
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

  // Auto-scroll feed as new content appears
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [stepKeys, transcript, photoDescs, researchContext, researchSources, currentStep]);

  const isDone = (step: string) => stepKeys.includes(step) && currentStep !== step;
  const isActive = (step: string) => currentStep === step;
  const hasReached = (step: string) => stepKeys.includes(step);

  return (
    <div className="pipeline">
      <h2 className="pipeline-title">{t("post.creating")}</h2>

      <div className="pipeline-feed" ref={feedRef}>
        {/* Step progress cards */}
        {STEP_ORDER.map((key) => {
          if (!hasReached(key) && !isActive(key)) return null;
          const done = isDone(key);
          const active = isActive(key);
          return (
            <div key={key} className={`pipeline-card ${done ? "done" : active ? "active" : ""}`}>
              <div className="pipeline-card-header">
                <span className="pipeline-card-icon">
                  {done ? <CheckCircle size={16} /> : active ? <Loader2 size={16} className="spin" /> : STEP_ICONS[key]}
                </span>
                <span className="pipeline-card-label">{STEP_LABELS[key] || key}</span>
              </div>
            </div>
          );
        })}

        {/* Transcript reveal */}
        {transcript && (
          <div className="pipeline-data" style={{ animation: "fadeIn 0.3s ease" }}>
            <div className="pipeline-data-label">
              <Mic size={14} /> Transcript
            </div>
            <p className="pipeline-data-text">{transcript}</p>
          </div>
        )}

        {/* Notes reveal */}
        {notes && (
          <div className="pipeline-data" style={{ animation: "fadeIn 0.3s ease" }}>
            <div className="pipeline-data-label">
              <Type size={14} /> {t("post.notes") || "Your notes"}
            </div>
            <p className="pipeline-data-text">{notes}</p>
          </div>
        )}

        {/* Photo descriptions */}
        {photoDescs.length > 0 && (
          <div className="pipeline-data" style={{ animation: "fadeIn 0.3s ease" }}>
            <div className="pipeline-data-label">
              <ImageIcon size={14} /> Photos analyzed
            </div>
            <div className="pipeline-photos">
              {photoUrls.map((url, i) => (
                <div key={i} className="pipeline-photo">
                  <img src={url} alt={`Photo ${i + 1}`} className="pipeline-photo-img" />
                  {photoDescs[i] && <p className="pipeline-photo-desc">{photoDescs[i]}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Research results */}
        {(researchContext || researchQueries.length > 0) && (
          <div className="pipeline-data" style={{ animation: "fadeIn 0.3s ease" }}>
            <div className="pipeline-data-label">
              <Search size={14} /> {t("post.research") || "Research findings"}
            </div>
            {researchQueries.length > 0 && (
              <div className="pipeline-queries">
                {researchQueries.map((q, i) => (
                  <span key={i} className="pipeline-query">{q}</span>
                ))}
              </div>
            )}
            {researchContext && (
              <p className="pipeline-data-text pipeline-research-context">{researchContext}</p>
            )}
            {researchSources.length > 0 && (
              <ul className="pipeline-sources">
                {researchSources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Writing / Reviewing skeleton */}
        {(isActive("generating") || isActive("reviewing") || isActive("embedding")) && (
          <div className="pipeline-writing" style={{ animation: "fadeIn 0.3s ease" }}>
            <div className="pipeline-skeleton-lines">
              {[100, 92, 85, 100, 70, 95, 55].map((w, i) => (
                <div
                  key={i}
                  className="skeleton pipeline-skeleton-line"
                  style={{ width: `${w}%`, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
          </div>
        )}
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
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  // --- Auto-save on content change (debounced 2s) ---

  const handleContentChange = useCallback(
    (markdown: string) => {
      setArticleMarkdown(markdown);
      setSaveStatus("unsaved");
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!submissionId) return;
        setSaveStatus("saving");
        try {
          await updateSubmissionMarkdown(submissionId, markdown);
          setSaveStatus("saved");
        } catch {
          setSaveStatus("unsaved");
        }
      }, 2000);
    },
    [submissionId],
  );

  // Flush pending save on unmount
  useEffect(() => {
    return () => clearTimeout(saveTimerRef.current);
  }, []);

  // --- Editorial screen callback wiring ---

  const handleRefineGeneral = useCallback(
    async (r: GeneralRefinement) => {
      // Flush pending save before AI refinement
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
        if (submissionId && articleMarkdown) {
          await updateSubmissionMarkdown(submissionId, articleMarkdown);
        }
      }
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
    [submissionId, articleMarkdown, toast],
  );

  const handlePublish = useCallback(async () => {
    try {
      // Flush pending save before publishing
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = undefined;
        if (submissionId && articleMarkdown) {
          await updateSubmissionMarkdown(submissionId, articleMarkdown);
        }
      }
      await publishArticle(submissionId);
      toast(pt("post.published"), "success");
      navigate("/");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Publish failed.", "error");
    }
  }, [submissionId, articleMarkdown, toast, navigate, pt]);

  const handleAppeal = useCallback(async () => {
    try {
      await appealSubmission(submissionId);
      toast(pt("post.appealSent"), "info");
    } catch {
      toast(pt("post.appealFailed"), "error");
    }
  }, [submissionId, toast, pt]);

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
            onContentChange={handleContentChange}
            saveStatus={saveStatus}
          />
        )}
      </div>
      <BottomBar />
    </>
  );
}
