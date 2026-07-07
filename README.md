# ayaankhan.dev

Personal portfolio — static site, no build step. HTML/CSS/JS with Three.js and GSAP via CDN.

## Local preview

Just open `index.html` in a browser, or serve the folder:

```
python -m http.server 8000
```

## Before going live

1. **Formspree**: create a form at [formspree.io](https://formspree.io), then replace
   `YOUR_FORM_ID` in the `<form action=…>` in `index.html`.
2. The site ships with `<meta name="robots" content="noindex, nofollow">` — remove it
   if you ever want search engines to index the site.

## Deploy to GitHub Pages (custom domain ayaankhan.dev)

1. Create a GitHub repo and push this folder:
   ```
   git init
   git add .
   git commit -m "Portfolio v1"
   git branch -M main
   git remote add origin https://github.com/ayaan-software1/ayaankhan.dev.git
   git push -u origin main
   ```
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* → `main` / `/ (root)`.
3. The `CNAME` file (`ayaankhan.dev`) is already in the repo, so the custom domain
   field fills itself in. Tick **Enforce HTTPS** once the cert is issued.
4. At your DNS provider for `ayaankhan.dev`:
   - Apex `A` records → `185.199.108.153`, `185.199.109.153`,
     `185.199.110.153`, `185.199.111.153`
   - Optional `www` `CNAME` record → `ayaan-software1.github.io`

## Structure

```
index.html        one-page site (hero, about, timeline, projects, skills, contact)
css/style.css     dark theme, custom cursor, tooltips, reveal styles
js/main.js        cursor + magnetic hover, GSAP scroll reveals, accordions, form
js/hero3d.js      Three.js wireframe hero (desktop only; gradient fallback elsewhere)
favicon.svg       favicon
CNAME             custom domain for GitHub Pages
```
