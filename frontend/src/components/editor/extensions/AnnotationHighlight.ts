import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { RedTrigger, VerificationEntry } from "@/lib/types";

const annotationPluginKey = new PluginKey("annotationHighlight");

type ParagraphConfidence = "supported" | "warning" | "error";

function worstStatus(statuses: string[]): ParagraphConfidence {
  if (statuses.some((s) => s === "POSSIBLE_HALLUCINATION" || s === "FABRICATED_QUOTE")) return "error";
  if (statuses.some((s) => s === "NOT_IN_SOURCE")) return "warning";
  return "supported";
}

function buildDecorations(
  doc: import("@tiptap/pm/model").Node,
  triggers: RedTrigger[],
  verification: VerificationEntry[],
): DecorationSet {
  if (triggers.length === 0 && verification.length === 0) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  let paragraphIndex = 0;

  doc.descendants((node, pos) => {
    if (node.type.name === "paragraph" || node.type.name === "blockquote") {
      paragraphIndex++;
      const text = node.textContent;

      // --- Red trigger inline decorations (existing) ---
      const triggersForP = triggers.filter((t) => t.paragraph === paragraphIndex);
      for (const trigger of triggersForP) {
        const idx = text.indexOf(trigger.sentence);
        if (idx === -1) continue;
        const from = pos + 1 + idx;
        const to = from + trigger.sentence.length;
        decorations.push(
          Decoration.inline(from, to, {
            class: "annotation annotation--red",
            "data-trigger-dimension": trigger.dimension,
            "data-trigger-paragraph": String(trigger.paragraph),
          }),
        );
      }

      // --- Verification: match claims to this paragraph ---
      const matchedStatuses: string[] = [];
      for (const entry of verification) {
        // Use a significant substring of the claim for matching (first 40 chars)
        const searchText = entry.claim.slice(0, 60);
        if (text.includes(searchText)) {
          matchedStatuses.push(entry.status);

          // Add amber/red inline underline for problematic claims
          if (entry.status !== "SUPPORTED") {
            const idx = text.indexOf(searchText);
            if (idx !== -1) {
              const from = pos + 1 + idx;
              const to = from + Math.min(entry.claim.length, text.length - idx);
              const cls = entry.status === "NOT_IN_SOURCE"
                ? "annotation annotation--amber"
                : "annotation annotation--red-verify";
              decorations.push(
                Decoration.inline(from, to, {
                  class: cls,
                  "data-verify-status": entry.status,
                  "data-verify-claim": entry.claim.slice(0, 100),
                }),
              );
            }
          }
        }
      }

      // --- Paragraph confidence border ---
      if (matchedStatuses.length > 0) {
        const confidence = worstStatus(matchedStatuses);
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, {
            class: `paragraph-confidence paragraph-confidence--${confidence}`,
          }),
        );
      }

      return false;
    }
    return true;
  });

  return DecorationSet.create(doc, decorations);
}

export const AnnotationHighlight = Extension.create({
  name: "annotationHighlight",

  addStorage() {
    return {
      triggers: [] as RedTrigger[],
      verification: [] as VerificationEntry[],
    };
  },

  addCommands() {
    return {
      setTriggers:
        (triggers: RedTrigger[]) =>
        ({ editor }: { editor: any }) => {
          editor.storage.annotationHighlight.triggers = triggers;
          const { tr } = editor.state;
          tr.setMeta(annotationPluginKey, { triggers, verification: editor.storage.annotationHighlight.verification });
          editor.view.dispatch(tr);
          return true;
        },
    } as any;
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: annotationPluginKey,
        state: {
          init(_, state) {
            return buildDecorations(
              state.doc,
              extension.storage.triggers,
              extension.storage.verification,
            );
          },
          apply(tr, oldDecoSet, _oldState, newState) {
            const meta = tr.getMeta(annotationPluginKey);
            if (meta) {
              return buildDecorations(
                newState.doc,
                meta.triggers ?? extension.storage.triggers,
                meta.verification ?? extension.storage.verification,
              );
            }
            if (tr.docChanged) {
              return buildDecorations(
                newState.doc,
                extension.storage.triggers,
                extension.storage.verification,
              );
            }
            return oldDecoSet;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
