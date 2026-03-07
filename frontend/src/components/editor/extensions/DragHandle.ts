import { Extension } from "@tiptap/react";
import { Plugin, PluginKey, NodeSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const BLOCK_NODES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "bulletList",
  "orderedList",
  "codeBlock",
  "horizontalRule",
  "image",
]);

function createHandle(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "drag-handle";
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", "Drag to reorder");
  el.setAttribute("draggable", "true");
  // 6-dot grip icon
  el.innerHTML = `<svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor">
    <circle cx="5" cy="4" r="1.8"/><circle cx="11" cy="4" r="1.8"/>
    <circle cx="5" cy="10" r="1.8"/><circle cx="11" cy="10" r="1.8"/>
    <circle cx="5" cy="16" r="1.8"/><circle cx="11" cy="16" r="1.8"/>
  </svg>`;
  el.style.display = "none";
  return el;
}

/** Find top-level block node index + position at a given y coordinate */
function findBlockAtY(
  view: EditorView,
  y: number,
): { pos: number; index: number; dom: HTMLElement } | null {
  const { doc } = view.state;
  let pos = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    const nodePos = pos;
    pos += child.nodeSize;

    if (!BLOCK_NODES.has(child.type.name)) continue;

    const dom = view.nodeDOM(nodePos);
    if (!(dom instanceof HTMLElement)) continue;

    const rect = dom.getBoundingClientRect();
    if (y >= rect.top - 4 && y <= rect.bottom + 4) {
      return { pos: nodePos, index: i, dom };
    }
  }
  return null;
}

export const DragHandle = Extension.create({
  name: "dragHandle",

  addProseMirrorPlugins() {
    let handle: HTMLDivElement | null = null;
    let currentBlock: { pos: number; index: number } | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    let isOverHandle = false;

    function show() {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      if (handle) handle.style.display = "flex";
    }

    function hideSoon() {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        if (!isOverHandle && handle) {
          handle.style.display = "none";
          currentBlock = null;
        }
      }, 200);
    }

    return [
      new Plugin({
        key: new PluginKey("dragHandle"),
        view(view) {
          handle = createHandle();

          const wrapper = view.dom.parentElement;
          if (wrapper) {
            wrapper.style.position = "relative";
            wrapper.appendChild(handle);
          }

          // --- hover bookkeeping ---
          handle.addEventListener("mouseenter", () => { isOverHandle = true; show(); });
          handle.addEventListener("mouseleave", () => { isOverHandle = false; hideSoon(); });

          // --- drag start: set up ProseMirror dragging state ---
          handle.addEventListener("dragstart", (e) => {
            if (!currentBlock || !e.dataTransfer) { e.preventDefault(); return; }

            // Select the node so ProseMirror serialises it
            const { state } = view;
            const node = state.doc.nodeAt(currentBlock.pos);
            if (!node) { e.preventDefault(); return; }

            const tr = state.tr.setSelection(
              NodeSelection.create(state.doc, currentBlock.pos),
            );
            view.dispatch(tr);

            // Let ProseMirror's built-in drop handling work
            const slice = view.state.selection.content();
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", "");

            // Ghost image: clone the block DOM
            const blockDom = view.nodeDOM(currentBlock.pos);
            if (blockDom instanceof HTMLElement) {
              const ghost = blockDom.cloneNode(true) as HTMLElement;
              ghost.style.width = `${blockDom.offsetWidth}px`;
              ghost.style.opacity = "0.7";
              ghost.style.position = "absolute";
              ghost.style.top = "-9999px";
              document.body.appendChild(ghost);
              e.dataTransfer.setDragImage(ghost, 0, 0);
              requestAnimationFrame(() => ghost.remove());
            }

            // Tell ProseMirror this is its drag
            (view as any).dragging = { slice, move: true };
          });

          return {
            destroy() {
              if (hideTimer) clearTimeout(hideTimer);
              handle?.remove();
              handle = null;
            },
          };
        },

        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              if (!handle) return false;

              const rect = view.dom.getBoundingClientRect();
              const { clientX, clientY } = event;

              // Hide if cursor is far from the editor
              if (
                clientX < rect.left - 60 || clientX > rect.right + 10 ||
                clientY < rect.top - 10 || clientY > rect.bottom + 10
              ) {
                hideSoon();
                return false;
              }

              const hit = findBlockAtY(view, clientY);
              if (!hit) { hideSoon(); return false; }

              currentBlock = { pos: hit.pos, index: hit.index };
              const parentRect = view.dom.parentElement!.getBoundingClientRect();
              const blockRect = hit.dom.getBoundingClientRect();

              show();
              handle.style.top = `${blockRect.top - parentRect.top + 2}px`;
              handle.style.left = "-32px";

              return false;
            },

            mouseleave() {
              hideSoon();
              return false;
            },

            // ProseMirror needs to see the drop — make sure we don't block it
            drop() { return false; },
          },
        },
      }),
    ];
  },
});
