import { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { ArticlePreview } from "./ArticleRenderer";
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
}: EditorialScreenProps) {
  const [activeAnnotation, setActiveAnnotation] = useState<ActiveAnnotation>(null);
  const [highlightParagraph, setHighlightParagraph] = useState<number | undefined>();
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>();

  // Click-outside to dismiss suggestion card
  useEffect(() => {
    if (!activeAnnotation) return;
    function handleClick(e: MouseEvent) {
      const card = document.querySelector(".suggestion-card");
      if (card && !card.contains(e.target as Node)) {
        setActiveAnnotation(null);
      }
    }
    // Delay listener to avoid catching the click that opened the card
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
    // Scroll paragraph into view
    const el = document.querySelector(`[data-paragraph="${paragraphRef}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Auto-clear highlight after 3s
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightParagraph(undefined), 3000);
  }, []);

  useEffect(() => {
    return () => clearTimeout(highlightTimer.current);
  }, []);

  return (
    <div className="editorial" style={{ animation: "fadeIn 0.4s ease" }}>
      {/* Top bar */}
      <div className="editorial-header">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <div className="editorial-header-right">
          <GateBadge gate={review.gate} />
          <PublishButton gate={review.gate} onPublish={onPublish} />
        </div>
      </div>

      {/* Two-column body */}
      <div className="editorial-body">
        {/* Left: Read-only article with annotations */}
        <div className="editorial-article-wrapper">
          <ArticlePreview
            markdown={articleMarkdown}
            userName={userName}
            category={metadata.category}
            redTriggers={review.red_triggers}
            activeAnnotation={activeAnnotation}
            onAnnotationClick={handleAnnotationClick}
            onAnnotationDismiss={handleAnnotationDismiss}
            highlightParagraph={highlightParagraph}
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
