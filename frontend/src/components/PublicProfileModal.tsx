import { useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "./Modal";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/Toast";
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
  const [loading, setLoading] = useState(false);

  async function handleMakePublic() {
    if (!user) return;
    setLoading(true);
    try {
      await updateProfile(user.id, { public: true });
      updateUser({ public: true });
      toast("Profile is now public", "success");
      onMadePublic();
    } catch {
      toast("Failed to update profile", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <Modal.Header>Public profile required</Modal.Header>
      <Modal.Body>
        <p className="confirm-message">
          Your profile must be public before you can submit content. Published
          articles are linked to your profile so readers can see who contributed.
        </p>
        <div className="confirm-actions">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            type="button"
            disabled={loading}
          >
            Keep Private
          </button>
          <button
            className="btn btn-primary"
            onClick={handleMakePublic}
            type="button"
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="spin" /> : "Make Public"}
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
}
