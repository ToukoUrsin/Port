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

const HANDLE_GUTTER = 40;
const VIEWPORT_GUTTER = 8;

function createHandle(): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "drag-handle";
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", "Drag to reorder");
  el.setAttribute("draggable", "true");
  el.setAttribute("tabindex", "0");
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

function dragMoves(view: EditorView, event: DragEvent) {
  const dragCopyModifier = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    ? event.altKey
    : event.ctrlKey;
  const moves = view.someProp("dragCopies", (test) => !test(event));
  return moves != null ? moves : !dragCopyModifier;
}

export const DragHandle = Extension.create({
  name: "dragHandle",

  addProseMirrorPlugins() {
    let handle: HTMLDivElement | null = null;
    let wrapper: HTMLElement | null = null;
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
          handle.classList.remove("drag-handle--dragging");
          wrapper?.classList.remove("drag-handle-active");
          currentBlock = null;
        }
      }, 200);
    }

    return [
      new Plugin({
        key: new PluginKey("dragHandle"),
        view(view) {
          handle = createHandle();

          wrapper = (view.dom.closest(".article-preview") as HTMLElement | null) ?? view.dom.parentElement;
          if (wrapper) {
            wrapper.style.position = "relative";
            wrapper.appendChild(handle);
          }

          // --- hover bookkeeping ---
          handle.addEventListener("mouseenter", () => { isOverHandle = true; show(); });
          handle.addEventListener("mouseleave", () => { isOverHandle = false; hideSoon(); });
          handle.addEventListener("mousedown", (e) => {
            if (!currentBlock || e.button !== 0) return;
            const selection = NodeSelection.create(view.state.doc, currentBlock.pos);
            view.dispatch(view.state.tr.setSelection(selection));
            view.focus();
          });
          handle.addEventListener("click", (e) => {
            if (!currentBlock) return;
            e.preventDefault();
            const selection = NodeSelection.create(view.state.doc, currentBlock.pos);
            view.dispatch(view.state.tr.setSelection(selection));
            view.focus();
          });

          // --- drag start: set up ProseMirror dragging state ---
          handle.addEventListener("dragstart", (e) => {
            if (!currentBlock || !e.dataTransfer) { e.preventDefault(); return; }

            const mouseDown = (view as any).input?.mouseDown;
            if (mouseDown?.done) mouseDown.done();

            // Select the node so ProseMirror serialises it
            const selection = NodeSelection.create(view.state.doc, currentBlock.pos);
            const node = view.state.doc.nodeAt(currentBlock.pos);
            if (!node) { e.preventDefault(); return; }
            view.dispatch(view.state.tr.setSelection(selection));

            // Let ProseMirror's built-in drop handling work
            const slice = selection.content();
            try {
              e.dataTransfer.clearData();
            } catch {
              // Some browsers may reject clearData in restricted contexts.
            }
            e.dataTransfer.effectAllowed = "copyMove";

            // Ghost image: clone the block DOM
            const blockDom = view.nodeDOM(currentBlock.pos);
            if (blockDom instanceof HTMLElement) {
              e.dataTransfer.setData("text/html", blockDom.outerHTML);
              e.dataTransfer.setData("text/plain", blockDom.innerText || blockDom.textContent || "");
              const ghost = blockDom.cloneNode(true) as HTMLElement;
              ghost.style.width = `${blockDom.offsetWidth}px`;
              ghost.style.opacity = "0.7";
              ghost.style.position = "absolute";
              ghost.style.top = "-9999px";
              document.body.appendChild(ghost);
              e.dataTransfer.setDragImage(ghost, 0, 0);
              requestAnimationFrame(() => ghost.remove());
            } else {
              e.dataTransfer.setData("text/plain", node.textContent || "");
            }

            // Tell ProseMirror this is its drag
            (view as any).dragging = {
              slice,
              move: dragMoves(view, e),
              node: selection,
            };
            handle?.classList.add("drag-handle--dragging");
            wrapper?.classList.add("drag-handle-active");
          });
          handle.addEventListener("dragend", () => {
            handle?.classList.remove("drag-handle--dragging");
            wrapper?.classList.remove("drag-handle-active");
            hideSoon();
          });

          return {
            destroy() {
              if (hideTimer) clearTimeout(hideTimer);
              wrapper?.classList.remove("drag-handle-active");
              handle?.remove();
              handle = null;
              wrapper = null;
            },
          };
        },

        props: {
          handleDOMEvents: {
            mousemove(view, event) {
              const handleEl = handle;
              if (!handleEl) return false;

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
              const parentRect = (wrapper ?? view.dom.parentElement!)?.getBoundingClientRect();
              const blockRect = hit.dom.getBoundingClientRect();
              const handleLeft = Math.max(-HANDLE_GUTTER, VIEWPORT_GUTTER - parentRect.left);
              const handleTop =
                blockRect.top - parentRect.top + Math.max(0, (blockRect.height - 28) / 2);

              show();
              handleEl.style.top = `${handleTop}px`;
              handleEl.style.left = `${handleLeft}px`;

              return false;
            },

            mouseleave() {
              hideSoon();
              return false;
            },

            dragover(_view, event) {
              const topEdge = 120;
              const bottomEdge = window.innerHeight - 120;

              if (event.clientY < topEdge) {
                window.scrollBy(0, -Math.max(10, Math.round((topEdge - event.clientY) / 6)));
              } else if (event.clientY > bottomEdge) {
                window.scrollBy(0, Math.max(10, Math.round((event.clientY - bottomEdge) / 6)));
              }

              return false;
            },

            // ProseMirror needs to see the drop — make sure we don't block it
            drop() {
              handle?.classList.remove("drag-handle--dragging");
              wrapper?.classList.remove("drag-handle-active");
              return false;
            },
          },
        },
      }),
    ];
  },
});
