import { useState } from "react";
import { Send, Mic, Square, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TargetedRefinement, RephraseRequest, TextSelection, ParagraphTap } from "./types";

type InstructionBarProps = {
  selection: TextSelection | ParagraphTap | null;
  articleRef: React.RefObject<HTMLElement | null>;
  onSubmit: (r: Omit<TargetedRefinement, "selected_text"> & { selected_text?: string }) => void;
  onRephrase: (r: RephraseRequest) => void;
  onRemove: (paragraphIndex: number, selectedText: string) => void;
  onDismiss: () => void;
};

function isTextSelection(s: TextSelection | ParagraphTap): s is TextSelection {
  return "text" in s;
}

export function InstructionBar({
  selection,
  articleRef,
  onSubmit,
  onRephrase,
  onRemove,
  onDismiss,
}: InstructionBarProps) {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  if (!selection) return null;

  const selectedText = isTextSelection(selection) ? selection.text : "";
  const paragraphIndex = isTextSelection(selection)
    ? selection.paragraphIndex
    : selection.index;

  // Position the bar
  const style = getBarStyle(selection, articleRef);
  const isMobile = "element" in selection && !("text" in selection);

  function handleSubmit() {
    if (!text.trim()) return;
    onSubmit({
      selected_text: selectedText,
      instruction: text.trim(),
      paragraph_index: paragraphIndex,
    });
    setText("");
    onDismiss();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onDismiss();
    }
  }

  async function toggleRecording() {
    if (recording && mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      // For now, we'd need STT — send as voice instruction
      // This will be wired to ElevenLabs transcription on the backend
      stream.getTracks().forEach((t) => t.stop());
      setMediaRecorder(null);
    };
    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
  }

  function handleChip(action: string) {
    switch (action) {
      case "not-accurate":
        setText("Not accurate — ");
        break;
      case "add-detail":
        setText("Add detail — ");
        break;
      case "rephrase":
        onRephrase({ selected_text: selectedText, paragraph_index: paragraphIndex });
        onDismiss();
        break;
      case "remove":
        onRemove(paragraphIndex, selectedText);
        onDismiss();
        break;
    }
  }

  return (
    <div className="instruction-bar" style={style} onClick={(e) => e.stopPropagation()}>
      <div className="instruction-bar-input">
        <button
          type="button"
          className={`instruction-bar-mic ${recording ? "instruction-bar-mic--active" : ""}`}
          onClick={toggleRecording}
        >
          {recording ? <Square size={14} /> : <Mic size={16} />}
        </button>
        <input
          type="text"
          className="instruction-bar-text"
          placeholder={t("editor.whatShouldChange")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button
          type="button"
          className="instruction-bar-send"
          onClick={handleSubmit}
          disabled={!text.trim()}
        >
          <Send size={14} />
        </button>
      </div>
      <div className="instruction-bar-chips">
        <button
          type="button"
          className="instruction-chip"
          onClick={() => handleChip("not-accurate")}
        >
          {t("editor.notAccurate")}
        </button>
        {!isMobile && (
          <button
            type="button"
            className="instruction-chip"
            onClick={() => handleChip("add-detail")}
          >
            {t("editor.addDetail")}
          </button>
        )}
        <button
          type="button"
          className="instruction-chip"
          onClick={() => handleChip("rephrase")}
        >
          {t("editor.rephrase")}
        </button>
        {!isMobile && (
          <button
            type="button"
            className="instruction-chip"
            onClick={() => handleChip("remove")}
          >
            {t("editor.remove")}
          </button>
        )}
      </div>
      <button
        type="button"
        className="instruction-bar-close"
        onClick={onDismiss}
      >
        <X size={14} />
      </button>
    </div>
  );
}

function getBarStyle(
  selection: TextSelection | ParagraphTap,
  articleRef: React.RefObject<HTMLElement | null>,
): React.CSSProperties {
  const container = articleRef.current;
  if (!container) return {};

  const containerRect = container.getBoundingClientRect();
  const selRect = selection.rect;

  if (isTextSelection(selection)) {
    // Desktop: position above selection
    return {
      position: "absolute",
      top: selRect.top - containerRect.top - 8,
      left: Math.max(0, selRect.left - containerRect.left),
      transform: "translateY(-100%)",
    };
  }

  // Mobile: position below the tapped paragraph
  return {
    position: "relative",
    maxWidth: "100%",
    marginTop: "var(--space-2)",
  };
}
