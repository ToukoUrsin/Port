import { useRef, useCallback, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import type { RedTrigger } from "@/lib/types";
import type { ActiveAnnotation } from "./types";
import { X } from "lucide-react";

type ArticlePreviewProps = {
  markdown: string;
  userName: string;
  category?: string;
  redTriggers: RedTrigger[];
  activeAnnotation: ActiveAnnotation;
  onAnnotationClick: (trigger: RedTrigger, rect: DOMRect) => void;
  onAnnotationDismiss: () => void;
  highlightParagraph?: number;
};

/** Split text around a target sentence, returning segments with annotation info. */
function splitAtSentences(
  text: string,
  triggers: RedTrigger[],
): { text: string; trigger?: RedTrigger }[] {
  if (triggers.length === 0) return [{ text }];

  const segments: { text: string; trigger?: RedTrigger }[] = [];
  let remaining = text;

  // Sort triggers by their position in text so we split left-to-right
  const sorted = [...triggers].sort((a, b) => {
    const posA = remaining.indexOf(a.sentence);
    const posB = remaining.indexOf(b.sentence);
    return posA - posB;
  });

  for (const trigger of sorted) {
    const idx = remaining.indexOf(trigger.sentence);
    if (idx === -1) continue; // sentence not found — skip gracefully

    if (idx > 0) {
      segments.push({ text: remaining.slice(0, idx) });
    }
    segments.push({ text: trigger.sentence, trigger });
    remaining = remaining.slice(idx + trigger.sentence.length);
  }

  if (remaining.length > 0) {
    segments.push({ text: remaining });
  }

  return segments;
}

/** Flatten ReactMarkdown children to plain text for sentence matching. */
function flattenChildren(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(flattenChildren).join("");
  if (children && typeof children === "object" && "props" in children) {
    return flattenChildren((children as { props: { children?: ReactNode } }).props.children);
  }
  return "";
}

function SuggestionCard({
  trigger,
  rect,
  wrapperRect,
  onDismiss,
}: {
  trigger: RedTrigger;
  rect: DOMRect;
  wrapperRect: DOMRect;
  onDismiss: () => void;
}) {
  const top = rect.bottom - wrapperRect.top + 4;
  const left = Math.max(0, rect.left - wrapperRect.left);

  return (
    <div className="suggestion-card" style={{ top, left }}>
      <button className="suggestion-card__close" onClick={onDismiss}>
        <X size={14} />
      </button>
      <div className="suggestion-card__dimension">
        {trigger.dimension}
      </div>
      <blockquote className="suggestion-card__sentence">
        {trigger.sentence}
      </blockquote>
      {trigger.fix_options.length > 0 && (
        <ol className="suggestion-card__fixes">
          {trigger.fix_options.map((fix, i) => (
            <li key={i}>{fix}</li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function ArticlePreview({
  markdown,
  userName,
  category,
  redTriggers,
  activeAnnotation,
  onAnnotationClick,
  onAnnotationDismiss,
  highlightParagraph,
}: ArticlePreviewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const paragraphCounter = useRef(0);

  // Reset counter before each render cycle
  paragraphCounter.current = 0;

  // Extract headline from first markdown heading
  const lines = markdown.split("\n");
  const headlineIdx = lines.findIndex((l) => l.startsWith("# "));
  const headline = headlineIdx !== -1 ? lines[headlineIdx].replace(/^#\s+/, "") : "";
  const bodyMarkdown =
    headlineIdx !== -1
      ? [...lines.slice(0, headlineIdx), ...lines.slice(headlineIdx + 1)].join("\n")
      : markdown;

  const handleAnnotationClick = useCallback(
    (trigger: RedTrigger, e: React.MouseEvent<HTMLSpanElement>) => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      onAnnotationClick(trigger, rect);
    },
    [onAnnotationClick],
  );

  const AnnotatedParagraph = useCallback(
    ({ children }: { children?: ReactNode }) => {
      paragraphCounter.current += 1;
      const pNum = paragraphCounter.current;

      const isHighlighted = highlightParagraph === pNum;
      const triggersForP = redTriggers.filter((t) => t.paragraph === pNum);
      const plainText = flattenChildren(children);

      if (triggersForP.length === 0) {
        return (
          <p
            className={isHighlighted ? "paragraph--highlight" : undefined}
            data-paragraph={pNum}
          >
            {children}
          </p>
        );
      }

      const segments = splitAtSentences(plainText, triggersForP);

      return (
        <p
          className={isHighlighted ? "paragraph--highlight" : undefined}
          data-paragraph={pNum}
        >
          {segments.map((seg, i) =>
            seg.trigger ? (
              <span
                key={i}
                className="annotation annotation--red"
                onClick={(e) => handleAnnotationClick(seg.trigger!, e)}
              >
                {seg.text}
              </span>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
      );
    },
    [redTriggers, highlightParagraph, handleAnnotationClick],
  );

  const wrapperRect = wrapperRef.current?.getBoundingClientRect();

  return (
    <div className="article-preview" ref={wrapperRef}>
      {headline && <h1 className="article-headline">{headline}</h1>}
      <div className="article-byline">
        By {userName} &middot; {new Date().toLocaleDateString()}
        {category && (
          <span className={`badge badge-${category}`}>{category}</span>
        )}
      </div>
      <div className="article-prose">
        <ReactMarkdown components={{ p: AnnotatedParagraph }}>
          {bodyMarkdown}
        </ReactMarkdown>
      </div>
      {activeAnnotation && wrapperRect && (
        <SuggestionCard
          trigger={activeAnnotation.trigger}
          rect={activeAnnotation.rect}
          wrapperRect={wrapperRect}
          onDismiss={onAnnotationDismiss}
        />
      )}
    </div>
  );
}
