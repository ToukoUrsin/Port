# SensorySync: Neuro-Adaptive Media Interfaces

**Working name:** SensorySync / CalmWeb / NeuroLayer

## The Problem

The modern web is fundamentally hostile to neurodivergent individuals (ADHD, autism, sensory processing disorders), who make up 15-20% of the global population.

Digital media is designed to capture attention through sensory overload:

- Aggressive contrasting colors and flashing elements
- Autoplaying videos with sound
- Infinite scroll loops that lack "stopping cues" for executive dysfunction
- High-anxiety UI patterns (countdown timers, stacked pop-ups)

**The gap:** Accessibility tools exist for visually or hearing-impaired users (screen readers, high-contrast mode), but almost nothing exists for *cognitive* accessibility.

## The Insight

Digital equity shouldn't just mean internet access — it means giving users agency over their sensory environment. Currently, users adapt to media. Media should adapt to the user's neurological needs.

## What It Is

An OS-level or browser-level extension that dynamically rewrites the CSS, structure, and behavior of web platforms in real time to match a user's sensory profile.

### Core Features

1. **Sensory Dampening** — Strips anxiety-inducing UI patterns (flashing badges, red notification dots, countdown timers).
2. **Visual Pacing** — Replaces infinite scroll with deliberate "Load More" pagination, providing stopping cues for executive dysfunction.
3. **Focus Mode** — Dims peripheral elements when reading an article or watching a video.
4. **Layout Normalization** — Standardizes chaotic multi-column layouts into a single, focused column.
5. **Media Control** — Strict enforcement against autoplaying media and layout shifts.

## Why This Wins on the Criteria

### Technical Feasibility (108 pts) — HIGH

- **Tech stack:** Manifest V3 Chrome Extension using DOM MutationObservers to detect and neutralize specific elements, plus custom CSS injection.
- **MVP buildable in 48 hours:** Reliable CSS/JS overrides for 3 major chaotic websites (e.g., Daily Mail, Reddit, TikTok Web) to prove the concept.

### Market Potential & Scalability (109 pts) — HIGH

- **Regulatory tailwind:** The European Accessibility Act (EAA) 2025 requires digital products to be accessible, creating a massive B2B compliance market.
- **B2C market:** 15-20% of the population is neurodivergent — a large, highly motivated user base seeking sensory relief.
- **B2B licensing:** A "Sensory API" for publishers so their sites natively adapt based on user OS preferences (similar to dark mode adaptation).

### Challenge Fit (PORT_ 2026 — Challenge 1)

- **Digital equity:** Brings cognitive accessibility to the forefront.
- **Audience empowerment:** Moves control of the digital environment from the platform back to the user.
- **Responsible media:** Neutralizes manipulative UI design patterns.

## Hackathon MVP (48 Hours)

### Demo Scenario

1. Open a notoriously chaotic, ad-filled website (e.g., AliExpress or Daily Mail).
2. The user is visibly overwhelmed.
3. Toggle "SensorySync — Focused Profile" on.
4. *Watch the page transform in real time:* autoplaying videos freeze, aggressive red "SALE" banners shift to calm blue, the layout collapses into a single readable column, and distracting sidebars fade out.
5. The transformation from chaos to calm is instantly visual and emotionally resonant.

### Tech Stack

- Chrome Extension (Manifest V3)
- Content scripts with MutationObserver for real-time DOM modification
- Pre-built CSS profiles (e.g., "Low Stimulus", "Hyper-Focus")

## Pitch Narrative

*"For the last decade, tech companies have spent billions optimizing UI to hijack our neurology. We built SensorySync to give you your sovereignty back. We aren't just building a feature — we are proposing a new web standard: the Cognitive Accessibility Layer."*
