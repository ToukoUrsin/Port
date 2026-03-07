import { useState, useRef, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { ArticleRenderer } from "./ArticleRenderer";
import { CoachingPanel } from "./CoachingPanel";
import { RefinementInput } from "./RefinementInput";
import { InstructionBar } from "./InstructionBar";
import { RephraseOptions } from "./RephraseOptions";
import { GateBadge } from "./GateBadge";
import { PublishButton } from "./PublishButton";
import { VersionInfo } from "./VersionInfo";
import { useTextSelection } from "./hooks/useTextSelection";
import { useParagraphTap } from "./hooks/useParagraphTap";
import type {
  EditorialScreenProps,
  RephraseRequest,
  RephraseResponse,
  TextSelection,
  ParagraphTap,
} from "./types";
import "./editor.css";

export function EditorialScreen({
  articleMarkdown,
  review,
  metadata,
  userName,
  currentRound = 0,
  onRefineTargeted,
  onRefineGeneral,
  onRephrase,
  onPublish,
  onAppeal,
  onBack,
}: EditorialScreenProps) {
  const articleRef = useRef<HTMLElement>(null);
  const textSelection = useTextSelection(articleRef);
  const paragraphTap = useParagraphTap(articleRef);

  const [highlightedParagraph, setHighlightedParagraph] = useState<number | undefined>();
  const [rephraseState, setRephraseState] = useState<{
    loading: boolean;
    request: RephraseRequest | null;
    response: RephraseResponse | null;
  }>({ loading: false, request: null, response: null });

  // Active selection: text selection takes priority over paragraph tap
  const activeSelection: TextSelection | ParagraphTap | null =
    textSelection || paragraphTap;

  // Coaching suggestion click: scroll to paragraph and highlight
  const handleSuggestionClick = useCallback(
    (paragraphRef: number) => {
      setHighlightedParagraph(paragraphRef);
      const container = articleRef.current;
      if (!container) return;

      const paragraphs = container.querySelectorAll("p, blockquote, h1, h2, h3");
      const target = paragraphs[paragraphRef];
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("paragraph-highlighted");
        setTimeout(() => target.classList.remove("paragraph-highlighted"), 3000);
      }
    },
    [],
  );

  // Instruction bar handlers
  function handleInstructionSubmit(r: {
    selected_text?: string;
    instruction: string;
    paragraph_index: number;
  }) {
    onRefineTargeted({
      selected_text: r.selected_text || "",
      instruction: r.instruction,
      paragraph_index: r.paragraph_index,
    });
  }

  async function handleRephrase(r: RephraseRequest) {
    setRephraseState({ loading: true, request: r, response: null });
    try {
      const response = await onRephrase(r);
      setRephraseState({ loading: false, request: r, response });
    } catch {
      setRephraseState({ loading: false, request: null, response: null });
    }
  }

  function handleRephraseSelect(text: string) {
    if (!rephraseState.request) return;
    onRefineTargeted({
      selected_text: rephraseState.request.selected_text,
      instruction: `Replace with: "${text}"`,
      paragraph_index: rephraseState.request.paragraph_index,
    });
    setRephraseState({ loading: false, request: null, response: null });
  }

  function handleRemove(paragraphIndex: number, selectedText: string) {
    onRefineTargeted({
      selected_text: selectedText,
      instruction: "Remove this text from the article.",
      paragraph_index: paragraphIndex,
    });
  }

  function dismissInstructionBar() {
    window.getSelection()?.removeAllRanges();
    setHighlightedParagraph(undefined);
  }

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
        {/* Left: Article (selectable, not editable) */}
        <div className="editorial-article-wrapper">
          <ArticleRenderer
            ref={articleRef}
            markdown={articleMarkdown}
            userName={userName}
            category={metadata.category}
            highlightedParagraph={highlightedParagraph}
          />

          {/* Floating instruction bar on selection */}
          {activeSelection && !rephraseState.request && (
            <InstructionBar
              selection={activeSelection}
              articleRef={articleRef}
              onSubmit={handleInstructionSubmit}
              onRephrase={handleRephrase}
              onRemove={handleRemove}
              onDismiss={dismissInstructionBar}
            />
          )}

          {/* Rephrase options overlay */}
          {rephraseState.request && (
            <RephraseOptions
              options={rephraseState.response?.options || []}
              loading={rephraseState.loading}
              onSelect={handleRephraseSelect}
              onCancel={() =>
                setRephraseState({ loading: false, request: null, response: null })
              }
            />
          )}
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
