import {
  Mic,
  Square,
  Camera,
  Upload,
  Send,
  Tag,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Loader2,
  FileText,
  Clock,
} from "lucide-react";
import "./DesignSystem.css";

const BRAND_COLORS = [
  { token: "--color-primary", label: "Primary" },
  { token: "--color-primary-hover", label: "Primary Hover" },
  { token: "--color-primary-light", label: "Primary Light" },
  { token: "--color-secondary", label: "Secondary" },
];

const GRAY_COLORS = [
  { token: "--color-gray-50", label: "50" },
  { token: "--color-gray-100", label: "100" },
  { token: "--color-gray-200", label: "200" },
  { token: "--color-gray-300", label: "300" },
  { token: "--color-gray-400", label: "400" },
  { token: "--color-gray-500", label: "500" },
  { token: "--color-gray-600", label: "600" },
  { token: "--color-gray-700", label: "700" },
  { token: "--color-gray-800", label: "800" },
  { token: "--color-gray-900", label: "900" },
];

const SEMANTIC_COLORS = [
  { token: "--color-success", label: "Success" },
  { token: "--color-success-light", label: "Success Light" },
  { token: "--color-warning", label: "Warning" },
  { token: "--color-warning-light", label: "Warning Light" },
  { token: "--color-error", label: "Error" },
  { token: "--color-error-light", label: "Error Light" },
  { token: "--color-info", label: "Info" },
  { token: "--color-info-light", label: "Info Light" },
];

const TYPE_SCALE = [
  { token: "--text-xs", label: "xs", rem: "0.75rem" },
  { token: "--text-sm", label: "sm", rem: "0.875rem" },
  { token: "--text-base", label: "base", rem: "1rem" },
  { token: "--text-lg", label: "lg", rem: "1.125rem" },
  { token: "--text-xl", label: "xl", rem: "1.25rem" },
  { token: "--text-2xl", label: "2xl", rem: "1.5rem" },
  { token: "--text-3xl", label: "3xl", rem: "1.875rem" },
  { token: "--text-4xl", label: "4xl", rem: "2.25rem" },
  { token: "--text-5xl", label: "5xl", rem: "3rem" },
];

const SPACING_SCALE = [
  { token: "--space-1", label: "1", px: "4px" },
  { token: "--space-2", label: "2", px: "8px" },
  { token: "--space-3", label: "3", px: "12px" },
  { token: "--space-4", label: "4", px: "16px" },
  { token: "--space-5", label: "5", px: "20px" },
  { token: "--space-6", label: "6", px: "24px" },
  { token: "--space-8", label: "8", px: "32px" },
  { token: "--space-10", label: "10", px: "40px" },
  { token: "--space-12", label: "12", px: "48px" },
  { token: "--space-16", label: "16", px: "64px" },
];

const RADIUS_SCALE = [
  { token: "--radius-sm", label: "sm", val: "4px" },
  { token: "--radius-md", label: "md", val: "8px" },
  { token: "--radius-lg", label: "lg", val: "12px" },
  { token: "--radius-xl", label: "xl", val: "16px" },
  { token: "--radius-full", label: "full", val: "9999px" },
];

const SHADOW_SCALE = [
  { token: "--shadow-sm", label: "sm" },
  { token: "--shadow-md", label: "md" },
  { token: "--shadow-lg", label: "lg" },
  { token: "--shadow-xl", label: "xl" },
];

const INNER_SHADOW_SCALE = [
  { token: "--shadow-inner-sm", label: "inner-sm" },
  { token: "--shadow-inner-md", label: "inner-md" },
];

const BLUR_SCALE = [
  { token: "--blur-sm", label: "sm", px: "4px" },
  { token: "--blur-md", label: "md", px: "8px" },
  { token: "--blur-lg", label: "lg", px: "16px" },
];

const ICONS = [
  { icon: Mic, label: "Mic", use: "Record audio" },
  { icon: Square, label: "Square", use: "Stop recording" },
  { icon: Camera, label: "Camera", use: "Take photo" },
  { icon: Upload, label: "Upload", use: "File picker" },
  { icon: Send, label: "Send", use: "Publish" },
  { icon: Tag, label: "Tag", use: "Category" },
  { icon: AlertTriangle, label: "AlertTriangle", use: "Warning flag" },
  { icon: XCircle, label: "XCircle", use: "Error flag" },
  { icon: CheckCircle, label: "CheckCircle", use: "Success" },
  { icon: Loader2, label: "Loader2", use: "Loading" },
  { icon: FileText, label: "FileText", use: "Article" },
  { icon: Clock, label: "Clock", use: "Timestamp" },
];

