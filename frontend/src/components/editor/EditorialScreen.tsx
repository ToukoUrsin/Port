import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArticleEditor } from "./ArticleRenderer";
import { CoachingPanel } from "./CoachingPanel";
import { RefinementInput } from "./RefinementInput";
import { InstructionBar } from "./InstructionBar";
import { GateBadge } from "./GateBadge";
import { PublishButton } from "./PublishButton";
import { VersionInfo } from "./VersionInfo";
import { useParagraphTap } from "./hooks/useParagraphTap";
import type { EditorialScreenProps, ActiveAnnotation } from "./types";
import type { RedTrigger } from "@/lib/types";
import "./editor.css";

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
  const [activeAnnotation, setActiveAnnotation] = useState<ActiveAnnotation>(null);
  const [highlightParagraph, setHighlightParagraph] = useState<number | undefined>();
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const articleRef = useRef<HTMLDivElement>(null);

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

  // BubbleMenu AI action — triggered from text selection popup
  const handleAiAction = useCallback(
    (instruction: string, selectedText: string, paragraphIndex: number) => {
      const prefix = selectedText
        ? `Regarding "${selectedText}" in paragraph ${paragraphIndex + 1}: `
        : `In paragraph ${paragraphIndex + 1}: `;
      onRefineGeneral({ text_note: prefix + instruction });
    },
    [onRefineGeneral],
  );

  // InstructionBar handlers — compose targeted input into general refinement
  const handleInstructionSubmit = useCallback(
    (r: { selected_text?: string; instruction: string; paragraph_index: number }) => {
      const prefix = r.selected_text
        ? `Regarding "${r.selected_text}" in paragraph ${r.paragraph_index + 1}: `
        : `In paragraph ${r.paragraph_index + 1}: `;
      onRefineGeneral({ text_note: prefix + r.instruction });
    },
    [onRefineGeneral],
  );

  const handleInstructionRephrase = useCallback(
    (r: { selected_text: string; paragraph_index: number }) => {
      onRefineGeneral({ text_note: `Rephrase "${r.selected_text}" in paragraph ${r.paragraph_index + 1}` });
    },
    [onRefineGeneral],
  );

  const handleInstructionRemove = useCallback(
    (paragraphIndex: number, selectedText: string) => {
      const target = selectedText
        ? `Remove "${selectedText}" from paragraph ${paragraphIndex + 1}`
        : `Remove paragraph ${paragraphIndex + 1}`;
      onRefineGeneral({ text_note: target });
    },
    [onRefineGeneral],
  );

  // no-op dismiss (hooks manage their own state via selection change)
  const handleInstructionDismiss = useCallback(() => {
    // Deselect text to hide the bar
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    return () => clearTimeout(highlightTimer.current);
  }, []);

  const statusLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : null;

  return (
    <div className="editorial" style={{ animation: "fadeIn 0.4s ease" }}>
      {/* Top bar */}
      <div className="editorial-header">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={16} /> {t("editor.back")}
        </button>
        <div className="editorial-header-right">
          {statusLabel && <span className="save-status">{statusLabel}</span>}
          <GateBadge gate={review.gate} />
          <PublishButton gate={review.gate} onPublish={onPublish} />
        </div>
      </div>

      {/* Two-column body */}
      <div className="editorial-body">
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

        {/* Right: Coaching sidebar */}
        <aside className="editorial-coaching">
          <CoachingPanel
            review={review}
            onAppeal={onAppeal}
            onSuggestionClick={handleSuggestionClick}
            onRefine={isRefining ? undefined : onRefineGeneral}
          />
          <RefinementInput onRefine={onRefineGeneral} disabled={isRefining} />
          <VersionInfo round={currentRound} />
        </aside>
      </div>
    </div>
  );
}
