import { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Markdown } from "tiptap-markdown";
import { AnnotationHighlight, annotationPluginKey } from "./extensions/AnnotationHighlight";
import { DragHandle } from "./extensions/DragHandle";
import { useLanguage } from "@/contexts/LanguageContext";
import type { RedTrigger, VerificationEntry } from "@/lib/types";
import type { ActiveAnnotation } from "./types";
import {
  X, Bold, Italic, Strikethrough, Code, Quote, List, ListOrdered,
  Link, Unlink, Highlighter, AlignLeft, AlignCenter, AlignRight,
  Heading2, Heading3, ListIcon, CodeSquare, Minus,
  Sparkles, Send,
} from "lucide-react";

type ArticleEditorProps = {
  markdown: string;
  userName: string;
  category?: string;
  redTriggers: RedTrigger[];
  verification?: VerificationEntry[];
  activeAnnotation: ActiveAnnotation;
  onAnnotationClick: (trigger: RedTrigger, rect: DOMRect) => void;
  onAnnotationDismiss: () => void;
  highlightParagraph?: number;
  onContentChange: (markdown: string) => void;
  onAiAction?: (instruction: string, selectedText: string, paragraphIndex: number) => void;
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

const VERIFY_LABELS: Record<string, { label: string; className: string }> = {
  NOT_IN_SOURCE: { label: "Not in source", className: "verify-tooltip--warning" },
  POSSIBLE_HALLUCINATION: { label: "Possible hallucination", className: "verify-tooltip--error" },
  FABRICATED_QUOTE: { label: "Fabricated quote", className: "verify-tooltip--error" },
};

function VerifyTooltip({
  status,
  claim,
  rect,
  wrapperRect,
}: {
  status: string;
  claim: string;
  rect: DOMRect;
  wrapperRect: DOMRect;
}) {
  const config = VERIFY_LABELS[status] || { label: status, className: "verify-tooltip--warning" };
  const top = rect.bottom - wrapperRect.top + 4;
  const left = Math.max(0, rect.left - wrapperRect.left);

  return (
    <div className={`verify-tooltip ${config.className}`} style={{ top, left }}>
      <span className="verify-tooltip__label">{config.label}</span>
      <p className="verify-tooltip__claim">{claim}</p>
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
  verification = [],
  activeAnnotation,
  onAnnotationClick,
  onAnnotationDismiss,
  highlightParagraph,
  onContentChange,
  onAiAction,
}: ArticleEditorProps) {
  const { t } = useLanguage();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { headline: initHeadline, body: initBody } = splitHeadline(markdown);
  const headlineRef = useRef(initHeadline);
  const isExternalUpdate = useRef(false);
  // Track the last markdown we sent up to avoid re-setting content from our own edits
  const lastEmittedMarkdown = useRef(markdown);

  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [aiInstruction, setAiInstruction] = useState("");
  const [verifyTooltip, setVerifyTooltip] = useState<{
    status: string;
    claim: string;
    rect: DOMRect;
  } | null>(null);

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
      Placeholder.configure({ placeholder: t("editor.startWriting") }),
      Markdown,
      AnnotationHighlight,
      DragHandle,
      Typography,
      CharacterCount,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
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

  // Update annotations when redTriggers or verification change
  useEffect(() => {
    if (!editor) return;
    (editor.storage as any).annotationHighlight.triggers = redTriggers;
    (editor.storage as any).annotationHighlight.verification = verification;
    const { tr } = editor.state;
    tr.setMeta(annotationPluginKey, { triggers: redTriggers, verification });
    editor.view.dispatch(tr);
  }, [editor, redTriggers, verification]);

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

  // Hover handler for verification annotations
  const handleEditorMouseOver = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.classList.contains("annotation--amber") ||
        target.classList.contains("annotation--red-verify")
      ) {
        const status = target.getAttribute("data-verify-status") || "";
        const claim = target.getAttribute("data-verify-claim") || "";
        setVerifyTooltip({ status, claim, rect: target.getBoundingClientRect() });
      }
    },
    [],
  );

  const handleEditorMouseOut = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.classList.contains("annotation--amber") ||
        target.classList.contains("annotation--red-verify")
      ) {
        setVerifyTooltip(null);
      }
    },
    [],
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

  const handleSetLink = useCallback(() => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const prev = editor.getAttributes("link").href ?? "";
    setLinkUrl(prev);
    // Focus the input after render
    setTimeout(() => linkInputRef.current?.focus(), 0);
  }, [editor]);

  const handleLinkSubmit = useCallback(() => {
    if (!editor || linkUrl === null) return;
    if (linkUrl.trim()) {
      editor
        .chain()
        .focus()
        .setLink({ href: linkUrl.trim() })
        .run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
    setLinkUrl(null);
  }, [editor, linkUrl]);

  const getSelectionContext = useCallback(() => {
    if (!editor) return { text: "", paragraphIndex: 0 };
    const { from, to } = editor.state.selection;
    const text = editor.state.doc.textBetween(from, to, " ");
    const paragraphIndex = editor.state.doc.resolve(from).index(0);
    return { text, paragraphIndex };
  }, [editor]);

  const handleAiChip = useCallback(
    (action: string) => {
      if (!onAiAction || !editor) return;
      const { text, paragraphIndex } = getSelectionContext();
      onAiAction(action, text, paragraphIndex);
    },
    [onAiAction, editor, getSelectionContext],
  );

  const handleAiInstructionSubmit = useCallback(() => {
    if (!onAiAction || !editor || !aiInstruction.trim()) return;
    const { text, paragraphIndex } = getSelectionContext();
    onAiAction(aiInstruction.trim(), text, paragraphIndex);
    setAiInstruction("");
  }, [onAiAction, editor, aiInstruction, getSelectionContext]);

  const wrapperRect = wrapperRef.current?.getBoundingClientRect();

  return (
    <div className="article-preview" ref={wrapperRef}>
      <input
        className="article-headline-input"
        defaultValue={initHeadline}
        onChange={handleHeadlineChange}
        placeholder={t("editor.headline")}
      />
      <div className="article-byline">
        By {userName} &middot; {new Date().toLocaleDateString()}
        {category && (
          <span className={`badge badge-${category}`}>{category}</span>
        )}
      </div>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className="article-prose"
        onClick={handleEditorClick}
        onMouseOver={handleEditorMouseOver}
        onMouseOut={handleEditorMouseOut}
      >
        <EditorContent editor={editor} />

        {/* Floating menu — shows on empty paragraphs */}
        {editor && (
          <FloatingMenu
            editor={editor}
            shouldShow={({ editor: ed }) =>
              ed.isActive("paragraph") &&
              ed.state.selection.empty &&
              ed.state.doc.resolve(ed.state.selection.from).parent.content
                .size === 0
            }
          >
            <div className="floating-menu">
              <button
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 2 }).run()
                }
                type="button"
                title="Heading 2"
              >
                <Heading2 size={16} />
              </button>
              <button
                onClick={() =>
                  editor.chain().focus().toggleHeading({ level: 3 }).run()
                }
                type="button"
                title="Heading 3"
              >
                <Heading3 size={16} />
              </button>
              <button
                onClick={() =>
                  editor.chain().focus().toggleBlockquote().run()
                }
                type="button"
                title="Blockquote"
              >
                <Quote size={16} />
              </button>
              <button
                onClick={() =>
                  editor.chain().focus().toggleBulletList().run()
                }
                type="button"
                title="Bullet list"
              >
                <ListIcon size={16} />
              </button>
              <button
                onClick={() =>
                  editor.chain().focus().toggleCodeBlock().run()
                }
                type="button"
                title="Code block"
              >
                <CodeSquare size={16} />
              </button>
              <button
                onClick={() =>
                  editor.chain().focus().setHorizontalRule().run()
                }
                type="button"
                title="Horizontal rule"
              >
                <Minus size={16} />
              </button>
            </div>
          </FloatingMenu>
        )}

        {/* Bubble menu — text formatting toolbar */}
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
              <button
                className={`bubble-menu__btn ${editor.isActive("highlight") ? "is-active" : ""}`}
                onClick={() =>
                  editor.chain().focus().toggleHighlight().run()
                }
                type="button"
                title="Highlight"
              >
                <Highlighter size={15} />
              </button>
              <button
                className={`bubble-menu__btn ${editor.isActive("link") ? "is-active" : ""}`}
                onClick={handleSetLink}
                type="button"
                title={editor.isActive("link") ? "Remove link" : "Add link"}
              >
                {editor.isActive("link") ? (
                  <Unlink size={15} />
                ) : (
                  <Link size={15} />
                )}
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
              <div className="bubble-menu__sep" />
              <button
                className={`bubble-menu__btn ${editor.isActive({ textAlign: "left" }) ? "is-active" : ""}`}
                onClick={() =>
                  editor.chain().focus().setTextAlign("left").run()
                }
                type="button"
                title="Align left"
              >
                <AlignLeft size={15} />
              </button>
              <button
                className={`bubble-menu__btn ${editor.isActive({ textAlign: "center" }) ? "is-active" : ""}`}
                onClick={() =>
                  editor.chain().focus().setTextAlign("center").run()
                }
                type="button"
                title="Align center"
              >
                <AlignCenter size={15} />
              </button>
              <button
                className={`bubble-menu__btn ${editor.isActive({ textAlign: "right" }) ? "is-active" : ""}`}
                onClick={() =>
                  editor.chain().focus().setTextAlign("right").run()
                }
                type="button"
                title="Align right"
              >
                <AlignRight size={15} />
              </button>
            </div>
            {onAiAction && (
              <div className="bubble-menu-ai">
                <div className="bubble-menu-ai__chips">
                  <Sparkles size={13} className="bubble-menu-ai__icon" />
                  <button
                    type="button"
                    className="bubble-menu-ai__chip"
                    onClick={() => handleAiChip(t("editor.aiRephraseInstruction"))}
                  >
                    {t("editor.aiRephrase")}
                  </button>
                  <button
                    type="button"
                    className="bubble-menu-ai__chip"
                    onClick={() => handleAiChip(t("editor.aiSimplifyInstruction"))}
                  >
                    {t("editor.aiSimplify")}
                  </button>
                  <button
                    type="button"
                    className="bubble-menu-ai__chip"
                    onClick={() => handleAiChip(t("editor.aiExpandInstruction"))}
                  >
                    {t("editor.aiExpand")}
                  </button>
                  <button
                    type="button"
                    className="bubble-menu-ai__chip"
                    onClick={() => handleAiChip(t("editor.aiFixInstruction"))}
                  >
                    {t("editor.aiFix")}
                  </button>
                </div>
                <div className="bubble-menu-ai__input">
                  <input
                    type="text"
                    placeholder={t("editor.aiPlaceholder")}
                    value={aiInstruction}
                    onChange={(e) => setAiInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAiInstructionSubmit();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAiInstructionSubmit}
                    disabled={!aiInstruction.trim()}
                  >
                    <Send size={13} />
                  </button>
                </div>
              </div>
            )}
            {linkUrl !== null && (
              <div className="bubble-menu-link-input">
                <input
                  ref={linkInputRef}
                  type="url"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleLinkSubmit();
                    if (e.key === "Escape") setLinkUrl(null);
                  }}
                />
                <button onClick={handleLinkSubmit} type="button">
                  {t("editor.apply")}
                </button>
              </div>
            )}
          </BubbleMenu>
        )}
      </div>

      {/* Word count */}
      {editor && (
        <div className="word-count">
          {editor.storage.characterCount.words()} {t("editor.words")} &middot;{" "}
          {editor.storage.characterCount.characters()} {t("editor.characters")}
        </div>
      )}

      {activeAnnotation && wrapperRect && (
        <SuggestionCard
          trigger={activeAnnotation.trigger}
          rect={activeAnnotation.rect}
          wrapperRect={wrapperRect}
          onDismiss={onAnnotationDismiss}
        />
      )}

      {verifyTooltip && wrapperRect && (
        <VerifyTooltip
          status={verifyTooltip.status}
          claim={verifyTooltip.claim}
          rect={verifyTooltip.rect}
          wrapperRect={wrapperRect}
        />
      )}
    </div>
  );
}

// Keep backward-compat export
export { ArticleEditor as ArticlePreview };
