import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArticleEditor } from "./ArticleRenderer";
import { CoachingPanel } from "./CoachingPanel";
import { RefinementInput } from "./RefinementInput";
import { GateBadge } from "./GateBadge";
import { PublishButton } from "./PublishButton";
import { VersionInfo } from "./VersionInfo";
import type { EditorialScreenProps, ActiveAnnotation } from "./types";
import type { RedTrigger } from "@/lib/types";
import "./editor.css";

export function EditorialScreen({
  articleMarkdown,
  review,
  metadata,
  userName,
  currentRound = 0,
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
        <div className="editorial-article-wrapper">
          <ArticleEditor
            markdown={articleMarkdown}
            userName={userName}
            category={metadata.category}
            redTriggers={review.red_triggers}
            activeAnnotation={activeAnnotation}
            onAnnotationClick={handleAnnotationClick}
            onAnnotationDismiss={handleAnnotationDismiss}
            highlightParagraph={highlightParagraph}
            onContentChange={handleContentChange}
          />
        </div>

        {/* Right: Coaching sidebar */}
        <aside className="editorial-coaching">
          <CoachingPanel
            review={review}
            onAppeal={onAppeal}
            onSuggestionClick={handleSuggestionClick}
          />
          <RefinementInput onRefine={onRefineGeneral} />
          <VersionInfo round={currentRound} />
        </aside>
      </div>
    </div>
  );
}
