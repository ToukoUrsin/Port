import type { ReviewResult, QualityScores } from "@/lib/types";
import { computeOverallScore } from "@/lib/types";

const DIMENSION_LABELS: Record<keyof QualityScores, string> = {
  evidence: "Evidence & Sources",
  perspectives: "Perspectives",
  representation: "Representation",
  ethical_framing: "Ethical Framing",
  cultural_context: "Cultural Context",
  manipulation: "Manipulation Check",
};

function barColor(score: number): string {
  if (score >= 0.7) return "var(--color-success)";
  if (score >= 0.4) return "var(--color-warning)";
  return "var(--color-error)";
}

export function QualityPanel({ review }: { review: ReviewResult }) {
  const overall = computeOverallScore(review.scores);
  const dims = Object.entries(DIMENSION_LABELS) as [keyof QualityScores, string][];

  const verificationCounts = review.verification.reduce(
    (acc, v) => {
      if (v.status === "SUPPORTED") acc.supported++;
      else acc.flagged++;
      return acc;
    },
    { supported: 0, flagged: 0 },
  );

  return (
    <div className="quality-panel">
      <div className="quality-panel__header">
        <span className="quality-panel__score">{overall}</span>
        <span className="quality-panel__score-label">/ 100</span>
      </div>

      <div className="quality-panel__bars">
        {dims.map(([key, label]) => {
          const score = review.scores[key];
          return (
            <div key={key} className="quality-bar">
              <span className="quality-bar__label">{label}</span>
              <div className="quality-bar__track">
                <div
                  className="quality-bar__fill"
                  style={{ width: `${score * 100}%`, backgroundColor: barColor(score) }}
                />
              </div>
              <span className="quality-bar__value">{Math.round(score * 100)}</span>
            </div>
          );
        })}
      </div>

      {review.verification.length > 0 && (
        <div className="quality-panel__section">
          <p className="quality-panel__verification">
            {verificationCounts.supported} claim{verificationCounts.supported !== 1 ? "s" : ""} verified
            {verificationCounts.flagged > 0 && (
              <>, {verificationCounts.flagged} flagged for review</>
            )}
          </p>
        </div>
      )}

      {review.yellow_flags.length > 0 && (
        <div className="quality-panel__section">
          {review.yellow_flags.map((flag, i) => (
            <p key={i} className="flag flag-warning">{flag.suggestion}</p>
          ))}
        </div>
      )}

      {review.web_sources && review.web_sources.length > 0 && (
        <div className="quality-panel__section">
          <p className="quality-panel__section-label">Verified against</p>
          <ul className="quality-panel__sources">
            {review.web_sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.url}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {review.coaching.celebration && (
        <p className="quality-panel__celebration">{review.coaching.celebration}</p>
      )}
    </div>
  );
}
