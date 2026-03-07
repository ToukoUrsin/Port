import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import Modal from "./Modal";
import "./ConfirmDialog.css";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: "",
    message: "",
    resolve: null,
  });

  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({
        ...options,
        open: true,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback((value: boolean) => {
    setState((prev) => ({ ...prev, open: false }));
    resolveRef.current?.(value);
    resolveRef.current = null;
  }, []);

  const variant = state.variant || "primary";
  const confirmBtnClass = variant === "danger" ? "btn btn-danger" : "btn btn-primary";

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Modal open={state.open} onClose={() => handleClose(false)} size="sm">
        <Modal.Header>{state.title}</Modal.Header>
        <Modal.Body>
          <p className="confirm-message">{state.message}</p>
          <div className="confirm-actions">
            <button
              className="btn btn-secondary"
              onClick={() => handleClose(false)}
              type="button"
            >
              {state.cancelLabel || "Cancel"}
            </button>
            <button
              className={confirmBtnClass}
              onClick={() => handleClose(true)}
              type="button"
            >
              {state.confirmLabel || "Confirm"}
            </button>
          </div>
        </Modal.Body>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
