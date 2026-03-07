import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import "./DropdownMenu.css";

interface DropdownContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
  triggerRef: React.RefObject<HTMLDivElement | null>;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown() {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error("DropdownMenu subcomponents must be used within DropdownMenu");
  return ctx;
}

function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, close]);

  return (
    <DropdownContext.Provider value={{ open, toggle, close, triggerRef }}>
      {children}
    </DropdownContext.Provider>
  );
}

function Trigger({ children }: { children: ReactNode }) {
  const { toggle, triggerRef } = useDropdown();
  return (
    <div ref={triggerRef} onClick={toggle} style={{ display: "inline-flex" }}>
      {children}
    </div>
  );
}

function Content({
  children,
  align = "start",
}: {
  children: ReactNode;
  align?: "start" | "end";
}) {
  const { open, close, triggerRef } = useDropdown();
  const menuRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }

    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const pos: CSSProperties = {
      top: rect.bottom + 4,
    };
    if (align === "end") {
      pos.right = window.innerWidth - rect.right;
    } else {
      pos.left = rect.left;
    }
    setStyle(pos);
    requestAnimationFrame(() => setVisible(true));
  }, [open, align, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, close, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`dropdown-menu ${visible ? "dropdown-menu--visible" : ""}`}
      style={style}
    >
      {children}
    </div>,
    document.body
  );
}

function Item({
  children,
  onClick,
  variant,
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "danger";
  disabled?: boolean;
}) {
  const { close } = useDropdown();
  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    close();
  };

  const className = [
    "dropdown-menu__item",
    variant === "danger" && "dropdown-menu__item--danger",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={className} onClick={handleClick} disabled={disabled} type="button">
      {children}
    </button>
  );
}

function Separator() {
  return <div className="dropdown-menu__separator" />;
}

DropdownMenu.Trigger = Trigger;
DropdownMenu.Content = Content;
DropdownMenu.Item = Item;
DropdownMenu.Separator = Separator;

export default DropdownMenu;
