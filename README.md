# ayaankhan.dev

Personal portfolio — static site, no build step. HTML/CSS/JS with Three.js and GSAP via CDN.

## Local preview

Just open `index.html` in a browser, or serve the folder:

```
python -m http.server 8000
```

## Notes

- The contact form posts to Formspree (form ID already configured in `index.html`).
- The site is indexable (`<meta name="robots" content="index, follow">`); robots.txt
  is permissive too.

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
js/hero-text.js   particle text effect on the hero name (desktop only)
js/hero3d.js      Three.js wireframe hero (desktop only; gradient fallback elsewhere)
img/              project thumbnails (16:9 screenshots)
favicon.svg       favicon
CNAME             custom domain for GitHub Pages
index.html.md     Markdown version of the homepage, for AI agents
llms.txt          agent guide (llmstxt.org), incl. when to use this site
sitemap.xml       sitemap (bump <lastmod> with the JSON-LD dateModified)
404.html          not-found page
.nojekyll         serve files raw (keeps .md as text/markdown)
edge/             optional Cloudflare Worker: Accept: text/markdown negotiation
tests/            node --test
```

## Markdown content negotiation (optional, needs Cloudflare)

GitHub Pages can't vary responses by `Accept` header. To serve Markdown to agents
that send `Accept: text/markdown` (and Markdown 404s), put the domain behind
Cloudflare and deploy the worker:

1. Add `ayaankhan.dev` as a Cloudflare zone and switch the domain's nameservers to it.
2. Recreate the four GitHub Pages `A` records there, **proxied** (orange cloud).
   SSL/TLS mode: *Full*.
3. `cd edge && npx wrangler deploy`
4. Check: `curl -sS -i -H 'Accept: text/markdown' https://ayaankhan.dev/` returns
   `Content-Type: text/markdown` and `Vary: Accept`.
