import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Upload, ArrowLeft, Send, X, Loader2, Image, FileAudio,
  FileVideo, File, CheckCircle, GripVertical, Move, Type, Heading2, Plus,
} from "lucide-react";
import "./PostPage.css";

const AI_ARTICLE = {
  headline: "City Council Approves New Community Park on Elm Street",
  body: `The Riverside City Council voted unanimously Tuesday evening to approve construction of a new community park on the vacant lot at 412 Elm Street.

The 2.5-acre park will include a children's playground, walking trails, a small amphitheater for community events, and a rain garden designed to manage stormwater runoff in the neighborhood.

"This has been a long time coming," said Council Member Maria Torres, who sponsored the proposal. "Families in this part of town have been asking for green space for over a decade."

Construction is expected to begin in early summer, with the park opening to the public by fall. The project is funded through a combination of city bonds and a state recreation grant totaling $1.8 million.

Residents interested in volunteering for the park planning committee can sign up at the city's website or attend the next town hall meeting on March 20.`,
  category: "Council",
  location: "City Hall, Main Street",
};

const PROCESSING_STEPS = [
  "Analyzing your input...",
  "Transcribing audio...",
  "Researching context...",
  "Writing article...",
  "Running quality checks...",
];

const LOCATION_SUGGESTIONS = [
  "City Hall, Main Street",
  "Central Park",
  "Downtown District",
  "Riverside Community Center",
  "Elm Street Elementary School",
  "Lincoln High School",
  "Public Library, Oak Avenue",
  "Farmers Market, Town Square",
  "Fire Station #3, Cedar Road",
  "Memorial Hospital",
  "Lakewood Shopping Center",
  "Maple Street Playground",
  "Westside Sports Complex",
  "Heritage Museum, Bridge Street",
  "Police Station, 5th Avenue",
];

function LocationInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isFocused, setIsFocused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const filtered = value.trim()
    ? LOCATION_SUGGESTIONS.filter((s) => s.toLowerCase().includes(value.toLowerCase())).slice(0, 5)
    : LOCATION_SUGGESTIONS.slice(0, 5);
  const show = isFocused && filtered.length > 0;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsFocused(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="post-location-wrapper" ref={ref}>
      <input id="location" className="input" placeholder="Where did this happen?" value={value}
        onChange={(e) => onChange(e.target.value)} onFocus={() => setIsFocused(true)} autoComplete="off" />
      {show && (
        <ul className="post-location-dropdown">
          {filtered.map((s) => (
            <li key={s}><button type="button" className="post-location-option"
              onMouseDown={() => { onChange(s); setIsFocused(false); }}>{s}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Step 1: Input ─────────────────────────────────────────
function InputStep({ onSubmit }: { onSubmit: () => void }) {
  const [location, setLocation] = useState("");
  const [files, setFiles] = useState<{ file: File; preview: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const sel = e.target.files;
    if (!sel) return;
    const added = Array.from(sel).map((f) => ({
      file: f, preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : "",
    }));
    setFiles((p) => [...p, ...added].slice(0, 10));
    e.target.value = "";
  }

  function removeFile(i: number) {
    setFiles((p) => { if (p[i].preview) URL.revokeObjectURL(p[i].preview); return p.filter((_, j) => j !== i); });
  }

  function icon(type: string) {
    if (type.startsWith("image/")) return <Image size={16} />;
    if (type.startsWith("audio/")) return <FileAudio size={16} />;
    if (type.startsWith("video/")) return <FileVideo size={16} />;
    return <File size={16} />;
  }

  function typeLabel(type: string) {
    if (type.startsWith("image/")) return "IMG";
    if (type.startsWith("audio/")) return "AUD";
    if (type.startsWith("video/")) return "VID";
    const ext = type.split("/")[1]?.toUpperCase();
    return ext?.slice(0, 3) || "FILE";
  }

  function size(b: number) {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  }

  return (
    <>
      <header className="post-header">
        <Link to="/" className="post-back"><ArrowLeft size={20} /><span>Back</span></Link>
        <h1 className="post-title">Submit a Story</h1>
      </header>
      <form className="post-form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        {/* Attachments first */}
        <div className="post-field">
          <label>Attachments</label>
          <div className="post-upload-card">
            <div className="post-dropzone" onClick={() => fileRef.current?.click()}>
              <Upload size={22} />
              <span className="post-dropzone-text">Drop your files here or browse</span>
              <span className="post-dropzone-hint">Images, audio, video</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*,audio/*,video/*" multiple style={{ display: "none" }} onChange={onFiles} />
            {files.length > 0 && (
              <>
                <div className="post-files-header">Uploads</div>
                <div className="post-files">
                  {files.map((f, i) => (
                    <div key={i} className="post-file">
                      <span className="post-file-badge">{typeLabel(f.file.type)}</span>
                      <div className="post-file-info">
                        <span className="post-file-name">{f.file.name}</span>
                        <span className="post-file-size">{size(f.file.size)}</span>
                      </div>
                      <button type="button" className="post-file-remove" onClick={() => removeFile(i)}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Location second */}
        <div className="post-field">
          <label htmlFor="location">Location</label>
          <LocationInput value={location} onChange={setLocation} />
        </div>

        {/* Details last */}
        <div className="post-field">
          <label htmlFor="details">Details</label>
          <textarea id="details" className="input" placeholder="Share what you know — who, what, where, when..." rows={5} />
        </div>

        <button type="submit" className="btn btn-primary btn-lg"><Send size={18} /> Submit Story</button>
      </form>
    </>
  );
}

// ─── Step 2: Processing animation ──────────────────────────
function ProcessingStep({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step < PROCESSING_STEPS.length) {
      const t = setTimeout(() => setStep((s) => s + 1), 800);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
  }, [step, onDone]);

  return (
    <div className="processing">
      <div className="processing-spinner"><Loader2 size={32} /></div>
      <h2 className="processing-title">Creating your article</h2>
      <div className="processing-steps">
        {PROCESSING_STEPS.map((label, i) => (
          <div key={i} className={`processing-step ${i < step ? "done" : i === step ? "active" : "pending"}`}>
            {i < step ? <CheckCircle size={16} /> : i === step ? <Loader2 size={16} className="spin" /> : <span className="processing-dot" />}
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Cover image with drag-to-reposition ───────────────────
const COVER_IMAGE = "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=1200&q=80";

function CoverImage() {
  const [posY, setPosY] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [showReposition, setShowReposition] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startPos = useRef(50);

  function onPointerDown(e: React.PointerEvent) {
    if (!showReposition) return;
    setDragging(true);
    startY.current = e.clientY;
    startPos.current = posY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const delta = ((e.clientY - startY.current) / rect.height) * 100;
    setPosY(Math.max(0, Math.min(100, startPos.current - delta)));
  }

  function onPointerUp() {
    setDragging(false);
  }

  return (
    <div
      ref={containerRef}
      className={`cover ${dragging ? "cover--dragging" : ""}`}
      onMouseEnter={() => setShowReposition(true)}
      onMouseLeave={() => { if (!dragging) setShowReposition(false); }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <img
        src={COVER_IMAGE}
        alt="Cover"
        className="cover-img"
        style={{ objectPosition: `center ${posY}%` }}
        draggable={false}
      />
      {showReposition && (
        <div className="cover-reposition">
          <Move size={14} />
          Drag to reposition
        </div>
      )}
    </div>
  );
}

// ─── Block types ───────────────────────────────────────────
type BlockType = "paragraph" | "subheading";
type Block = { id: string; type: BlockType; text: string };

let blockIdCounter = 0;
function makeBlock(type: BlockType, text: string): Block {
  return { id: `b${++blockIdCounter}`, type, text };
}

function initBlocks(body: string): Block[] {
  return body.split("\n\n").map((text) => makeBlock("paragraph", text));
}

// ─── Block type menu ───────────────────────────────────────
function BlockTypeMenu({
  currentType,
  onChangeType,
}: {
  currentType: BlockType;
  onChangeType: (t: BlockType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="block-type-menu" ref={ref}>
      <button
        type="button"
        className="editor-block-handle"
        onClick={() => setOpen(!open)}
      >
        <GripVertical size={14} />
      </button>
      {open && (
        <div className="block-type-dropdown">
          <button
            type="button"
            className={`block-type-option ${currentType === "paragraph" ? "active" : ""}`}
            onMouseDown={() => { onChangeType("paragraph"); setOpen(false); }}
          >
            <Type size={14} />
            <span>Text</span>
          </button>
          <button
            type="button"
            className={`block-type-option ${currentType === "subheading" ? "active" : ""}`}
            onMouseDown={() => { onChangeType("subheading"); setOpen(false); }}
          >
            <Heading2 size={14} />
            <span>Subheading</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Slash command menu ────────────────────────────────────
const SLASH_COMMANDS: { type: BlockType; label: string; desc: string; icon: typeof Type }[] = [
  { type: "paragraph", label: "Text", desc: "Plain text block", icon: Type },
  { type: "subheading", label: "Subheading", desc: "Medium section heading", icon: Heading2 },
];

function SlashMenu({
  position,
  commands,
  query,
  onSelect,
  onClose,
}: {
  position: { top: number; left: number };
  commands: typeof SLASH_COMMANDS;
  query: string;
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="slash-menu" ref={ref} style={{ top: position.top, left: position.left }}>
      {query && <div className="slash-menu-query">/{query}</div>}
      <div className="slash-menu-header">Blocks</div>
      {commands.length > 0 ? (
        commands.map((cmd) => (
          <button
            key={cmd.type}
            type="button"
            className="slash-menu-item"
            onMouseDown={(e) => { e.preventDefault(); onSelect(cmd.type); }}
          >
            <span className="slash-menu-icon"><cmd.icon size={16} /></span>
            <div className="slash-menu-label">
              <span>{cmd.label}</span>
              <span className="slash-menu-desc">{cmd.desc}</span>
            </div>
          </button>
        ))
      ) : (
        <div className="slash-menu-empty">No results</div>
      )}
    </div>
  );
}

// ─── Step 3: Preview & edit (Notion-style) ─────────────────
function PreviewStep() {
  const navigate = useNavigate();
  const [headline, setHeadline] = useState(AI_ARTICLE.headline);
  const [blocks, setBlocks] = useState<Block[]>(() => initBlocks(AI_ARTICLE.body));
  const [publishing, setPublishing] = useState(false);
  const [slashMenu, setSlashMenu] = useState<{ blockId: string; query: string; top: number; left: number } | null>(null);

  const slashFiltered = slashMenu
    ? SLASH_COMMANDS.filter((cmd) =>
        cmd.label.toLowerCase().includes(slashMenu.query.toLowerCase())
      )
    : [];

  function handleBlockInput(blockId: string, e: React.FormEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const text = el.textContent || "";

    // Check if text starts with /
    if (text.startsWith("/")) {
      const query = text.slice(1); // everything after /
      const rect = el.getBoundingClientRect();
      const containerRect = el.closest(".editor")?.getBoundingClientRect();
      if (containerRect) {
        setSlashMenu({
          blockId,
          query,
          top: rect.bottom - containerRect.top + 4,
          left: rect.left - containerRect.left,
        });
      }
    } else {
      if (slashMenu?.blockId === blockId) setSlashMenu(null);
    }
  }

  function handleSlashSelect(type: BlockType) {
    if (!slashMenu) return;
    setBlocks((prev) => prev.map((b) => (b.id === slashMenu.blockId ? { ...b, type, text: "" } : b)));
    setSlashMenu(null);
  }

  function publish() {
    setPublishing(true);
    setTimeout(() => navigate("/"), 1500);
  }

  function updateBlock(id: string, text: string) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
  }

  function changeBlockType(id: string, type: BlockType) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type } : b)));
  }

  function addBlock(afterIndex: number) {
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, makeBlock("paragraph", ""));
      return next;
    });
  }

  return (
    <div className="editor" style={{ animation: "fadeIn 0.4s ease", position: "relative" }}>
      {/* Cover image */}
      <CoverImage />

      {/* Content area */}
      <div className="editor-content">
        {/* Meta */}
        <div className="editor-meta">
          <span className="badge badge-council">{AI_ARTICLE.category}</span>
          <span className="editor-location">{AI_ARTICLE.location}</span>
        </div>

        {/* Headline — inline editable */}
        <textarea
          className="editor-headline"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="Untitled"
          rows={1}
        />

        {/* Body — block editing */}
        <div className="editor-body">
          {blocks.map((block, i) => (
            <div key={block.id} className="editor-block">
              <BlockTypeMenu
                currentType={block.type}
                onChangeType={(t) => changeBlockType(block.id, t)}
              />
              <div
                className={`editor-block-text ${block.type === "subheading" ? "editor-block-subheading" : ""}`}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => updateBlock(block.id, e.currentTarget.textContent || "")}
                onInput={(e) => handleBlockInput(block.id, e)}
                dangerouslySetInnerHTML={{ __html: block.text }}
              />
              <button
                type="button"
                className="editor-block-add"
                onClick={() => addBlock(i)}
              >
                <Plus size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Slash command menu */}
      {slashMenu && (
        <SlashMenu
          position={{ top: slashMenu.top, left: slashMenu.left }}
          commands={slashFiltered}
          query={slashMenu.query}
          onSelect={handleSlashSelect}
          onClose={() => setSlashMenu(null)}
        />
      )}

      {/* Publish */}
      <div className="editor-publish">
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={publishing}
          onClick={publish}
        >
          {publishing ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
          {publishing ? "Publishing..." : "Publish Article"}
        </button>
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────
type FlowStep = "input" | "processing" | "preview";

export default function PostPage() {
  const [step, setStep] = useState<FlowStep>("input");

  return (
    <div className={`post-page ${step === "processing" ? "post-page--centered" : ""}`}>
      {step === "input" && <InputStep onSubmit={() => setStep("processing")} />}
      {step === "processing" && <ProcessingStep onDone={() => setStep("preview")} />}
      {step === "preview" && <PreviewStep />}
    </div>
  );
}