function getComputedToken(token: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

function ColorSwatch({ token, label }: { token: string; label: string }) {
  const value = getComputedToken(token);
  return (
    <div className="ds-swatch">
      <div className="ds-swatch__color" style={{ background: `var(${token})` }} />
      <div className="ds-swatch__info">
        <span className="ds-swatch__label">{label}</span>
        <code className="ds-swatch__token">{token}</code>
        <code className="ds-swatch__value">{value}</code>
      </div>
    </div>
  );
}

export default function DesignSystem() {
  return (
    <div className="ds">
      <header className="ds-header">
        <h1>Design System</h1>
        <p>
          All tokens live in <code>src/styles/tokens.css</code>. Change a token
          there, it changes everywhere.
        </p>
      </header>

      {/* COLORS — Brand */}
      <section className="ds-section">
        <h2>Brand Colors</h2>
        <div className="ds-swatches">
          {BRAND_COLORS.map((c) => (
            <ColorSwatch key={c.token} {...c} />
          ))}
        </div>
      </section>

      {/* COLORS — Gray */}
      <section className="ds-section">
        <h2>Gray Scale</h2>
        <div className="ds-swatches ds-swatches--compact">
          {GRAY_COLORS.map((c) => (
            <ColorSwatch key={c.token} {...c} />
          ))}
        </div>
      </section>

      {/* COLORS — Semantic */}
      <section className="ds-section">
        <h2>Semantic Colors</h2>
        <div className="ds-swatches">
          {SEMANTIC_COLORS.map((c) => (
            <ColorSwatch key={c.token} {...c} />
          ))}
        </div>
      </section>


      {/* TYPOGRAPHY */}
      <section className="ds-section">
        <h2>Typography</h2>

        <h3>Font Families</h3>
        <div className="ds-type-families">
          <div>
            <p style={{ fontFamily: "var(--font-heading)", fontWeight: 300, fontSize: "var(--text-3xl)" }}>
              <strong style={{ fontWeight: 300 }}>Heading (Playfair Display):</strong> The quick brown fox jumps over the lazy dog
            </p>
            <code>--font-heading / --font-light</code>
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-sans)" }}>
              <strong>Sans (UI):</strong> The quick brown fox jumps over the lazy dog
            </p>
            <code>--font-sans</code>
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-serif)" }}>
              <strong>Serif (Article body):</strong> The quick brown fox jumps over the lazy dog
            </p>
            <code>--font-serif</code>
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)" }}>
              <strong>Mono:</strong> The quick brown fox jumps over the lazy dog
            </p>
            <code>--font-mono</code>
          </div>
        </div>

        <h3>Type Scale</h3>
        <div className="ds-type-scale">
          {TYPE_SCALE.map((t) => (
            <div key={t.token} className="ds-type-scale__row">
              <code className="ds-type-scale__token">{t.label}</code>
              <span
                className="ds-type-scale__sample"
                style={{ fontSize: `var(${t.token})` }}
              >
                Local news for every community
              </span>
              <code className="ds-type-scale__value">{t.rem}</code>
            </div>
          ))}
        </div>

        <h3>Article Typography</h3>
        <div className="ds-article-preview">
          <h4
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "var(--text-4xl)",
              fontWeight: 300,
              lineHeight: "var(--leading-tight)",
              letterSpacing: "var(--tracking-tight)",
              color: "var(--color-secondary)",
            }}
          >
            PORT_2026: 40 Teams Compete to Represent Aalto in Seoul
          </h4>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-text-secondary)",
              marginTop: "var(--space-2)",
            }}
          >
            March 7, 2026 &middot; Otaniemi, Espoo
          </p>
          <p
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "var(--text-lg)",
              lineHeight: "var(--leading-relaxed)",
              marginTop: "var(--space-4)",
            }}
          >
            Saturday morning at the Aalto Design Factory, 40 teams gathered for PORT_2026,
            the annual hackathon that sends one team to represent Finland at the Global
            Student Startup Competition in Seoul. "The energy this year is different," said
            organizer Maria Virtanen. "Teams are building things that could actually ship."
          </p>
        </div>
      </section>

      {/* SPACING */}
      <section className="ds-section">
        <h2>Spacing</h2>
        <div className="ds-spacing-scale">
          {SPACING_SCALE.map((s) => (
            <div key={s.token} className="ds-spacing__row">
              <code className="ds-spacing__token">--space-{s.label}</code>
              <div className="ds-spacing__bar-container">
                <div
                  className="ds-spacing__bar"
                  style={{ width: `var(${s.token})` }}
                />
              </div>
              <code className="ds-spacing__value">{s.px}</code>
            </div>
          ))}
        </div>
      </section>

      {/* BORDER RADIUS */}
      <section className="ds-section">
        <h2>Border Radius</h2>
        <div className="ds-row">
          {RADIUS_SCALE.map((r) => (
            <div key={r.token} className="ds-radius-item">
              <div
                className="ds-radius__box"
                style={{ borderRadius: `var(${r.token})` }}
              />
              <code>{r.label}</code>
              <span className="ds-meta">{r.val}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SHADOWS */}
      <section className="ds-section">
        <h2>Shadows</h2>
        <h3>Drop Shadows</h3>
        <div className="ds-row">
          {SHADOW_SCALE.map((s) => (
            <div key={s.token} className="ds-shadow-item">
              <div
                className="ds-shadow__box"
                style={{ boxShadow: `var(${s.token})` }}
              />
              <code>{s.label}</code>
            </div>
          ))}
        </div>

        <h3>Inner Shadows</h3>
        <div className="ds-row">
          {INNER_SHADOW_SCALE.map((s) => (
            <div key={s.token} className="ds-shadow-item">
              <div
                className="ds-shadow__box"
                style={{ boxShadow: `var(${s.token})`, background: "var(--color-bg)" }}
              />
              <code>{s.label}</code>
            </div>
          ))}
        </div>

        <h3>Backdrop Blur</h3>
        <div className="ds-row">
          {BLUR_SCALE.map((b) => (
            <div key={b.token} className="ds-shadow-item">
              <div className="ds-blur__box">
                <div
                  className="ds-blur__overlay"
                  style={{ backdropFilter: `blur(var(${b.token}))`, WebkitBackdropFilter: `blur(var(${b.token}))` }}
                />
              </div>
              <code>{b.label}</code>
              <span className="ds-meta">{b.px}</span>
            </div>
          ))}
        </div>
      </section>

      {/* BUTTONS */}
      <section className="ds-section">
        <h2>Buttons</h2>
        <div className="ds-component-row">
          <div>
            <h3>Variants</h3>
            <div className="ds-row">
              <button className="btn btn-primary">Primary</button>
              <button className="btn btn-secondary">Secondary</button>
              <button className="btn btn-danger">Danger</button>
              <button className="btn btn-ghost">Ghost</button>
            </div>
          </div>
          <div>
            <h3>Sizes</h3>
            <div className="ds-row" style={{ alignItems: "center" }}>
              <button className="btn btn-primary btn-sm">Small</button>
              <button className="btn btn-primary">Default</button>
              <button className="btn btn-primary btn-lg">Large</button>
            </div>
          </div>
          <div>
            <h3>With Icons</h3>
            <div className="ds-row">
              <button className="btn btn-primary">
                <Mic size={16} /> Record
              </button>
              <button className="btn btn-primary btn-lg">
                <Send size={20} /> Publish
              </button>
              <button className="btn btn-danger">
                <Square size={16} fill="currentColor" /> Stop
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FORM INPUTS */}
      <section className="ds-section">
        <h2>Form Inputs</h2>
        <div className="ds-inputs-grid">
          <div>
            <label className="ds-label">Default Input</label>
            <input className="input" placeholder="Type something..." />
          </div>
          <div>
            <label className="ds-label">Textarea</label>
            <textarea className="input" placeholder="Add your notes..." />
          </div>
        </div>
      </section>

      {/* CARDS */}
      <section className="ds-section">
        <h2>Cards</h2>

        <h3>Small</h3>
        <div className="ds-cards-grid">
          <div className="card card-sm">
            <div className="card-img-placeholder card-img-placeholder--sm" />
            <h4 style={{ marginTop: "var(--space-3)", fontFamily: "var(--font-heading)", fontSize: "var(--text-lg)", fontWeight: 400 }}>
              Weekend Market Returns
            </h4>
          </div>
          <div className="card card-sm">
            <div className="card-img-placeholder card-img-placeholder--sm" />
            <h4 style={{ marginTop: "var(--space-3)", fontFamily: "var(--font-heading)", fontSize: "var(--text-lg)", fontWeight: 400 }}>
              Volunteer Drive Saturday
            </h4>
          </div>
          <div className="card card-sm">
            <div className="card-img-placeholder card-img-placeholder--sm" />
            <h4 style={{ marginTop: "var(--space-3)", fontFamily: "var(--font-heading)", fontSize: "var(--text-lg)", fontWeight: 400 }}>
              Registration Opens Monday
            </h4>
          </div>
        </div>

        <h3>Default</h3>
        <div className="ds-cards-grid">
          <div className="card">
            <div className="card-img-placeholder" />
            <h4 style={{ marginTop: "var(--space-4)", fontFamily: "var(--font-heading)", fontSize: "var(--text-xl)", fontWeight: 400 }}>
              Town Hall Approves New Budget
            </h4>
            <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              The council voted 5-2 to approve the 2026 municipal budget, allocating funds to road maintenance and the new community center.
            </p>
          </div>
          <div className="card">
            <div className="card-img-placeholder" />
            <h4 style={{ marginTop: "var(--space-4)", fontFamily: "var(--font-heading)", fontSize: "var(--text-xl)", fontWeight: 400 }}>
              Local Team Wins Regional Championship
            </h4>
            <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              The Otaniemi Eagles secured their first regional title in 12 years with a dramatic 3-2 victory.
            </p>
          </div>
          <div className="card">
            <div className="card-img-placeholder" />
            <h4 style={{ marginTop: "var(--space-4)", fontFamily: "var(--font-heading)", fontSize: "var(--text-xl)", fontWeight: 400 }}>
              New Coffee Shop Opens on Main Street
            </h4>
            <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}>
              Bean & Gone, a specialty coffee roaster, opened its doors this week in the former bookshop space.
            </p>
          </div>
        </div>

        <h3>Large (Lead Story)</h3>
        <div className="card card-lg">
          <div className="card-img-placeholder card-img-placeholder--lg" />
          <h4 style={{
            marginTop: "var(--space-4)",
            fontFamily: "var(--font-heading)",
            fontSize: "var(--text-3xl)",
            fontWeight: 400,
            lineHeight: "var(--leading-tight)",
            letterSpacing: "var(--tracking-tight)",
          }}>
            City Council Votes to Expand Public Transit to Three New Neighborhoods
          </h4>
          <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-base)", color: "var(--color-text-secondary)", lineHeight: "var(--leading-relaxed)" }}>
            In a landmark 6-1 decision, the council approved a $2.4 million plan to extend bus routes into the growing eastern suburbs, a move residents have been requesting for over three years.
          </p>
          <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)", color: "var(--color-text-tertiary)" }}>
            March 7, 2026 &middot; 4 min read
          </p>
        </div>
      </section>

      {/* REVIEW FLAGS */}
      <section className="ds-section">
        <h2>Review Flags</h2>
        <div className="ds-flags-stack">
          <div className="flag flag-warning">
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Unverified claim:</strong> "The budget is $10 million" — this seems high for a town of 2,000. Please verify.
            </div>
          </div>
          <div className="flag flag-error">
            <XCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Attribution missing:</strong> Quote "We're excited about this" has no speaker attribution in the transcript.
            </div>
          </div>
          <div className="flag flag-info">
            <FileText size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Missing context:</strong> The article mentions a vote but doesn't include the vote count (5-2).
            </div>
          </div>
          <div className="flag flag-success">
            <CheckCircle size={20} style={{ flexShrink: 0 }} />
            <div>
              <strong>Approved:</strong> All checks passed. Article is ready for publication.
            </div>
          </div>
        </div>
      </section>

      {/* ICONS */}
      <section className="ds-section">
        <h2>Icons (Lucide React)</h2>
        <div className="ds-icons-grid">
          {ICONS.map((i) => (
            <div key={i.label} className="ds-icon-item">
              <i.icon size={24} />
              <code>{i.label}</code>
              <span className="ds-meta">{i.use}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PIPELINE STEPPER */}
      <section className="ds-section">
        <h2>Pipeline Stepper</h2>
        <div className="ds-stepper">
          <div className="ds-step ds-step--done">
            <div className="ds-step__circle">
              <CheckCircle size={16} />
            </div>
            <span>Recording</span>
          </div>
          <div className="ds-step__line ds-step__line--done" />
          <div className="ds-step ds-step--done">
            <div className="ds-step__circle">
              <CheckCircle size={16} />
            </div>
            <span>Uploading</span>
          </div>
          <div className="ds-step__line ds-step__line--active" />
          <div className="ds-step ds-step--active">
            <div className="ds-step__circle">
              <Loader2 size={16} className="ds-spin" />
            </div>
            <span>AI Writing</span>
          </div>
          <div className="ds-step__line" />
          <div className="ds-step">
            <div className="ds-step__circle">4</div>
            <span>Review</span>
          </div>
        </div>
      </section>
    </div>
  );
}
