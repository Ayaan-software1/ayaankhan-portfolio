// Content negotiation in edge/worker.js, against a fake GitHub Pages origin.
// Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handle, prefersMarkdown } from '../edge/worker.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const INDEX_HTML = read('index.html');
const INDEX_MD = read('index.html.md');
const NOT_FOUND_HTML = read('404.html');

// Mimics GitHub Pages: fixed files, 404.html for anything else, Vary: Accept-Encoding.
const fakeOrigin = (files = {
  '/': ['text/html; charset=utf-8', INDEX_HTML],
  '/index.html': ['text/html; charset=utf-8', INDEX_HTML],
  '/index.html.md': ['text/markdown; charset=utf-8', INDEX_MD],
  '/llms.txt': ['text/plain; charset=utf-8', read('llms.txt')],
}) => async (req) => {
  const file = files[new URL(req.url).pathname];
  const [type, body, status] = file ? [...file, 200] : ['text/html; charset=utf-8', NOT_FOUND_HTML, 404];
  return new Response(req.method === 'HEAD' ? null : body, {
    status,
    headers: { 'Content-Type': type, 'Vary': 'Accept-Encoding', 'Last-Modified': 'Mon, 12 Oct 2026 10:00:00 GMT' },
  });
};

const get = (path, accept, method = 'GET') =>
  handle(new Request(`https://ayaankhan.dev${path}`, { method, headers: accept ? { Accept: accept } : {} }), fakeOrigin());

test('prefersMarkdown only picks Markdown when explicitly asked', () => {
  assert.equal(prefersMarkdown('text/markdown'), true);
  assert.equal(prefersMarkdown('text/markdown, text/html;q=0.9'), true);
  assert.equal(prefersMarkdown('text/markdown, */*;q=0.1'), true);
  assert.equal(prefersMarkdown('text/x-markdown'), true);
  assert.equal(prefersMarkdown('TEXT/MARKDOWN; charset=utf-8'), true);
  assert.equal(prefersMarkdown('text/html, text/markdown;q=0.5'), false);
  assert.equal(prefersMarkdown('text/markdown;q=0'), false);
  assert.equal(prefersMarkdown('*/*'), false);
  assert.equal(prefersMarkdown('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'), false);
  assert.equal(prefersMarkdown(''), false);
  assert.equal(prefersMarkdown(null), false);
});

test('homepage with Accept: text/markdown returns the Markdown twin', async () => {
  for (const path of ['/', '/index.html']) {
    const res = await get(path, 'text/markdown');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'text/markdown; charset=utf-8');
    assert.equal(res.headers.get('Vary'), 'Accept');
    const body = await res.text();
    assert.equal(body, INDEX_MD);
    assert.ok(body.length > 0);
  }
});

test('homepage with Accept: text/html stays HTML and gains Vary: Accept', async () => {
  for (const accept of ['text/html', '*/*', undefined]) {
    const res = await get('/', accept);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
    assert.equal(res.headers.get('Vary'), 'Accept-Encoding, Accept');
    assert.equal(await res.text(), INDEX_HTML);
  }
});

test('missing path with Accept: text/markdown returns a Markdown 404', async () => {
  const res = await get('/__ora-404-probe-p3whyxr1', 'text/markdown');
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('Content-Type'), 'text/markdown; charset=utf-8');
  assert.equal(res.headers.get('Vary'), 'Accept');
  const body = await res.text();
  assert.ok(body.length >= 20);
  assert.match(body, /^# 404/);
  assert.ok(body.includes('`/__ora-404-probe-p3whyxr1`'));
  for (const link of ['/llms.txt', '/sitemap.xml', '/index.html.md']) {
    assert.ok(body.includes(`(https://ayaankhan.dev${link})`), `missing link to ${link}`);
  }
});

test('missing path for browsers keeps the HTML 404 page', async () => {
  const res = await get('/nope', 'text/html');
  assert.equal(res.status, 404);
  assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
  assert.equal(res.headers.get('Vary'), 'Accept-Encoding, Accept');
  assert.equal(await res.text(), NOT_FOUND_HTML);
});

test('HEAD requests negotiate headers without a body', async () => {
  const res = await get('/', 'text/markdown', 'HEAD');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'text/markdown; charset=utf-8');
  assert.equal(res.body, null);
});

test('non-negotiable files pass through untouched', async () => {
  const res = await get('/llms.txt', 'text/markdown');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'text/plain; charset=utf-8');
  assert.equal(res.headers.get('Vary'), 'Accept-Encoding');
});

test('falls back to HTML if the Markdown twin is missing on the origin', async () => {
  const origin = fakeOrigin({ '/': ['text/html; charset=utf-8', INDEX_HTML] });
  const res = await handle(new Request('https://ayaankhan.dev/', { headers: { Accept: 'text/markdown' } }), origin);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
});

test('non-GET methods are never rewritten', async () => {
  const res = await get('/', 'text/markdown', 'POST');
  assert.equal(res.headers.get('Content-Type'), 'text/html; charset=utf-8');
});
