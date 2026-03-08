import { useState, useCallback, useEffect, useRef, useEffectEvent } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArticleEditor } from "./ArticleRenderer";
import { CoachingPanel } from "./CoachingPanel";
import { RefinementInput } from "./RefinementInput";
import { InstructionBar } from "./InstructionBar";
import { StoryStrength } from "./StoryStrength";
import { PublishButton } from "./PublishButton";
import { VersionInfo } from "./VersionInfo";
import { useParagraphTap } from "./hooks/useParagraphTap";
import type { EditorialScreenProps, ActiveAnnotation } from "./types";
import type { RedTrigger } from "@/lib/types";
import "./editor.css";

const SIDEBAR_WIDTH_KEY = "editorial:sidebar-width";
const DEFAULT_SIDEBAR_WIDTH = 368;
const MIN_SIDEBAR_WIDTH = 320;
const MAX_SIDEBAR_WIDTH = 468;

function formatStructureLabel(structure: string) {
  return structure.replace(/_/g, " ");
}

export function EditorialScreen({
  articleMarkdown,
  review,
  metadata,
  userName,
  currentRound = 0,
  isRefining = false,
  onRefineGeneral,
  onPublish,
  onAppeal,
  onBack,
  onContentChange,
  saveStatus,
}: EditorialScreenProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeAnnotation, setActiveAnnotation] = useState<ActiveAnnotation>(null);
  const [highlightParagraph, setHighlightParagraph] = useState<number | undefined>();
  const [changedParagraphs, setChangedParagraphs] = useState<number[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const articleRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const resizeSessionRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const prevArticleRef = useRef(articleMarkdown);

  // Mobile paragraph tap for InstructionBar — desktop text selection uses BubbleMenu AI section
  const paragraphTap = useParagraphTap(articleRef);
  const instructionTarget = paragraphTap;

  // Click-outside to dismiss suggestion card
  useEffect(() => {
    if (!activeAnnotation) return;
    function handleClick(e: MouseEvent) {
      const card = document.querySelector(".suggestion-card");
      if (card && !card.contains(e.target as Node)) {
        setActiveAnnotation(null);
      }
    }
    const id = setTimeout(() => document.addEventListener("click", handleClick), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", handleClick);
    };
  }, [activeAnnotation]);

  const handleAnnotationClick = useCallback((trigger: RedTrigger, rect: DOMRect) => {
    setActiveAnnotation({ trigger, rect });
  }, []);

  const handleAnnotationDismiss = useCallback(() => {
    setActiveAnnotation(null);
  }, []);

  const handleSuggestionClick = useCallback((paragraphRef: number) => {
    setHighlightParagraph(paragraphRef);
    const el = document.querySelector(`[data-paragraph="${paragraphRef}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightParagraph(undefined), 3000);
  }, []);

  const handleContentChange = useCallback(
    (md: string) => {
      onContentChange?.(md);
    },
    [onContentChange],
  );

  // Capture article state when refinement starts
  useEffect(() => {
    if (isRefining) {
      prevArticleRef.current = articleMarkdown;
    }
  }, [isRefining]); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect changed paragraphs after refinement completes
  useEffect(() => {
    if (isRefining || !articleRef.current) return;
    if (prevArticleRef.current === articleMarkdown) return;

    const oldParas = prevArticleRef.current.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
    const newParas = articleMarkdown.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
    const changed: number[] = [];
    const maxLen = Math.max(oldParas.length, newParas.length);
    for (let i = 0; i < maxLen; i++) {
      if (oldParas[i] !== newParas[i]) changed.push(i);
    }
    if (changed.length > 0) {
      setChangedParagraphs(changed);
      const timer = setTimeout(() => setChangedParagraphs([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [isRefining, articleMarkdown]);

  // BubbleMenu AI action — triggered from text selection popup
  const handleAiAction = useCallback(
    (instruction: string, selectedText: string, paragraphIndex: number) => {
      const prefix = selectedText
        ? `Regarding "${selectedText}" in paragraph ${paragraphIndex + 1}: `
        : `In paragraph ${paragraphIndex + 1}: `;
      onRefineGeneral({ text_note: prefix + instruction });
      toast("Sent to AI -- updating article...", "info");
    },
    [onRefineGeneral, toast],
  );

  // InstructionBar handlers — compose targeted input into general refinement
  const handleInstructionSubmit = useCallback(
    (r: { selected_text?: string; instruction: string; paragraph_index: number }) => {
      const prefix = r.selected_text
        ? `Regarding "${r.selected_text}" in paragraph ${r.paragraph_index + 1}: `
        : `In paragraph ${r.paragraph_index + 1}: `;
      onRefineGeneral({ text_note: prefix + r.instruction });
      toast("Sent to AI -- updating article...", "info");
    },
    [onRefineGeneral, toast],
  );

  const handleInstructionRephrase = useCallback(
    (r: { selected_text: string; paragraph_index: number }) => {
      onRefineGeneral({ text_note: `Rephrase "${r.selected_text}" in paragraph ${r.paragraph_index + 1}` });
      toast("Sent to AI -- updating article...", "info");
    },
    [onRefineGeneral, toast],
  );

  const handleInstructionRemove = useCallback(
    (paragraphIndex: number, selectedText: string) => {
      const target = selectedText
        ? `Remove "${selectedText}" from paragraph ${paragraphIndex + 1}`
        : `Remove paragraph ${paragraphIndex + 1}`;
      onRefineGeneral({ text_note: target });
      toast("Sent to AI -- updating article...", "info");
    },
    [onRefineGeneral, toast],
  );

  // no-op dismiss (hooks manage their own state via selection change)
  const handleInstructionDismiss = useCallback(() => {
    // Deselect text to hide the bar
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    return () => clearTimeout(highlightTimer.current);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedWidth = window.localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (!storedWidth) return;

    const parsedWidth = Number(storedWidth);
    if (!Number.isFinite(parsedWidth)) return;
    setSidebarWidth(Math.round(parsedWidth));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
  }, [sidebarWidth]);

  const clampSidebarWidth = useCallback((nextWidth: number) => {
    const containerWidth = bodyRef.current?.getBoundingClientRect().width;
    if (!containerWidth) {
      return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, nextWidth));
    }

    const constrainedMax = Math.max(
      MIN_SIDEBAR_WIDTH,
      Math.min(MAX_SIDEBAR_WIDTH, Math.round(containerWidth * 0.44)),
    );
    return Math.min(constrainedMax, Math.max(MIN_SIDEBAR_WIDTH, Math.round(nextWidth)));
  }, []);

  const stopSidebarResize = useEffectEvent(() => {
    if (!resizeSessionRef.current) return;
    resizeSessionRef.current = null;
    setIsResizingSidebar(false);
    document.body.style.removeProperty("cursor");
    document.body.style.removeProperty("user-select");
  });

  const updateSidebarResize = useEffectEvent((clientX: number) => {
    const session = resizeSessionRef.current;
    if (!session) return;

    const delta = session.startX - clientX;
    setSidebarWidth(clampSidebarWidth(session.startWidth + delta));
  });

  useEffect(() => {
    if (!isResizingSidebar) return;

    function handlePointerMove(event: PointerEvent) {
      updateSidebarResize(event.clientX);
    }

    function handlePointerUp() {
      stopSidebarResize();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isResizingSidebar, stopSidebarResize, updateSidebarResize]);

  useEffect(() => {
    return () => {
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    };
  }, []);

  const handleSidebarResizeStart = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!window.matchMedia("(min-width: 1024px)").matches) return;

      event.preventDefault();
      resizeSessionRef.current = {
        startX: event.clientX,
        startWidth: sidebarWidth,
      };
      setIsResizingSidebar(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth],
  );

  const handleSidebarResizeKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSidebarWidth((current) => clampSidebarWidth(current + 24));
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setSidebarWidth((current) => clampSidebarWidth(current - 24));
      }
    },
    [clampSidebarWidth],
  );

  const statusLabel =
    saveStatus === "saving"
      ? t("editor.saving")
      : saveStatus === "saved"
        ? t("editor.saved")
        : null;
  const statusClass = saveStatus ? `save-status save-status--${saveStatus}` : "save-status";
  const coachingPromptCount = review.coaching.suggestions.length;
  const flaggedVerificationCount =
    review.verification?.filter((entry) => entry.status !== "SUPPORTED").length ?? 0;
  const openContextCount = metadata.missing_context.length;
  const linkedSourceCount = review.web_sources?.length ?? 0;

  return (
    <div
      className={`editorial ${isResizingSidebar ? "editorial--resizing" : ""}`}
      style={
        {
          animation: "fadeIn 0.4s ease",
          "--editorial-sidebar-width": `${sidebarWidth}px`,
        } as React.CSSProperties
      }
    >
      {/* Top bar */}
      <div className="editorial-header">
        <div className="editorial-header-left">
          <button className="btn-back" onClick={onBack}>
            <ArrowLeft size={16} /> {t("editor.back")}
          </button>
          <div className="editorial-status-strip">
            <span className="editorial-status-pill editorial-status-pill--strong">
              {formatStructureLabel(metadata.chosen_structure)}
            </span>
            {metadata.category && (
              <span className="editorial-status-pill">
                {metadata.category}
              </span>
            )}
            <span className="editorial-status-pill">
              {Math.round(metadata.confidence * 100)}% confidence
            </span>
          </div>
        </div>
        <div className="editorial-header-right">
          {statusLabel && <span className={statusClass}>{statusLabel}</span>}
          <StoryStrength scores={review.scores} />
          <PublishButton gate={review.gate} onPublish={onPublish} scores={review.scores} />
        </div>
      </div>

      {/* Two-column body */}
      <div ref={bodyRef} className="editorial-body">
        {/* Left: Editable article with annotations */}
        <div
          ref={articleRef}
          className={`editorial-article-wrapper ${isRefining ? "editorial-article-wrapper--refining" : ""}`}
        >
          <ArticleEditor
            markdown={articleMarkdown}
            userName={userName}
            category={metadata.category}
            redTriggers={review.red_triggers}
            verification={review.verification}
            activeAnnotation={activeAnnotation}
            onAnnotationClick={handleAnnotationClick}
            onAnnotationDismiss={handleAnnotationDismiss}
            highlightParagraph={highlightParagraph}
            onContentChange={handleContentChange}
            onAiAction={isRefining ? undefined : handleAiAction}
            changedParagraphs={changedParagraphs}
          />
          {isRefining && (
            <div className="editorial-refining-indicator">
              <Loader2 size={20} className="spin" />
              <span>{t("editor.updating")}</span>
            </div>
          )}
          {/* Floating instruction bar for targeted refinement */}
          {!isRefining && instructionTarget && (
            <InstructionBar
              selection={instructionTarget}
              articleRef={articleRef}
              onSubmit={handleInstructionSubmit}
              onRephrase={handleInstructionRephrase}
              onRemove={handleInstructionRemove}
              onDismiss={handleInstructionDismiss}
            />
          )}
        </div>

        <button
          type="button"
          className="editorial-splitter"
          aria-label="Resize review panel"
          aria-orientation="vertical"
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          aria-valuenow={sidebarWidth}
          onPointerDown={handleSidebarResizeStart}
          onKeyDown={handleSidebarResizeKeyDown}
        >
          <span className="editorial-splitter__thumb" aria-hidden="true" />
        </button>

        {/* Right: Coaching sidebar */}
        <aside className="editorial-coaching">
          <div className="editorial-rail-header">
            <div>
              <p className="editorial-rail-kicker">Editorial Review</p>
              <h2 className="editorial-rail-title">Checks and notes</h2>
            </div>
            <div className="editorial-rail-meta">
              <span>{coachingPromptCount} prompts</span>
              <span>{flaggedVerificationCount} checks</span>
            </div>
          </div>
          <CoachingPanel
            review={review}
            onAppeal={onAppeal}
            onSuggestionClick={handleSuggestionClick}
            onRefine={isRefining ? undefined : onRefineGeneral}
          />
          <RefinementInput onRefine={onRefineGeneral} disabled={isRefining} />
          <div className="editorial-rail-footer">
            <VersionInfo round={currentRound} />
            <div className="editorial-rail-footer__stats">
              <span>{openContextCount > 0 ? `${openContextCount} context gaps` : "Context mapped"}</span>
              {linkedSourceCount > 0 && <span>{linkedSourceCount} linked sources</span>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
