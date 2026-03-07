# UI Design System — Local News Platform

**Stack:** Vite + React + shadcn/ui + CSS Custom Properties (design tokens)
**Last updated:** 2026-03-07

---

## How This System Works

We use **shadcn/ui** as our component library. All visual decisions live in **CSS custom properties** (design tokens) defined in a single file: `frontend/src/styles/tokens.css`. Every component references these tokens — never raw values. Change a token, change the entire app.

```
tokens.css          <- single source of truth
    |
    v
index.css           <- global resets, base styles (uses tokens)
    |
    v
components/*.tsx     <- all components reference tokens via var(--token-name)
```

**Rules for the team:**
1. Never use a raw color hex, pixel value, or font-size in a component. Always use `var(--token-name)`.
2. If a new token is needed, add it to `tokens.css` first, then use it.
3. Spacing and sizing use the scale — don't invent values like `13px` or `22px`.

---

## Token Reference

All token values (hex codes, pixel sizes, rem values) live in `frontend/src/styles/tokens.css` — the single source of truth. This document only lists token names and their intended use. **Check the CSS files for actual values.**

### Colors — Brand
| Token | Use |
|-------|-----|
| `--color-primary` | Main actions, links, active states |
| `--color-primary-hover` | Hover state for primary |
| `--color-primary-light` | Light backgrounds, badges, focus glow |
| `--color-secondary` | Headings, strong text |

### Colors — Neutral (gray scale)
`--color-gray-50` through `--color-gray-900` — see `tokens.css` for the full scale.

### Colors — Semantic
| Token | Use |
|-------|-----|
| `--color-success` / `--color-success-light` | Published, approved |
| `--color-warning` / `--color-warning-light` | Review flags, caution |
| `--color-error` / `--color-error-light` | Errors, rejected |
| `--color-info` / `--color-info-light` | Info messages, tips |

### Colors — Surface & Background
| Token | Use |
|-------|-----|
| `--color-bg` | Page background |
| `--color-bg-secondary` | Secondary background |
| `--color-bg-tertiary` | Tertiary background |
| `--color-surface` | Cards, panels |
| `--color-surface-hover` | Card hover state |
| `--color-border` | Default borders |
| `--color-border-focus` | Focused input borders |
| `--color-overlay` | Modal overlays |

### Colors — Text
| Token | Use |
|-------|-----|
| `--color-text` | Body text |
| `--color-text-secondary` | Captions, meta |
| `--color-text-tertiary` | Placeholders |
| `--color-text-inverse` | Text on dark backgrounds |
| `--color-text-link` | Links |

### Colors — Category badges (newspaper sections)
`--color-cat-council`, `--color-cat-schools`, `--color-cat-business`, `--color-cat-events`, `--color-cat-sports`, `--color-cat-community`

### Typography
| Token group | Tokens |
|-------------|--------|
| Font families | `--font-sans`, `--font-serif`, `--font-mono` |
| Font sizes (modular scale) | `--text-xs` through `--text-5xl` |
| Font weights | `--font-normal`, `--font-medium`, `--font-semibold`, `--font-bold` |
| Line heights | `--leading-tight`, `--leading-normal`, `--leading-relaxed` |
| Letter spacing | `--tracking-tight`, `--tracking-normal`, `--tracking-wide` |

### Spacing (4px base scale)
`--space-0`, `--space-1`, `--space-2`, `--space-3`, `--space-4`, `--space-5`, `--space-6`, `--space-8`, `--space-10`, `--space-12`, `--space-16`, `--space-20`, `--space-24`

### Sizing
| Token | Use |
|-------|-----|
| `--size-content` | Article body max-width |
| `--size-container` | Page container |
| `--size-container-sm` | Narrow pages (contribute flow) |
| `--size-sidebar` | Sidebar width |

### Border Radius
`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full` (pills, avatars)

### Shadows
`--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-xl`

### Transitions
`--transition-fast`, `--transition-normal`, `--transition-slow`

### Z-Index Scale
`--z-base`, `--z-dropdown`, `--z-sticky`, `--z-overlay`, `--z-modal`, `--z-toast`

