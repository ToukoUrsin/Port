import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import "./Modal.css";

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  children: ReactNode;
}

const ModalCloseContext = createContext<(() => void) | null>(null);

function Modal({ open, onClose, size = "md", children }: ModalProps) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 250);
      document.body.style.overflow = "";
      return () => clearTimeout(timer);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

  if (!mounted) return null;

  return createPortal(
    <ModalCloseContext.Provider value={handleClose}>
      <div
        className={`modal-overlay ${visible ? "modal-overlay--visible" : ""}`}
        onClick={handleClose}
      >
        <div
          className={`modal-panel modal-panel--${size} ${visible ? "modal-panel--visible" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </ModalCloseContext.Provider>,
    document.body
  );
}

function Header({ children }: { children: ReactNode }) {
  const onClose = useContext(ModalCloseContext);
  return (
    <div className="modal-header">
      <span>{children}</span>
      {onClose && (
        <button className="modal-close" onClick={onClose} type="button">
          <X size={18} />
        </button>
      )}
    </div>
  );
}

function Body({ children }: { children: ReactNode }) {
  return <div className="modal-body">{children}</div>;
}

function Footer({ children }: { children: ReactNode }) {
  return <div className="modal-footer">{children}</div>;
}

Modal.Header = Header;
Modal.Body = Body;
Modal.Footer = Footer;

export default Modal;
