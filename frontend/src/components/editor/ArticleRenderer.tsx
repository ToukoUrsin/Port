import { useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { AnnotationHighlight } from "./extensions/AnnotationHighlight";
import type { RedTrigger } from "@/lib/types";
import type { ActiveAnnotation } from "./types";
import {
  X, Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered,
} from "lucide-react";

type ArticleEditorProps = {
  markdown: string;
  userName: string;
  category?: string;
  redTriggers: RedTrigger[];
  activeAnnotation: ActiveAnnotation;
  onAnnotationClick: (trigger: RedTrigger, rect: DOMRect) => void;
  onAnnotationDismiss: () => void;
  highlightParagraph?: number;
  onContentChange: (markdown: string) => void;
};

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

/** Extract headline from first `# ` line in markdown */
function splitHeadline(markdown: string): { headline: string; body: string } {
  const lines = markdown.split("\n");
  const headlineIdx = lines.findIndex((l) => l.startsWith("# "));
  if (headlineIdx === -1) return { headline: "", body: markdown };
  const headline = lines[headlineIdx].replace(/^#\s+/, "");
  const body = [...lines.slice(0, headlineIdx), ...lines.slice(headlineIdx + 1)].join("\n");
  return { headline, body };
}

/** Reassemble headline + body into markdown */
function joinHeadlineBody(headline: string, bodyMarkdown: string): string {
  if (!headline.trim()) return bodyMarkdown;
  return `# ${headline}\n\n${bodyMarkdown}`;
}

export function ArticleEditor({
  markdown,
  userName,
  category,
  redTriggers,
  activeAnnotation,
  onAnnotationClick,
  onAnnotationDismiss,
  highlightParagraph,
  onContentChange,
}: ArticleEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { headline: initHeadline, body: initBody } = splitHeadline(markdown);
  const headlineRef = useRef(initHeadline);
  const isExternalUpdate = useRef(false);
  // Track the last markdown we sent up to avoid re-setting content from our own edits
  const lastEmittedMarkdown = useRef(markdown);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        resize: {
          enabled: true,
          alwaysPreserveAspectRatio: true,
          minWidth: 100,
          minHeight: 60,
        },
      }),
      Placeholder.configure({ placeholder: "Start writing..." }),
      Markdown,
      AnnotationHighlight,
    ],
    content: initBody,
    onUpdate({ editor: ed }) {
      if (isExternalUpdate.current) return;
      const bodyMd = (ed.storage as any).markdown.getMarkdown();
      const full = joinHeadlineBody(headlineRef.current, bodyMd);
      lastEmittedMarkdown.current = full;
      onContentChange(full);
    },
  });

  // Update annotations when redTriggers change
  useEffect(() => {
    if (!editor) return;
    (editor.storage as any).annotationHighlight.triggers = redTriggers;
    const { tr } = editor.state;
    tr.setMeta("annotationHighlight", { triggers: redTriggers });
    editor.view.dispatch(tr);
  }, [editor, redTriggers]);

  // Handle external markdown updates (e.g. AI refinement) — skip if the change came from us
  useEffect(() => {
    if (!editor) return;
    if (markdown === lastEmittedMarkdown.current) return;
    const { headline, body: newBody } = splitHeadline(markdown);
    isExternalUpdate.current = true;
    editor.commands.setContent(newBody);
    headlineRef.current = headline;
    lastEmittedMarkdown.current = markdown;
    isExternalUpdate.current = false;
  }, [editor, markdown]);

  // Click handler for annotation decorations
  const handleEditorClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains("annotation--red")) return;

      const dimension = target.getAttribute("data-trigger-dimension");
      const paragraph = target.getAttribute("data-trigger-paragraph");
      if (!dimension || !paragraph) return;

      const trigger = redTriggers.find(
        (t) => t.dimension === dimension && t.paragraph === Number(paragraph),
      );
      if (trigger) {
        onAnnotationClick(trigger, target.getBoundingClientRect());
      }
    },
    [redTriggers, onAnnotationClick],
  );

  // Highlight paragraph scroll
  useEffect(() => {
    if (highlightParagraph == null || !editor) return;
    const el = editor.view.dom.querySelector(
      `p:nth-of-type(${highlightParagraph})`,
    );
    if (el) {
      el.classList.add("paragraph--highlight");
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const timer = setTimeout(() => el.classList.remove("paragraph--highlight"), 3000);
      return () => {
        clearTimeout(timer);
        el.classList.remove("paragraph--highlight");
      };
    }
  }, [highlightParagraph, editor]);

  const handleHeadlineChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      headlineRef.current = e.target.value;
      if (!editor) return;
      const bodyMd = (editor.storage as any).markdown.getMarkdown();
      onContentChange(joinHeadlineBody(e.target.value, bodyMd));
    },
    [editor, onContentChange],
  );

  const wrapperRect = wrapperRef.current?.getBoundingClientRect();

  return (
    <div className="article-preview" ref={wrapperRef}>
      <input
        className="article-headline-input"
        defaultValue={initHeadline}
        onChange={handleHeadlineChange}
        placeholder="Article headline"
      />
      <div className="article-byline">
        By {userName} &middot; {new Date().toLocaleDateString()}
        {category && (
          <span className={`badge badge-${category}`}>{category}</span>
        )}
      </div>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="article-prose" onClick={handleEditorClick}>
        <EditorContent editor={editor} />
        {editor && (
          <BubbleMenu
            editor={editor}
            shouldShow={({ editor: ed }) => {
              if (ed.isActive("image")) return false;
              return ed.state.selection.content().size > 0;
            }}
          >
            <div className="bubble-menu">
              <button
                className={`bubble-menu__btn ${editor.isActive("bold") ? "is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleBold().run()}
                type="button"
              >
                <Bold size={15} />
              </button>
              <button
                className={`bubble-menu__btn ${editor.isActive("italic") ? "is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleItalic().run()}
                type="button"
              >
                <Italic size={15} />
              </button>
              <button
                className={`bubble-menu__btn ${editor.isActive("strike") ? "is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleStrike().run()}
                type="button"
              >
                <Strikethrough size={15} />
              </button>
              <button
                className={`bubble-menu__btn ${editor.isActive("code") ? "is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleCode().run()}
                type="button"
              >
                <Code size={15} />
              </button>
              <div className="bubble-menu__sep" />
              <button
                className={`bubble-menu__btn ${editor.isActive("blockquote") ? "is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                type="button"
              >
                <Quote size={15} />
              </button>
              <button
                className={`bubble-menu__btn ${editor.isActive("bulletList") ? "is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                type="button"
              >
                <List size={15} />
              </button>
              <button
                className={`bubble-menu__btn ${editor.isActive("orderedList") ? "is-active" : ""}`}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                type="button"
              >
                <ListOrdered size={15} />
              </button>
            </div>
          </BubbleMenu>
        )}
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

// Keep backward-compat export
export { ArticleEditor as ArticlePreview };
