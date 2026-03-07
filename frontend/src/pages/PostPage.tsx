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
  SSEGeneratedData,
  SSEReviewedData,
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
  researching: "Researching background",
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

const STRUCTURE_LABELS: Record<string, string> = {
  news_report: "News Report",
  feature: "Feature Story",
  photo_essay: "Photo Essay",
  brief: "Brief",
  narrative: "Narrative",
};

const SCORE_LABELS: Record<string, string> = {
  evidence: "Evidence",
  perspectives: "Perspectives",
  representation: "Representation",
  ethical_framing: "Ethics",
  cultural_context: "Cultural",
  manipulation: "Integrity",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "var(--color-success, #22c55e)" : pct >= 60 ? "var(--color-warning, #f59e0b)" : "var(--color-error, #ef4444)";
  return (
    <div className="pl-score">
      <span className="pl-score-label">{label}</span>
      <div className="pl-score-track">
        <div className="pl-score-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="pl-score-value">{pct}</span>
    </div>
  );
}

function GateBadge({ gate }: { gate: string }) {
  const colors: Record<string, string> = {
    GREEN: "var(--color-success, #22c55e)",
    YELLOW: "var(--color-warning, #f59e0b)",
    RED: "var(--color-error, #ef4444)",
  };
  const labels: Record<string, string> = {
    GREEN: "Ready to publish",
    YELLOW: "Needs review",
    RED: "Issues found",
  };
  return (
    <span className="pl-gate" style={{ background: colors[gate] || colors.YELLOW }}>
      {labels[gate] || gate}
    </span>
  );
}

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
  const [stepTimes, setStepTimes] = useState<Record<string, number>>({});
  const stepStartRef = useRef<number>(Date.now());

  // Gathered data
  const [transcript, setTranscript] = useState<string>("");
  const [photoDescs, setPhotoDescs] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");

  // Research data
  const [researchContext, setResearchContext] = useState<string>("");
  const [researchSources, setResearchSources] = useState<WebSource[]>([]);
  const [researchQueries, setResearchQueries] = useState<string[]>([]);

  // Generation metadata
  const [genData, setGenData] = useState<SSEGeneratedData | null>(null);

  // Review summary
  const [reviewData, setReviewData] = useState<SSEReviewedData | null>(null);

  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      onError("Not authenticated");
      return;
    }

    const controller = streamPipeline(submissionId, token, {
      onStatus(event: SSEStatusEvent) {
        // Track elapsed time for previous step
        const now = Date.now();
        setCurrentStep((prev) => {
          if (prev && prev !== event.step) {
            const elapsed = Math.round((now - stepStartRef.current) / 1000);
            setStepTimes((t) => ({ ...t, [prev]: elapsed }));
          }
          stepStartRef.current = now;
          return event.step;
        });
        setStepKeys((prev) =>
          prev.includes(event.step) ? prev : [...prev, event.step],
        );

        // Handle intermediate data payloads
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
        if (event.step === "generated" && event.data) {
          setGenData(event.data as SSEGeneratedData);
        }
        if (event.step === "reviewed" && event.data) {
          setReviewData(event.data as SSEReviewedData);
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

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [stepKeys, transcript, photoDescs, researchContext, genData, reviewData, currentStep]);

  const isDone = (step: string) => stepKeys.includes(step) && currentStep !== step;
  const isActive = (step: string) => currentStep === step;
  const hasReached = (step: string) => stepKeys.includes(step);

  return (
    <div className="pipeline">
      <h2 className="pipeline-title">{t("post.creating")}</h2>

      <div className="pipeline-feed" ref={feedRef}>
        {STEP_ORDER.map((key) => {
          if (!hasReached(key) && !isActive(key)) return null;
          const done = isDone(key);
          const active = isActive(key);
          const elapsed = stepTimes[key];

          return (
            <div key={key} className={`pl-step ${done ? "done" : ""} ${active ? "active" : ""}`}>
              {/* Step header */}
              <div className="pl-step-header">
                <span className="pl-step-icon">
                  {done ? <CheckCircle size={16} /> : active ? <Loader2 size={16} className="spin" /> : STEP_ICONS[key]}
                </span>
                <span className="pl-step-label">{STEP_LABELS[key] || key}</span>
                {elapsed != null && <span className="pl-step-time">{elapsed}s</span>}
              </div>

              {/* Active step: show pulsing indicator */}
              {active && (
                <div className="pl-step-body">
                  <div className="pl-thinking">
                    <span /><span /><span />
                  </div>
                </div>
              )}

              {/* GATHER: transcript + notes + photos inline */}
              {key === "transcribing" && done && transcript && (
                <div className="pl-step-body">
                  <div className="pl-data-block">
                    <div className="pl-data-label"><Mic size={12} /> Transcript</div>
                    <p className="pl-data-text">{transcript}</p>
                  </div>
                  {notes && (
                    <div className="pl-data-block">
                      <div className="pl-data-label"><Type size={12} /> Notes</div>
                      <p className="pl-data-text">{notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes-only (no audio) */}
              {key === "transcribing" && done && !transcript && notes && (
                <div className="pl-step-body">
                  <div className="pl-data-block">
                    <div className="pl-data-label"><Type size={12} /> Notes</div>
                    <p className="pl-data-text">{notes}</p>
                  </div>
                </div>
              )}

              {/* PHOTOS inline */}
              {key === "describing_photos" && done && photoDescs.length > 0 && (
                <div className="pl-step-body">
                  <div className="pl-photos">
                    {photoUrls.map((url, i) => (
                      <div key={i} className="pl-photo">
                        <img src={url} alt={`Photo ${i + 1}`} className="pl-photo-img" />
                        {photoDescs[i] && <p className="pl-photo-desc">{photoDescs[i]}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RESEARCH inline */}
              {key === "researching" && done && (researchContext || researchQueries.length > 0) && (
                <div className="pl-step-body">
                  {researchQueries.length > 0 && (
                    <div className="pl-queries">
                      {researchQueries.map((q, i) => (
                        <span key={i} className="pl-query">{q}</span>
                      ))}
                    </div>
                  )}
                  {researchContext && (
                    <div className="pl-data-block">
                      <div className="pl-data-label"><Search size={12} /> Findings</div>
                      <p className="pl-data-text pl-research-text">{researchContext}</p>
                    </div>
                  )}
                  {researchSources.length > 0 && (
                    <div className="pl-sources">
                      <div className="pl-data-label">Sources ({researchSources.length})</div>
                      <ul>
                        {researchSources.map((s, i) => (
                          <li key={i}>
                            <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* GENERATION metadata inline */}
              {key === "generating" && done && genData && (
                <div className="pl-step-body">
                  <div className="pl-gen-meta">
                    <span className="pl-badge pl-badge--structure">{STRUCTURE_LABELS[genData.structure] || genData.structure}</span>
                    <span className="pl-badge pl-badge--category">{genData.category}</span>
                    <span className="pl-badge pl-badge--words">{genData.word_count} words</span>
                    <span className="pl-badge pl-badge--confidence">{Math.round(genData.confidence * 100)}% confident</span>
                  </div>
                  {genData.missing_context && genData.missing_context.length > 0 && (
                    <div className="pl-missing">
                      <div className="pl-data-label">Questions the AI couldn't answer</div>
                      <ul>
                        {genData.missing_context.map((q, i) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* REVIEW summary inline */}
              {key === "reviewing" && done && reviewData && (
                <div className="pl-step-body">
                  <div className="pl-review-header">
                    <GateBadge gate={reviewData.gate} />
                    <span className="pl-review-stat">{reviewData.verified_claims} claims verified</span>
                    {reviewData.web_sources > 0 && (
                      <span className="pl-review-stat">{reviewData.web_sources} web sources</span>
                    )}
                  </div>
                  <div className="pl-scores">
                    {Object.entries(SCORE_LABELS).map(([key, label]) => (
                      <ScoreBar key={key} label={label} value={(reviewData.scores as unknown as Record<string, number>)[key] ?? 0} />
                    ))}
                  </div>
                  {reviewData.coaching && reviewData.coaching.celebration && (
                    <div className="pl-coaching">
                      <p className="pl-coaching-text">{reviewData.coaching.celebration}</p>
                    </div>
                  )}
                  {reviewData.red_triggers > 0 && (
                    <span className="pl-badge pl-badge--red">{reviewData.red_triggers} red trigger{reviewData.red_triggers > 1 ? "s" : ""}</span>
                  )}
                  {reviewData.yellow_flags > 0 && (
                    <span className="pl-badge pl-badge--yellow">{reviewData.yellow_flags} yellow flag{reviewData.yellow_flags > 1 ? "s" : ""}</span>
                  )}
                </div>
              )}
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
