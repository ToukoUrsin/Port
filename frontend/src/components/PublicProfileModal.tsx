import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "./Modal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { updateProfile } from "@/lib/api";

interface PublicProfileModalProps {
  open: boolean;
  onClose: () => void;
  onMadePublic: () => void;
}

export default function PublicProfileModal({
  open,
  onClose,
  onMadePublic,
}: PublicProfileModalProps) {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  async function handleMakePublic() {
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile(user.id, { public: true });
      updateUser({ public: true });
      toast(t("modal.profileNowPublic"), "success");
      onMadePublic();
    } catch {
      toast(t("modal.profileUpdateFailed"), "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <Modal.Header>{t("modal.publicProfileRequired")}</Modal.Header>
      <Modal.Body>
        <p className="confirm-message">
          {t("modal.publicProfileDesc")}
        </p>
        <div className="confirm-actions">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            type="button"
            disabled={loading}
          >
            {t("modal.keepPrivate")}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleMakePublic}
            type="button"
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="spin" /> : t("modal.makePublic")}
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
