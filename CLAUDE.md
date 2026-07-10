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

- `index.html` — all content and markup lives here. Sections are anchored (`#about`, `#timeline`, `#projects`, `#skills`, `#contact`) and numbered in their titles (01–05).
- `js/main.js` — one IIFE with all interactions: custom cursor + magnetic hover (only when `(pointer: fine)` and no `prefers-reduced-motion`), GSAP scroll reveals of `.reveal` elements, project accordion toggles, and AJAX Formspree submission for the contact form.
- `js/hero3d.js` — Three.js wireframe hero. Dynamically imports Three.js as an ES module only on desktop-class devices (fine pointer, ≥768px, no reduced motion); otherwise adds `no-3d` to `<body>`, which `css/style.css` uses to show a gradient fallback instead of the canvas.
- `css/style.css` — dark theme, custom cursor styles, tooltips, reveal/accordion styles.

Behavioral conventions used across the JS/CSS:

- Motion and cursor effects are always gated behind `(pointer: fine)` and `prefers-reduced-motion` media queries — keep new effects behind the same gates.
- Classes drive behavior: `.magnetic` / `.magnetic-card` opt elements into magnetic hover, `.reveal` opts them into scroll-triggered fade-in, `.tooltip` + `data-tip` renders a CSS tooltip.

## Known open items

- The contact form posts to `https://formspree.io/f/YOUR_FORM_ID` — a placeholder that must be replaced with a real Formspree form ID before the form works.
- `index.html` has `<meta name="robots" content="noindex, nofollow">`, which deliberately keeps the site out of search results (robots.txt itself is permissive). Don't remove the meta tag unless the owner asks to make the site indexable.
