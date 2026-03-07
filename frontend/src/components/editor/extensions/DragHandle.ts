import { Extension } from "@tiptap/react";
import { Plugin, PluginKey, NodeSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

const GRIP_SVG = `<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <circle cx="6" cy="3.5" r="1.5"/><circle cx="12" cy="3.5" r="1.5"/>
  <circle cx="6" cy="9" r="1.5"/><circle cx="12" cy="9" r="1.5"/>
  <circle cx="6" cy="14.5" r="1.5"/><circle cx="12" cy="14.5" r="1.5"/>
</svg>`;

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
  el.innerHTML = GRIP_SVG;
  el.draggable = true;
  el.style.display = "none";
  return el;
}

function findBlockPos(view: EditorView, y: number): number | null {
  // Walk top-level nodes and find the one whose DOM element contains the y coordinate
  const { doc } = view.state;
  let pos = 0;
  for (let i = 0; i < doc.childCount; i++) {
    const child = doc.child(i);
    const nodePos = pos;
    pos += child.nodeSize;

    if (!BLOCK_NODES.has(child.type.name)) continue;

    const dom = view.nodeDOM(nodePos + 1 === pos ? nodePos : nodePos);
    if (!(dom instanceof HTMLElement)) continue;

    const rect = dom.getBoundingClientRect();
    if (y >= rect.top - 4 && y <= rect.bottom + 4) {
      return nodePos;
    }
  }
  return null;
}

export const DragHandle = Extension.create({
  name: "dragHandle",

  addProseMirrorPlugins() {
    let handle: HTMLDivElement | null = null;
    let currentBlockPos: number | null = null;
    let hideTimeout: ReturnType<typeof setTimeout> | null = null;
    let handleHovered = false;

    function showHandle() {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      if (handle) handle.style.display = "flex";
    }

    function scheduleHide() {
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        if (!handleHovered && handle) {
          handle.style.display = "none";
          currentBlockPos = null;
        }
      }, 300);
    }

    return [
      new Plugin({
        key: new PluginKey("dragHandle"),
        view(editorView) {
          handle = createHandle();
          // Append to the editor wrapper so positioning is relative to it
          const parent = editorView.dom.parentElement;
          if (parent) {
            parent.style.position = "relative";
            parent.appendChild(handle);
          }

          // Keep handle visible while it's being hovered
          handle.addEventListener("mouseenter", () => {
            handleHovered = true;
            showHandle();
          });
          handle.addEventListener("mouseleave", () => {
            handleHovered = false;
            scheduleHide();
          });

          handle.addEventListener("mousedown", (e) => {
            if (currentBlockPos == null) return;
            e.preventDefault();

            // Select the block node
            const tr = editorView.state.tr.setSelection(
              NodeSelection.create(editorView.state.doc, currentBlockPos),
            );
            editorView.dispatch(tr);

            // Let ProseMirror handle the drag from here
            const dragEvent = new DragEvent("dragstart", {
              bubbles: true,
              cancelable: true,
              dataTransfer: new DataTransfer(),
            });
            editorView.dom.dispatchEvent(dragEvent);
          });

          handle.addEventListener("dragstart", (e) => {
            if (currentBlockPos == null || !e.dataTransfer) return;

            // Ensure the node is selected so ProseMirror's drag behavior works
            const { state } = editorView;
            if (!(state.selection instanceof NodeSelection)) {
              const tr = state.tr.setSelection(
                NodeSelection.create(state.doc, currentBlockPos),
              );
              editorView.dispatch(tr);
            }

            // Serialize the selection for ProseMirror drag
            const slice = editorView.state.selection.content();
            if (!(editorView as any).dragging?.slice) {
              const d = document.createElement("div");
              d.textContent = "Dragging...";
              e.dataTransfer.setDragImage(d, 0, 0);
            }
            e.dataTransfer.effectAllowed = "move";

            // Set dragging on the view so ProseMirror handles the drop
            (editorView as any).dragging = {
              slice,
              move: true,
            };
          });

          return {
            destroy() {
              if (hideTimeout) clearTimeout(hideTimeout);
              handle?.remove();
              handle = null;
            },
          };
        },
        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              if (!handle) return false;

              const editorRect = view.dom.getBoundingClientRect();
              const { clientX, clientY } = event;

              // Only show when mouse is near the left edge or over the editor
              if (
                clientX < editorRect.left - 50 ||
                clientX > editorRect.right + 10 ||
                clientY < editorRect.top - 10 ||
                clientY > editorRect.bottom + 10
              ) {
                scheduleHide();
                return false;
              }

              const blockPos = findBlockPos(view, clientY);
              if (blockPos == null) {
                scheduleHide();
                return false;
              }

              currentBlockPos = blockPos;
              const dom = view.nodeDOM(blockPos);
              if (!(dom instanceof HTMLElement)) {
                scheduleHide();
                return false;
              }

              const blockRect = dom.getBoundingClientRect();
              const parentRect = view.dom.parentElement!.getBoundingClientRect();

              showHandle();
              // Vertically center the handle with the first line of the block
              handle.style.top = `${blockRect.top - parentRect.top}px`;
              handle.style.left = "-36px";

              return false;
            },
            mouseleave(_view, _event) {
              scheduleHide();
              return false;
            },
          },
        },
      }),
    ];
  },
});