---

## Typography Rules

| Element | Font | Size | Weight | Line Height | Color |
|---------|------|------|--------|-------------|-------|
| **Article headline** | `--font-serif` | `--text-3xl` | `--font-bold` | `--leading-tight` | `--color-secondary` |
| **Article body** | `--font-serif` | `--text-lg` | `--font-normal` | `--leading-relaxed` | `--color-text` |
| **Page title** | `--font-sans` | `--text-2xl` | `--font-bold` | `--leading-tight` | `--color-secondary` |
| **Section heading** | `--font-sans` | `--text-xl` | `--font-semibold` | `--leading-tight` | `--color-secondary` |
| **Body text** | `--font-sans` | `--text-base` | `--font-normal` | `--leading-normal` | `--color-text` |
| **Caption / meta** | `--font-sans` | `--text-sm` | `--font-normal` | `--leading-normal` | `--color-text-secondary` |
| **Label / overline** | `--font-sans` | `--text-xs` | `--font-medium` | `--leading-normal` | `--color-text-secondary` |
| **Button text** | `--font-sans` | `--text-sm` | `--font-semibold` | `--leading-normal` | — |

**Newspaper vs. App:** Article content uses `--font-serif` for a newspaper feel. All UI chrome (buttons, labels, nav, forms) uses `--font-sans`.

---

## Spacing Conventions

| Context | Token | Use |
|---------|-------|-----|
| Inline spacing (icon + text) | `--space-2` | Gap between icon and label |
| Form field gap | `--space-3` | Between label and input |
| Between components | `--space-4` to `--space-6` | Cards in a list, form fields |
| Section padding | `--space-6` to `--space-8` | Inside cards, page sections |
| Page padding (mobile) | `--space-4` | Left/right body padding |
| Page padding (desktop) | `--space-6` | Left/right body padding |
| Between page sections | `--space-12` to `--space-16` | Major content blocks |

---

## Component Specs

Component implementations live in `frontend/src/styles/components.css`. Below are the design conventions — check the CSS file for full styles.

### Buttons

| Variant | Background | Text color | Padding | Radius |
|---------|-----------|------------|---------|--------|
| **Primary** | `--color-primary` | `--color-text-inverse` | `--space-3` / `--space-5` | `--radius-md` |
| **Secondary** | transparent | `--color-primary` | `--space-3` / `--space-5` | `--radius-md` |
| **Danger** | `--color-error` | `--color-text-inverse` | `--space-3` / `--space-5` | `--radius-md` |
| **Large** | — | — | `--space-4` / `--space-6` | `--radius-lg` |

All buttons use `--text-sm` / `--font-semibold`. Hover: primary uses `--color-primary-hover`, secondary uses `--color-primary-light`.

### Cards

- Background: `--color-surface`, border: `--color-border`, radius: `--radius-lg`, padding: `--space-6`
- Shadow: `--shadow-sm`, on hover: `--shadow-md` with `--transition-normal`

### Form Inputs

- Font: `--font-sans` at `--text-base`, padding: `--space-3` / `--space-4`
- Border: `--color-border`, radius: `--radius-md`
- Focus: border changes to `--color-border-focus` with `--color-primary-light` glow ring
- Placeholder: `--color-text-tertiary`

### Category Badge

- Font: `--text-xs` / `--font-semibold`, uppercase, `--tracking-wide`
- Padding: `--space-1` / `--space-2`, radius: `--radius-sm`
- Each category uses its `--color-cat-*` token for text, with a light alpha background

### Review Flag

- Layout: flex with `--space-3` gap, padding: `--space-4`, radius: `--radius-md`, `--text-sm`
- **Warning:** `--color-warning-light` bg, `--color-warning` left border
- **Error:** `--color-error-light` bg, `--color-error` left border
- **Info:** `--color-info-light` bg, `--color-info` left border

---

## Layout

See `frontend/src/styles/components.css` for full implementation.

