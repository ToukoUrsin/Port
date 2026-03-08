import { ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { QualityScores } from "@/lib/types";

interface QualityGateBannerProps {
  gate: "GREEN" | "YELLOW" | "RED";
  scores: QualityScores;
  redTriggerCount: number;
  yellowFlagCount: number;
}

const SCORE_LABELS: Record<keyof QualityScores, string> = {
  evidence: "Evidence",
  perspectives: "Perspectives",
  representation: "Representation",
  ethical_framing: "Ethical Framing",
  cultural_context: "Cultural Context",
  manipulation: "Manipulation",
};

export function QualityGateBanner({ gate, scores, redTriggerCount, yellowFlagCount }: QualityGateBannerProps) {
  const failingScores = (Object.entries(scores) as [keyof QualityScores, number][])
    .filter(([, value]) => value < 0.6);

  if (gate === "GREEN") {
    return (
      <div className="quality-gate-banner quality-gate-banner--green">
        <CheckCircle2 size={18} />
        <span>Ready to publish. All checks passed.</span>
      </div>
    );
  }

  if (gate === "RED") {
    return (
      <div className="quality-gate-banner quality-gate-banner--red">
        <div className="quality-gate-banner__main">
          <ShieldAlert size={18} />
          <span>
            This article has {redTriggerCount} issue{redTriggerCount !== 1 ? "s" : ""} that need
            resolving before publishing
          </span>
        </div>
        {failingScores.length > 0 && (
          <div className="quality-gate-banner__scores">
            {failingScores.map(([key, value]) => (
              <span key={key} className="quality-gate-banner__score">
                {SCORE_LABELS[key]}: {Math.round(value * 100)}%
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // YELLOW
  return (
    <div className="quality-gate-banner quality-gate-banner--yellow">
      <div className="quality-gate-banner__main">
        <AlertTriangle size={18} />
        <span>
          Publishable, but {yellowFlagCount} note{yellowFlagCount !== 1 ? "s" : ""} for improvement
        </span>
      </div>
      {failingScores.length > 0 && (
        <div className="quality-gate-banner__scores">
          {failingScores.map(([key, value]) => (
            <span key={key} className="quality-gate-banner__score">
              {SCORE_LABELS[key]}: {Math.round(value * 100)}%
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
