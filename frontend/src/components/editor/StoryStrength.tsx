import type { QualityScores } from "@/lib/types";

export function StoryStrength({ scores }: { scores: QualityScores }) {
  const dims = Object.values(scores);
  const avg = dims.length > 0 ? Math.round((dims.reduce((a, b) => a + b, 0) / dims.length) * 100) : 0;

  return (
    <div className="story-strength">
      <div className="story-strength__bar">
        <div
          className="story-strength__fill"
          style={{ width: `${avg}%` }}
        />
      </div>
      <span className="story-strength__label">
        {avg}% story strength
      </span>
    </div>
  );
}