### Page Container
- `.container`: max-width `--size-container`, centered, horizontal padding `--space-4` (mobile) / `--space-6` (desktop)
- `.container--narrow`: max-width `--size-container-sm`

### Newspaper Grid (reader page)
- CSS grid with `--space-6` gap
- 1 column (mobile) → 2 columns (`md`) → 3 columns (`lg`)
- Lead story (`.article-card--lead`) spans full width

---

## Breakpoints

| Name | Min-width | Target |
|------|-----------|--------|
| `sm` | `640px` | Large phones (landscape) |
| `md` | `768px` | Tablets |
| `lg` | `1024px` | Laptops |
| `xl` | `1280px` | Desktops |

Use mobile-first: base styles = mobile, add `@media (min-width: ...)` for larger.

---

## Iconography

Use **Lucide React** (`lucide-react`) — lightweight, consistent, MIT licensed.

Key icons:
| Context | Icon | Usage |
|---------|------|-------|
| Record audio | `Mic` | Start recording button |
| Stop recording | `Square` | Stop button (filled) |
| Take photo | `Camera` | Photo capture |
| Upload file | `Upload` | File picker |
| Publish | `Send` | Publish button |
| Category | `Tag` | Category label |
| Warning flag | `AlertTriangle` | Review warning |
| Error flag | `XCircle` | Review error |
| Success | `CheckCircle` | Approved state |
| Loading | `Loader2` | Spinner (animate rotate) |
| Article | `FileText` | Article reference |
| Time | `Clock` | Timestamps |

Icon size: `20px` for inline, `24px` for buttons, `32px` for empty states.

---

## Loading & State Patterns

### Pipeline Progress (contributor flow)

Four steps shown as a horizontal stepper:

```
[1. Recording] --- [2. Uploading] --- [3. AI Writing] --- [4. Review]
     done             done             active              pending
```

- **Done:** `--color-success` circle + checkmark
- **Active:** `--color-primary` circle + spinner
- **Pending:** `--color-gray-300` circle + number

### Empty States

Centered layout, icon + heading + description + optional CTA button. Use `--color-text-secondary` for the description.

### Skeleton Loading

For article cards: gray rectangles (`--color-gray-200`) with `border-radius: var(--radius-md)` and a subtle pulse animation.

---

## Accessibility Requirements

- All interactive elements must have `:focus-visible` styles using `--color-primary-light` focus ring
- Color contrast: text on backgrounds must meet WCAG AA
- Buttons: minimum touch target on mobile (see `components.css`)
- Form inputs: always pair with a `<label>`
- Images: always include `alt` text (AI-generated captions serve as alt text)

---

## File Structure (implementation)

```
frontend/src/styles/
  tokens.css          # design tokens (this file IS the design system)
  reset.css           # minimal CSS reset
  globals.css         # base element styles using tokens
  components.css      # shared component classes (btn, card, input, badge, etc.)
  utilities.css       # spacing/display helpers if needed
  index.css           # imports all the above in order
```

`index.css` imports all the above in order. `main.tsx` imports `./styles/index.css`.

---

## Quick Reference — Token Naming Convention

| Prefix | Purpose | Example |
|--------|---------|---------|
| `--color-*` | Colors | `--color-primary`, `--color-gray-500` |
| `--text-*` | Font sizes | `--text-lg`, `--text-2xl` |
| `--font-*` | Font families & weights | `--font-serif`, `--font-bold` |
| `--leading-*` | Line heights | `--leading-relaxed` |
| `--tracking-*` | Letter spacing | `--tracking-tight` |
| `--space-*` | Spacing (margin, padding, gap) | `--space-4`, `--space-8` |
| `--size-*` | Fixed widths/heights | `--size-container` |
| `--radius-*` | Border radius | `--radius-md` |
| `--shadow-*` | Box shadows | `--shadow-lg` |
| `--transition-*` | Transition durations | `--transition-fast` |
| `--z-*` | Z-index layers | `--z-modal` |

---

*This document describes the design system conventions. For actual token values, see `frontend/src/styles/tokens.css`. For component styles, see `frontend/src/styles/components.css`.*
