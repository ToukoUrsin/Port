import { useState } from "react";
import { CheckCircle, AlertTriangle, XCircle, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import type { ReviewResult, VerificationEntry } from "@/lib/types";
import { useLanguage } from "@/contexts/LanguageContext";
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

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; className: string; label: string }> = {
  SUPPORTED: { icon: CheckCircle, className: "verification--supported", label: "Supported" },
  NOT_IN_SOURCE: { icon: AlertTriangle, className: "verification--warning", label: "Not in source" },
  POSSIBLE_HALLUCINATION: { icon: XCircle, className: "verification--error", label: "Possible hallucination" },
  FABRICATED_QUOTE: { icon: XCircle, className: "verification--error", label: "Fabricated quote" },
};

function VerificationItem({ entry }: { entry: VerificationEntry }) {
  const config = STATUS_CONFIG[entry.status] || { icon: HelpCircle, className: "verification--warning", label: entry.status };
  const Icon = config.icon;
  return (
    <div className={`verification-entry ${config.className}`}>
      <div className="verification-entry__header">
        <Icon size={14} />
        <span className="verification-entry__status">{config.label}</span>
      </div>
      <p className="verification-entry__claim">{entry.claim}</p>
      {entry.evidence && <p className="verification-entry__evidence">{entry.evidence}</p>}
    </div>
  );
}

export function CoachingPanel({
  review,
  onAppeal,
  onSuggestionClick,
}: CoachingPanelProps) {
  const { t } = useLanguage();
  const [showVerificationDetail, setShowVerificationDetail] = useState(false);
  const suggestions = parseSuggestions(review.coaching.suggestions as string[] | CoachingSuggestion[]);

  // Count verification stats
  const verified = review.verification?.filter((v) => v.status === "SUPPORTED").length ?? 0;
  const problematic = review.verification?.filter((v) => v.status !== "SUPPORTED") ?? [];
  const total = review.verification?.length ?? 0;

  return (
    <div className="coaching-panel">
      {/* 1. Coaching questions — THE primary content */}
      {suggestions.length > 0 && (
        <div className="coaching-questions">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className={`coaching-question ${s.paragraph_ref !== undefined ? "coaching-question--clickable" : ""}`}
              onClick={() => {
                if (s.paragraph_ref !== undefined && onSuggestionClick) {
                  onSuggestionClick(s.paragraph_ref);
                }
              }}
            >
              {s.text}
            </div>
          ))}
        </div>
      )}

      {/* 2. Source check summary — collapsed by default */}
      {total > 0 && (
        <div className="verification-summary">
          <div className="verification-summary__counts">
            {verified > 0 && <span className="verification-summary__verified">{verified} verified</span>}
            {verified > 0 && problematic.length > 0 && <span className="verification-summary__sep"> · </span>}
            {problematic.length > 0 && <span className="verification-summary__flagged">{problematic.length} need your input</span>}
          </div>
          {problematic.length > 0 && (
            <button
              className="verification-summary__toggle"
              onClick={() => setShowVerificationDetail(!showVerificationDetail)}
            >
              {showVerificationDetail ? "Hide" : "Show"} details
              {showVerificationDetail ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {showVerificationDetail && (
            <div className="verification-detail">
              {problematic.map((entry, i) => (
                <VerificationItem key={i} entry={entry} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Web sources */}
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

      {/* 4. Yellow flags — gentle notes */}
      {review.yellow_flags.length > 0 && (
        <div className="yellow-flags">
          <h4 className="coaching-section-title">Notes</h4>
          {review.yellow_flags.map((flag, i) => (
            <p key={i} className="yellow-flag">
              <span className="yellow-flag__dimension">{flag.dimension}</span>
              {flag.suggestion}
            </p>
          ))}
        </div>
      )}

      {/* 5. Red triggers — warm framing */}
      {review.red_triggers.length > 0 && (
        <div className="red-gate-coaching">
          <h4 className="coaching-section-title">To make this bulletproof</h4>
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
        </div>
      )}

      {/* 6. Appeal */}
      {review.gate === "RED" && (
        <button className="appeal-link" onClick={onAppeal}>
          {t("editor.appealLink")}
        </button>
      )}
    </div>
  );
}
