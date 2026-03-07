import { Extension } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { RedTrigger } from "@/lib/types";

const annotationPluginKey = new PluginKey("annotationHighlight");

function buildDecorations(
  doc: import("@tiptap/pm/model").Node,
  triggers: RedTrigger[],
): DecorationSet {
  if (triggers.length === 0) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  let paragraphIndex = 0;

  doc.descendants((node, pos) => {
    if (node.type.name === "paragraph") {
      paragraphIndex++;
      const text = node.textContent;
      const triggersForP = triggers.filter((t) => t.paragraph === paragraphIndex);

      for (const trigger of triggersForP) {
        const idx = text.indexOf(trigger.sentence);
        if (idx === -1) continue;

        // pos+1 because pos is position before the node, +1 enters the node
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
      return false; // don't descend into paragraph children
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
    };
  },

  addCommands() {
    return {
      setTriggers:
        (triggers: RedTrigger[]) =>
        ({ editor }: { editor: any }) => {
          editor.storage.annotationHighlight.triggers = triggers;
          // Force plugin state recalculation by dispatching a transaction
          const { tr } = editor.state;
          tr.setMeta(annotationPluginKey, { triggers });
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
            );
          },
          apply(tr, oldDecoSet, _oldState, newState) {
            const meta = tr.getMeta(annotationPluginKey);
            if (meta?.triggers) {
              return buildDecorations(newState.doc, meta.triggers);
            }
            if (tr.docChanged) {
              return buildDecorations(
                newState.doc,
                extension.storage.triggers,
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
