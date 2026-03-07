import { useState } from "react";
import { Send, Loader2 } from "lucide-react";

type PublishButtonProps = {
  gate: "GREEN" | "YELLOW" | "RED";
  onPublish: () => Promise<void>;
};

export function PublishButton({ gate, onPublish }: PublishButtonProps) {
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
      disabled={gate === "RED" || publishing}
    >
      {publishing ? (
        <Loader2 size={16} className="spin" />
      ) : (
        <>
          <Send size={16} />
          Publish
        </>
      )}
    </button>
  );
}
