import { useLanguage } from "@/contexts/LanguageContext";

export function GateBadge({ gate }: { gate: "GREEN" | "YELLOW" | "RED" }) {
  const { t } = useLanguage();
  const config = {
    GREEN: { className: "gate-green", label: t("editor.gateGreen") },
    YELLOW: { className: "gate-yellow", label: t("editor.gateYellow") },
    RED: { className: "gate-red", label: t("editor.gateRed") },
  };
  const { className, label } = config[gate];
  return (
    <span className={`gate-badge ${className}`}>
      <span className="gate-dot" />
      {label}
    </span>
  );
}
