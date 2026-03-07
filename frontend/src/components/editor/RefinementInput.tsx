import { useState } from "react";
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

  const canSubmit = text.trim().length > 0 || voiceBlob !== null;

  return (
    <div className="refinement-input">
      <div className="refinement-input-row">
        <VoiceRecorder onRecording={setVoiceBlob} compact />
        <textarea
          className="refinement-textarea"
          placeholder={t("editor.typeResponse")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
        />
      </div>
      <button
        className="btn btn-primary refinement-submit"
        onClick={handleSubmit}
        disabled={!canSubmit || disabled}
      >
        {t("editor.updateArticle")}
      </button>
    </div>
  );
}
