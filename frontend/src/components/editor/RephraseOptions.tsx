import { useState } from "react";
import { Loader2 } from "lucide-react";

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
  const [selected, setSelected] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="rephrase-options rephrase-options--loading">
        <Loader2 size={16} className="spin" />
        <span>Generating alternatives...</span>
      </div>
    );
  }

  return (
    <div className="rephrase-options">
      <p className="rephrase-label">Pick a version:</p>
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
          Keep original
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={selected === null}
          onClick={() => selected !== null && onSelect(options[selected])}
        >
          Apply
        </button>
      </div>
    </div>
  );
}
