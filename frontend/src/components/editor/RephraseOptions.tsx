import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type RephraseOptionsProps = {
  options: string[];
  loading?: boolean;
  onSelect: (text: string) => void;
  onCancel: () => void;
};

export function RephraseOptions({
  options,
  loading,
  onSelect,
  onCancel,
}: RephraseOptionsProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="rephrase-options rephrase-options--loading">
        <Loader2 size={16} className="spin" />
        <span>{t("editor.generating")}</span>
      </div>
    );
  }

  return (
    <div className="rephrase-options">
      <p className="rephrase-label">{t("editor.pickVersion")}:</p>
      <div className="rephrase-list">
        {options.map((opt, i) => (
          <label key={i} className="rephrase-option">
            <input
              type="radio"
              name="rephrase"
              checked={selected === i}
              onChange={() => setSelected(i)}
            />
            <span className="rephrase-text">&ldquo;{opt}&rdquo;</span>
          </label>
        ))}
      </div>
      <div className="rephrase-actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={onCancel}
        >
          {t("editor.keepOriginal")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={selected === null}
          onClick={() => selected !== null && onSelect(options[selected])}
        >
          {t("editor.apply")}
        </button>
      </div>
    </div>
  );
}
