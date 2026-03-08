import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { QualityScores } from "@/lib/types";

type PublishButtonProps = {
  gate: "GREEN" | "YELLOW" | "RED";
  onPublish: () => Promise<void>;
  scores?: QualityScores;
};

const SCORE_LABELS: Record<string, string> = {
  evidence: "Evidence",
  perspectives: "Perspectives",
  representation: "Representation",
  ethical_framing: "Ethical framing",
  cultural_context: "Cultural context",
  manipulation: "Manipulation",
};

function getFailedScores(scores: QualityScores): string[] {
  const failed: string[] = [];
  const threshold = 0.6;
  for (const [key, value] of Object.entries(scores)) {
    if ((value as number) < threshold) {
      failed.push(SCORE_LABELS[key] || key);
    }
  }
  return failed;
}

export function PublishButton({ onPublish, scores }: PublishButtonProps) {
  const { t } = useLanguage();
  const [publishing, setPublishing] = useState(false);

  const failedScores = scores ? getFailedScores(scores) : [];
  const blocked = failedScores.length > 0;

  async function handleClick() {
    if (blocked) return;
    setPublishing(true);
    try {
      await onPublish();
    } finally {
      setPublishing(false);
    }
  }

  const tooltip = blocked
    ? `Cannot publish: ${failedScores.join(", ")} below 60%`
    : undefined;

  return (
    <button
      className="btn btn-primary"
      onClick={handleClick}
      disabled={publishing || blocked}
      title={tooltip}
    >
      {publishing ? (
        <Loader2 size={16} className="spin" />
      ) : (
        <>
          <Send size={16} />
          {t("editor.publish")}
        </>
      )}
    </button>
  );
}
