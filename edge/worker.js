// Cloudflare Worker in front of the GitHub Pages origin. Pages can't vary a
// response by Accept header, so this adds Markdown content negotiation:
//
//   Accept: text/markdown  →  homepage as Markdown (index.html.md), 404s as a
//                             Markdown error body; Content-Type text/markdown
//   anything else          →  the origin's response untouched, plus Vary: Accept
//
// Only active once ayaankhan.dev is proxied through Cloudflare (see README).
// Tests: node --test (tests/worker.test.mjs).

const ORIGIN = 'https://ayaankhan.dev';

// Paths with a static Markdown twin on the origin.
const MARKDOWN_TWINS = {
  '/': '/index.html.md',
  '/index.html': '/index.html.md',
};

const MARKDOWN_TYPES = ['text/markdown', 'text/x-markdown'];
const HTML_TYPES = ['text/html', 'application/xhtml+xml'];

// True when the client explicitly asks for Markdown at least as strongly as
// for HTML. Wildcards alone (browsers, curl's */*) never select Markdown.
export function prefersMarkdown(accept) {
  if (!accept) return false;
  let md = 0;
  let html = -1;
  let wildcard = 0;
  for (const part of accept.split(',')) {
    const [rawType, ...params] = part.split(';');
    const type = rawType.trim().toLowerCase();
    let q = 1;
    for (const param of params) {
      const [key, value] = param.split('=').map((s) => s.trim().toLowerCase());
      if (key === 'q') q = Number.isNaN(parseFloat(value)) ? 0 : parseFloat(value);
    }
    if (MARKDOWN_TYPES.includes(type)) md = Math.max(md, q);
    else if (HTML_TYPES.includes(type)) html = Math.max(html, q);
    else if (type === '*/*' || type === 'text/*') wildcard = Math.max(wildcard, q);
  }
  if (html < 0) html = wildcard;
  return md > 0 && md >= html;
}

function addVary(headers, value) {
  const current = headers.get('Vary');
  if (!current) return headers.set('Vary', value);
  const parts = current.split(',').map((s) => s.trim().toLowerCase());
  if (!parts.includes(value.toLowerCase())) headers.set('Vary', `${current}, ${value}`);
}

function markdownResponse(body, status, method, extraHeaders = {}) {
  const headers = new Headers({
    'Content-Type': 'text/markdown; charset=utf-8',
    'Vary': 'Accept',
    'Cache-Control': 'max-age=600',
    ...extraHeaders,
  });
  return new Response(method === 'HEAD' ? null : body, { status, headers });
}

export function notFoundMarkdown(pathname) {
  return `# 404: Page not found

There is no page at \`${pathname}\` on ayaankhan.dev. This site is a single page, so everything lives on the homepage.

- [Homepage as Markdown](${ORIGIN}/index.html.md): Ayaan Khan's profile, projects, skills and contact
- [llms.txt](${ORIGIN}/llms.txt): guidance for AI agents on when and how to use this site
- [Sitemap](${ORIGIN}/sitemap.xml): every indexable URL
- [Homepage](${ORIGIN}/): the HTML version
`;
}

export async function handle(request, fetchOrigin = fetch) {
  const url = new URL(request.url);
  const readable = request.method === 'GET' || request.method === 'HEAD';
  const wantsMarkdown = readable && prefersMarkdown(request.headers.get('Accept'));

  const twin = MARKDOWN_TWINS[url.pathname];
  if (wantsMarkdown && twin) {
    const res = await fetchOrigin(new Request(new URL(twin, url), { method: 'GET' }));
    if (res.ok) {
      const lastModified = res.headers.get('Last-Modified');
      return markdownResponse(await res.text(), 200, request.method,
        lastModified ? { 'Last-Modified': lastModified } : {});
    }
    // Twin missing: fall through to the origin's HTML rather than failing.
  }

  const res = await fetchOrigin(request);
  if (wantsMarkdown && res.status === 404) {
    return markdownResponse(notFoundMarkdown(url.pathname), 404, request.method);
  }

  // Negotiable resources (the HTML pages and the 404 page) must tell caches
  // that the representation depends on Accept.
  const type = res.headers.get('Content-Type') || '';
  if (twin || res.status === 404 || type.startsWith('text/html')) {
    const out = new Response(res.body, res);
    addVary(out.headers, 'Accept');
    return out;
  }
  return res;
}

export default {
  fetch(request) {
    return handle(request);
  },
};
