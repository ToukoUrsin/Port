import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type PublishButtonProps = {
  gate: "GREEN" | "YELLOW" | "RED";
  onPublish: () => Promise<void>;
};

export function PublishButton({ gate, onPublish }: PublishButtonProps) {
  const { t } = useLanguage();
  const [publishing, setPublishing] = useState(false);

  async function handleClick() {
    setPublishing(true);
    try {
      await onPublish();
    } finally {
      setPublishing(false);
    }
  }

  return (
    <button
      className="btn btn-primary"
      onClick={handleClick}
      disabled={publishing}
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
