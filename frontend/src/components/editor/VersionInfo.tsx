import { useLanguage } from "@/contexts/LanguageContext";

export function VersionInfo({ round }: { round: number }) {
  const { t } = useLanguage();
  if (round < 1) return null;
  return (
    <div className="version-info">
      <span className="version-round">{t("editor.round")} {round + 1}</span>
    </div>
  );
}
