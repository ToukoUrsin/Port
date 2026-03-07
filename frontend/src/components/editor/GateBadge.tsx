const GATE_CONFIG = {
  GREEN: { className: "gate-green", label: "Ready to publish" },
  YELLOW: { className: "gate-yellow", label: "Suggestions available" },
  RED: { className: "gate-red", label: "Needs changes" },
};

export function GateBadge({ gate }: { gate: "GREEN" | "YELLOW" | "RED" }) {
  const { className, label } = GATE_CONFIG[gate];
  return (
    <span className={`gate-badge ${className}`}>
      <span className="gate-dot" />
      {label}
    </span>
  );
}
