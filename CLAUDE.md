# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal portfolio for ayaankhan.dev — a one-page static site (hero, about, timeline, projects, skills, contact). No build step, no package manager, no tests. Plain HTML/CSS/JS; GSAP + ScrollTrigger and Three.js come from the jsDelivr CDN.

## Developing

Open `index.html` directly in a browser, or serve the folder:

```
python -m http.server 8000
```

Deployed via GitHub Pages from `main` / root, with the custom domain in `CNAME`. Pushing to `main` publishes the site.

## Architecture

- `index.html` — all content and markup. Sections are anchored (`#about`, `#timeline`, `#projects`, `#skills`, `#contact`) and numbered in their titles (01–05).
- `js/main.js` — one IIFE: custom cursor + magnetic hover, scroll reveals (see below), project accordions, AJAX Formspree submission.
- `js/hero-text.js` — particle text for the hero name (see below).
- `js/hero3d.js` — the 3D rings object and its scroll-driven journey (see below). Dynamically imports Three.js as an ES module only on desktop-class devices; otherwise adds `no-3d` to `<body>`, which shows a CSS gradient fallback instead.
- `css/style.css` — dark monochrome theme, custom cursor, tooltips, reveal/accordion styles.
- `img/` — 16:9 project thumbnails (real screenshots of each project).

Conventions that span files:

- **Monochrome palette**: strictly black/white/grey — `--accent` is light grey, not a color. Deliberate exceptions: the red Swiss-flag SVGs (national flag, content not accent), the Devicon skill logos (brand colors), and project thumbnails — which are held to the palette by a `grayscale(1)` filter at rest that releases to full color on card hover. Don't introduce color accents.
- **Motion gates**: every effect is gated behind `(pointer: fine)` and `prefers-reduced-motion`; the 3D additionally requires `innerWidth >= 768` at load. Keep new effects behind the same gates.
- **Behavior classes**: `.magnetic` / `.magnetic-card` opt into magnetic hover, `.reveal` into scroll-triggered fade-in, `.tooltip` + `data-tip` renders a CSS tooltip.
- Script order in `index.html` matters: GSAP + ScrollTrigger CDN scripts, then `main.js`, then `hero-text.js`, then `hero3d.js` (hero3d assumes GSAP globals exist; hero-text is self-contained).

## Reveal system (don't regress this)

`.reveal` elements are set to opacity 0 by JS and revealed by per-element once-only ScrollTriggers. Two guards prevent a full-screen black flash that plain `gsap.from` reveals caused:

1. Clicking any `#`-anchor link synchronously reveals every pending element between the current position and one viewport past the target *before* the smooth scroll starts (frame-rate independent).
2. On fast manual scrolls (`getVelocity() > 1800`), elements snap visible instead of tweening.

If you touch the reveal code, keep both paths.

## Hero particle text (`js/hero-text.js`)

On fine pointers without reduced motion, the `<h1 class="hero__name">` is re-rendered as a dot field: the heading's own computed font is drawn to an offscreen canvas, its alpha channel sampled every 4px into particles, and a bleed-padded overlay canvas (inside the h1, `pointer-events: none`) animates them — the cursor scatters dots within a 90px radius, released dots spring home. The real text stays in the DOM (painted `color: transparent` via `.has-particles`) for layout and screen readers; on touch it remains untouched as the visible static heading.

Constraints:

- The initial build runs directly off `document.fonts.ready` — **not** behind `requestAnimationFrame`, which never fires in occluded/background tabs and would leave the heading as plain text there. Only the interaction loop uses rAF (and stops entirely when dots are settled and the cursor is away).
- Sampling must wait for Space Grotesk (`fonts.ready`), or the dots trace the fallback font.

## Hero 3D scroll journey

The `#hero-canvas` is a `position: fixed` overlay (`z-index: -1`, so it weaves behind text). A single scrubbed tween (scrub 1.2) drives a Catmull-Rom spline through waypoints: hero right → About left → Timeline right → Projects left, deliberately pushing partly off-screen at the extremes. Each section entry triggers an eased glow/scale pulse. When Skills enters, the object fades out and `renderer.setAnimationLoop(null)` stops Three.js entirely; scrolling back restores it.

Two hard-won constraints:

- Never kill/rebuild ScrollTriggers during ScrollTrigger's own load-time refresh — it corrupts its internal state. The path build is deferred to `window.load` + a tick for this reason.
- WebGL ignores line widths (always 1px); the rings are thin `TorusGeometry` meshes, not `Line` objects, for real thickness.

## Verifying in a browser (automation gotcha)

Unfocused/automated Chrome windows throttle `requestAnimationFrame` to ~1fps — or suspend it entirely when occluded — which makes GSAP tweens, scrub smoothing, and ScrollTrigger updates look frozen or broken when they're fine. Reports of "black flash on nav", "smudges near headings", or the orb stuck over content from automated browsing sessions are this artifact. Verify scroll behavior with real clicks/scrolls (which focus the window), and check trigger state via JS (`ScrollTrigger.getAll()`, computed styles) rather than trusting screenshots of mid-animation states.

When extension-based screenshots fail (frozen renderer), `chrome.exe --headless=new --screenshot=... --window-size=1280,720 --virtual-time-budget=8000 <url>` is a reliable fallback for static captures. Note the hero is `min-height: 100svh`, so tall-window full-page shots show mostly hero; screenshot a minimal test page that links `css/style.css` to inspect a deeper section in isolation.

## Known open items

- `index.html` has `<meta name="robots" content="noindex, nofollow">`, which deliberately keeps the site out of search results (robots.txt itself is permissive). Don't remove the meta tag unless the owner asks to make the site indexable.
