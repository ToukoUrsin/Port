import { useState, useEffect, type RefObject } from "react";
import type { TextSelection } from "../types";

export function useTextSelection(
  articleRef: RefObject<HTMLElement | null>,
): TextSelection | null {
  const [selection, setSelection] = useState<TextSelection | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setSelection(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const container = articleRef.current;
      if (!container?.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }

      const paragraphs = container.querySelectorAll(
        "p, blockquote, h1, h2, h3",
      );
      let paragraphIndex = -1;
      paragraphs.forEach((p, i) => {
        if (p.contains(range.startContainer)) paragraphIndex = i;
      });

      setSelection({
        text: sel.toString(),
        rect: range.getBoundingClientRect(),
        paragraphIndex,
      });
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [articleRef]);

  return selection;
}
