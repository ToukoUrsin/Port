import type { ReviewResult } from "@/lib/types";
import type { CoachingSuggestion } from "./types";

type CoachingPanelProps = {
  review: ReviewResult;
  onAppeal: () => void;
  onSuggestionClick?: (paragraphRef: number) => void;
};

function parseSuggestions(raw: string[] | CoachingSuggestion[]): CoachingSuggestion[] {
  if (raw.length === 0) return [];
  if (typeof raw[0] === "string") {
    return (raw as string[]).map((text) => ({ text }));
  }
  return raw as CoachingSuggestion[];
}

export function CoachingPanel({
  review,
  onAppeal,
  onSuggestionClick,
}: CoachingPanelProps) {
  const suggestions = parseSuggestions(review.coaching.suggestions as string[] | CoachingSuggestion[]);

  return (
    <div className="coaching-panel">
      <p className="coaching-celebration">{review.coaching.celebration}</p>

      {review.web_sources && review.web_sources.length > 0 && (
        <div className="web-sources">
          <p className="web-sources__label">Verified against:</p>
          <ul className="web-sources__list">
            {review.web_sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <ol className="coaching-suggestions">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className={s.paragraph_ref !== undefined ? "coaching-suggestion--clickable" : ""}
              onClick={() => {
                if (s.paragraph_ref !== undefined && onSuggestionClick) {
                  onSuggestionClick(s.paragraph_ref);
                }
              }}
            >
              {s.text}
            </li>
          ))}
        </ol>
      )}

      {review.gate === "YELLOW" && review.yellow_flags.length > 0 && (
        <div className="yellow-flags">
          {review.yellow_flags.map((flag, i) => (
            <p key={i} className="yellow-flag">
              {flag.suggestion}
            </p>
          ))}
        </div>
      )}

      {review.gate === "RED" && (
        <div className="red-gate-coaching">
          {review.red_triggers.map((trigger, i) => (
            <div key={i} className="red-trigger">
              <p className="trigger-context">&ldquo;{trigger.sentence}&rdquo;</p>
              <ul className="fix-options">
                {trigger.fix_options.map((opt, j) => (
                  <li key={j}>{opt}</li>
                ))}
              </ul>
            </div>
          ))}
          <button className="appeal-link" onClick={onAppeal}>
            I think this review is wrong
          </button>
        </div>
      )}
    </div>
  );
}
