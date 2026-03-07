import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { VoiceRecorder } from "./VoiceRecorder";
import { useLanguage } from "@/contexts/LanguageContext";
import type { GeneralRefinement } from "./types";

type RefinementInputProps = {
  onRefine: (r: GeneralRefinement) => void;
  disabled?: boolean;
};

export function RefinementInput({ onRefine, disabled }: RefinementInputProps) {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);

  function handleSubmit() {
    if (voiceBlob) {
      onRefine({ voice_clip: voiceBlob });
      setVoiceBlob(null);
    } else if (text.trim()) {
      onRefine({ text_note: text.trim() });
      setText("");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && canSubmit) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const canSubmit = (text.trim().length > 0 || voiceBlob !== null) && !disabled;

  return (
    <div className="refinement-input">
      <textarea
        className="refinement-textarea"
        placeholder={t("editor.typeResponse")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={disabled}
      />
      <div className="refinement-input-row">
        <VoiceRecorder onRecording={setVoiceBlob} compact />
        <button
          className="refinement-send"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          <ArrowUp size={18} />
        </button>
      </div>
    </div>
  );
}
