import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowUp, X, Loader2,
  CheckCircle, Camera, EyeOff,
  Mic, ImageIcon, Search, PenTool, ShieldCheck, Type,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext.tsx";
import { useToast } from "@/components/Toast.tsx";
import {
  createSubmission,
  getSubmission,
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
import { SubmissionStatus } from "@/lib/types.ts";
import { EditorialScreen } from "@/components/editor";
import { VoiceRecorder, AudioPlayer } from "@/components/editor/VoiceRecorder";
import type { GeneralRefinement } from "@/components/editor/types";
import { useLanguage } from "@/contexts/LanguageContext";
import PublicProfileModal from "@/components/PublicProfileModal";
import Navbar from "@/components/Navbar";
import BottomBar from "@/components/BottomBar";
import "./PostPage.css";

// --- Step 1: Input ---
function InputStep({ onSubmit }: { onSubmit: (submissionId: string) => void }) {
  const [text, setText] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [showPublicModal, setShowPublicModal] = useState(false);
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

  async function doSubmit() {
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
      const msg = err instanceof Error ? err.message : t("post.submissionFailed");
      if (msg === "public_profile_required") {
        setShowPublicModal(true);
        setIsSubmitting(false);
        return;
      }
      setError(msg);
      toast(msg, "error");
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    if (user && !user.public) {
      setShowPublicModal(true);
      return;
    }
    doSubmit();
  }

  function handleMadePublic() {
    setShowPublicModal(false);
    doSubmit();
  }

  return (
    <div className="compose">
      <h1 className="compose-prompt">{t("post.whatHappened")}</h1>
      <p className="compose-hint">
        {t("post.hint")}
      </p>

      {error && <p className="auth-error">{error}</p>}

      <form className="compose-form" onSubmit={handleSubmit}>
        {(files.length > 0 || audioURL) && (
          <div className="compose-attachments">
            {audioURL && (
              <AudioPlayer
                src={audioURL}
                onRemove={() => { setAudioBlob(null); setAudioURL(null); }}
              />
            )}
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
          </div>
        )}

        <textarea
          className="compose-textarea"
          placeholder={t("post.notesPlaceholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSubmitting}
        />

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
              onRecording={(blob) => {
                setAudioBlob(blob);
                setAudioURL(URL.createObjectURL(blob));
              }}
              compact
              externalAudioURL={audioURL}
              onClear={() => { setAudioBlob(null); setAudioURL(null); }}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={onFiles}
          />
          <div className="compose-toolbar-right">
            <button
              type="button"
              className={`compose-anon-toggle ${anonymous ? "compose-anon-toggle--active" : ""}`}
              onClick={() => setAnonymous(!anonymous)}
              disabled={isSubmitting}
            >
              <EyeOff size={14} />
              <span>{t("post.anonymous")}</span>
            </button>
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
        </div>
      </form>

      <PublicProfileModal
        open={showPublicModal}
        onClose={() => setShowPublicModal(false)}
        onMadePublic={handleMadePublic}
      />
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

const SCORE_KEYS = ["evidence", "perspectives", "representation", "ethical_framing", "cultural_context", "manipulation"];

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
  const { t } = useLanguage();
  const colors: Record<string, string> = {
    GREEN: "var(--color-success, #22c55e)",
    YELLOW: "var(--color-warning, #f59e0b)",
    RED: "var(--color-error, #ef4444)",
  };
  const labels: Record<string, string> = {
    GREEN: t("gate.readyToPublish"),
    YELLOW: t("gate.needsReview"),
    RED: t("gate.issuesFound"),
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
  const STEP_LABELS: Record<string, string> = {
    transcribing: t("post.stepListening"),
    describing_photos: t("post.stepPhotos"),
    researching: language === "fi" ? "Tutkitaan taustaa" : "Researching background",
    generating: t("post.stepWriting"),
    reviewing: t("post.stepReviewing"),
  };
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



              {/* GATHER: transcript + notes + photos inline */}
              {key === "transcribing" && done && transcript && (
                <div className="pl-step-body">
                  <div className="pl-data-block">
                    <div className="pl-data-label"><Mic size={12} /> {t("pipeline.transcript")}</div>
                    <p className="pl-data-text">{transcript}</p>
                  </div>
                  {notes && (
                    <div className="pl-data-block">
                      <div className="pl-data-label"><Type size={12} /> {t("pipeline.notes")}</div>
                      <p className="pl-data-text">{notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Notes-only (no audio) */}
              {key === "transcribing" && done && !transcript && notes && (
                <div className="pl-step-body">
                  <div className="pl-data-block">
                    <div className="pl-data-label"><Type size={12} /> {t("pipeline.notes")}</div>
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
                      <div className="pl-data-label"><Search size={12} /> {t("pipeline.findings")}</div>
                      <p className="pl-data-text pl-research-text">{researchContext}</p>
                    </div>
                  )}
                  {researchSources.length > 0 && (
                    <div className="pl-sources">
                      <div className="pl-data-label">{t("pipeline.sources")} ({researchSources.length})</div>
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
                    <span className="pl-badge pl-badge--structure">{t("structure." + genData.structure)}</span>
                    <span className="pl-badge pl-badge--category">{genData.category}</span>
                    <span className="pl-badge pl-badge--words">{genData.word_count} {t("pipeline.words")}</span>
                    <span className="pl-badge pl-badge--confidence">{Math.round(genData.confidence * 100)}% {t("pipeline.confident")}</span>
                  </div>
                  {genData.missing_context && genData.missing_context.length > 0 && (
                    <div className="pl-missing">
                      <div className="pl-data-label">{t("pipeline.missingContext")}</div>
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
                    <span className="pl-review-stat">{reviewData.verified_claims} {t("pipeline.claimsVerified")}</span>
                    {reviewData.web_sources > 0 && (
                      <span className="pl-review-stat">{reviewData.web_sources} {t("pipeline.webSources")}</span>
                    )}
                  </div>
                  <div className="pl-scores">
                    {SCORE_KEYS.map((key) => (
                      <ScoreBar key={key} label={t("score." + key)} value={(reviewData.scores as unknown as Record<string, number>)[key] ?? 0} />
                    ))}
                  </div>
                  {reviewData.coaching && reviewData.coaching.celebration && (
                    <div className="pl-coaching">
                      <p className="pl-coaching-text">{reviewData.coaching.celebration}</p>
                    </div>
                  )}
                  {reviewData.red_triggers > 0 && (
                    <span className="pl-badge pl-badge--red">{reviewData.red_triggers} {reviewData.red_triggers > 1 ? t("pipeline.redTriggers") : t("pipeline.redTrigger")}</span>
                  )}
                  {reviewData.yellow_flags > 0 && (
                    <span className="pl-badge pl-badge--yellow">{reviewData.yellow_flags} {reviewData.yellow_flags > 1 ? t("pipeline.yellowFlags") : t("pipeline.yellowFlag")}</span>
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

// --- Mock data for UI testing (skip pipeline) ---
const MOCK_ARTICLE = `# Kirkkonummen valtuusto hyväksyi budjetin äänin 5-2

Kirkkonummen kunnanvaltuusto äänesti tiistai-iltana budjetista, joka leikkaa koulujen rahoitusta merkittävästi. Päätös syntyi äänin 5-2.

"Lapsemme ansaitsevat parempaa", sanoi valtuutettu Korhonen, yksi kahdesta vastaan äänestäneestä.

## Leikkaukset herättävät huolta

Arviolta 40 asukasta täytti valtuustosalin, monet heistä kouluikäisten lasten vanhempia. Useat puhujat ilmaisivat huolensa leikkausten vaikutuksista paikallisiin kouluihin.

Budjetti sisältää 2,3 miljoonan euron leikkaukset koulutukseen, mikä vaikuttaa erityisesti iltapäiväkerhotoimintaan ja erityisopetuksen resursseihin.

> "Olemme joutuneet tekemään vaikeita valintoja, mutta kunnan taloustilanne ei anna muita vaihtoehtoja", totesi kunnanjohtaja Virtanen.

Seuraava valtuuston kokous pidetään 15. maaliskuuta, jolloin käsitellään leikkausten toimeenpanosuunnitelma.`;

const MOCK_REVIEW: ReviewResult = {
  verification: [
    { claim: "Kirkkonummen kunnanvaltuusto äänesti tiistai-iltana budjetista", evidence: "Contributor notes: 'valtuuston budjettikokous tiistaina'", status: "SUPPORTED" },
    { claim: "Päätös syntyi äänin 5-2", evidence: "Contributor notes: 'äänestys 5-2'", status: "SUPPORTED" },
    { claim: "Lapsemme ansaitsevat parempaa, sanoi valtuutettu Korhonen", evidence: "Contributor audio transcript: 'Korhonen sanoi että lapsemme ansaitsevat parempaa'", status: "SUPPORTED" },
    { claim: "Arviolta 40 asukasta täytti valtuustosalin", evidence: "Contributor notes: 'paljon väkeä'", status: "NOT_IN_SOURCE" },
    { claim: "Budjetti sisältää 2,3 miljoonan euron leikkaukset koulutukseen", evidence: "none found in source", status: "POSSIBLE_HALLUCINATION" },
    { claim: "vaikuttaa erityisesti iltapäiväkerhotoimintaan ja erityisopetuksen resursseihin", evidence: "none found in source", status: "POSSIBLE_HALLUCINATION" },
    { claim: "kunnanjohtaja Virtanen totesi", evidence: "Contributor notes mention 'Virtanen puhui' but no direct quote provided", status: "NOT_IN_SOURCE" },
  ],
  scores: {
    evidence: 0.6,
    perspectives: 0.4,
    representation: 0.5,
    ethical_framing: 0.8,
    cultural_context: 0.7,
    manipulation: 0.9,
  },
  gate: "YELLOW",
  red_triggers: [],
  yellow_flags: [
    { dimension: "PERSPECTIVES", description: "Single-source story on a multi-stakeholder topic", suggestion: "A quote from a parent or teacher who attended would make this story even richer." },
    { dimension: "EVIDENCE", description: "Some details added beyond source material", suggestion: "The specific budget figure and affected programs aren't in your notes — do you have a source for those?" },
  ],
  coaching: {
    celebration: "The Korhonen quote really captures the tension of the vote. Strong opening that gets right to the news.",
    suggestions: [
      "Do you remember roughly how many people were at the meeting? You mentioned it was packed — even an estimate like 'about 30-40' would strengthen the story.",
      "Did any parents speak during the public comment period? A quote from someone in the audience would bring this to life.",
    ],
  },
  web_sources: [
    { title: "Kirkkonummen kunta", url: "https://kirkkonummi.fi" },
  ],
};

const MOCK_METADATA: ArticleMetadata = {
  chosen_structure: "news_report",
  category: "council",
  confidence: 0.7,
  missing_context: ["Approximate attendance count", "Names of parents who spoke"],
};

// --- Main: Thin Orchestrator ---
type FlowStep = "loading" | "input" | "processing" | "preview";

export default function PostPage() {
  const { id: routeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t: pt } = useLanguage();
  const [step, setStep] = useState<FlowStep>(routeId ? "loading" : "input");
  const [submissionId, setSubmissionId] = useState<string>(routeId || "");
  const [articleMarkdown, setArticleMarkdown] = useState<string>("");
  const [reviewData, setReviewData] = useState<ReviewResult | null>(null);
  const [metadata, setMetadata] = useState<ArticleMetadata | null>(null);
  const [currentRound, setCurrentRound] = useState(0);
  const [processingError, setProcessingError] = useState<string>("");
  const [isRefining, setIsRefining] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const refineAbortRef = useRef<AbortController | null>(null);

  // Load existing submission when navigating to /post/:id
  useEffect(() => {
    if (!routeId) return;
    let cancelled = false;
    getSubmission(routeId).then((sub) => {
      if (cancelled) return;
      setSubmissionId(sub.id);
      const meta = sub.meta;
      // Ready or Refining: go to editorial screen
      if (
        (sub.status === SubmissionStatus.Ready || sub.status === SubmissionStatus.Refining) &&
        meta.article_markdown &&
        meta.review &&
        meta.article_metadata
      ) {
        setArticleMarkdown(meta.article_markdown);
        setReviewData(meta.review);
        setMetadata(meta.article_metadata);
        setCurrentRound(meta.versions?.length ?? 0);
        setIsRefining(sub.status === SubmissionStatus.Refining);
        setStep("preview");
      } else if (
        sub.status === SubmissionStatus.Transcribing ||
        sub.status === SubmissionStatus.Generating ||
        sub.status === SubmissionStatus.Reviewing ||
        sub.status === SubmissionStatus.Researching
      ) {
        // In-progress pipeline
        setStep("processing");
      } else {
        // Draft with no article yet — treat as processing
        setStep("processing");
      }
    }).catch(() => {
      if (!cancelled) {
        toast(pt("post.loadFailed") || "Failed to load draft", "error");
        setStep("input");
      }
    });
    return () => { cancelled = true; };
  }, [routeId, toast, pt]);

  const handleDemo = useCallback(() => {
    setSubmissionId("demo");
    setArticleMarkdown(MOCK_ARTICLE);
    setReviewData(MOCK_REVIEW);
    setMetadata(MOCK_METADATA);
    setStep("preview");
  }, []);

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

  // Flush pending save + abort refine stream on unmount
  useEffect(() => {
    return () => {
      clearTimeout(saveTimerRef.current);
      refineAbortRef.current?.abort();
    };
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
      setIsRefining(true);
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
        // Stream the pipeline in background — stay on editorial screen
        const token = getToken();
        if (!token) throw new Error("Not authenticated");
        refineAbortRef.current = streamPipeline(submissionId, token, {
          onStatus: () => {},
          onComplete: (data) => {
            setArticleMarkdown(data.article);
            setReviewData(data.review);
            setMetadata(data.metadata);
            setIsRefining(false);
          },
          onError: (err) => {
            toast(err.message || pt("post.refineFailed"), "error");
            setIsRefining(false);
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : pt("post.refineFailed");
        toast(msg, "error");
        setIsRefining(false);
      }
    },
    [submissionId, articleMarkdown, toast, pt],
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
      toast(err instanceof Error ? err.message : pt("post.publishFailed"), "error");
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
        {step === "loading" && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "var(--space-16)" }}>
            <Loader2 size={32} className="spin" style={{ color: "var(--color-text-tertiary)" }} />
          </div>
        )}
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
            <button
              type="button"
              onClick={handleDemo}
              style={{
                margin: "var(--space-4) auto",
                display: "block",
                background: "none",
                border: "1px dashed var(--color-gray-300)",
                borderRadius: "var(--radius-md)",
                padding: "var(--space-2) var(--space-4)",
                color: "var(--color-text-tertiary)",
                fontSize: "var(--text-sm)",
                cursor: "pointer",
              }}
            >
              {pt("post.demo")}
            </button>
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
            userName={user?.profile_name || pt("post.anonymous")}
            currentRound={currentRound}
            isRefining={isRefining}
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
