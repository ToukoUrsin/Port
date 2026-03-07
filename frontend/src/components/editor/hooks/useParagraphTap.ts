import { useState, useEffect, type RefObject } from "react";
import type { ParagraphTap } from "../types";

export function useParagraphTap(
  articleRef: RefObject<HTMLElement | null>,
): ParagraphTap | null {
  const [tapped, setTapped] = useState<ParagraphTap | null>(null);

  useEffect(() => {
    const container = articleRef.current;
    if (!container) return;

    function handleClick(e: Event) {
      const target = e.target as HTMLElement;
      const el = articleRef.current;
      if (!el) return;

      const paragraph = target.closest("p, blockquote, h1, h2, h3");
      if (!paragraph || !el.contains(paragraph)) {
        setTapped(null);
        return;
      }

      const paragraphs = el.querySelectorAll("p, blockquote, h1, h2, h3");
      let index = -1;
      paragraphs.forEach((p, i) => {
        if (p === paragraph) index = i;
      });

      setTapped({
        index,
        element: paragraph as HTMLElement,
        rect: paragraph.getBoundingClientRect(),
      });
    }

    // Only activate on touch devices
    if ("ontouchstart" in window) {
      container.addEventListener("click", handleClick);
      return () => container.removeEventListener("click", handleClick);
    }
  }, [articleRef]);

  return tapped;
}
