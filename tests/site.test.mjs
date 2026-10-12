// Static checks for the machine-readable files. Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const html = read('index.html');

const SITE = 'https://ayaankhan.dev';

// Every same-site URL must point at a real file, or at an id on the homepage.
function assertResolves(url, where) {
  const { pathname, hash } = new URL(url, SITE);
  const file = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  assert.ok(existsSync(join(root, file)), `${where}: ${url} has no file ${file}`);
  if (hash && file === 'index.html') {
    assert.match(html, new RegExp(`id="${hash.slice(1)}"`), `${where}: ${url} anchor missing`);
  }
}

function jsonLd() {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'no JSON-LD block in index.html');
  return JSON.parse(m[1]);
}

test('JSON-LD describes the site owner as a Person', () => {
  const data = jsonLd();
  assert.equal(data['@context'], 'https://schema.org');
  const person = data['@graph'].find((n) => n['@type'] === 'Person');
  assert.ok(person, 'Person node missing');
  assert.equal(person.name, 'Ayaan Khan');
  assert.equal(person.url, `${SITE}/`);
  assert.ok(person.description.length > 20);
  assert.ok(person.sameAs.includes('https://github.com/ayaan-software1'));
  assertResolves(person.image, 'JSON-LD image');
});

test('JSON-LD carries contactPoint and PostalAddress', () => {
  const person = jsonLd()['@graph'].find((n) => n['@type'] === 'Person');
  assert.equal(person.contactPoint['@type'], 'ContactPoint');
  assert.ok(person.contactPoint.contactType);
  assert.match(person.contactPoint.email, /^[^@\s]+@[^@\s]+$/);
  assert.ok(html.includes(`mailto:${person.contactPoint.email}`), 'contact email must match the visible one');
  assert.equal(person.address['@type'], 'PostalAddress');
  assert.equal(person.address.addressCountry, 'CH');
  assert.ok(person.address.addressLocality);
});

test('JSON-LD @id references all resolve within the graph', () => {
  const graph = jsonLd()['@graph'];
  const ids = new Set(graph.map((n) => n['@id']));
  const refs = JSON.stringify(graph).matchAll(/\{"@id":"([^"]+)"\}/g);
  for (const [, id] of refs) assert.ok(ids.has(id), `dangling @id ${id}`);
});

test('head links to the Markdown twin and sitemap', () => {
  assert.match(html, /<link rel="alternate" type="text\/markdown" href="https:\/\/ayaankhan\.dev\/index\.html\.md">/);
  assert.match(html, /<meta name="robots" content="index, follow">/);
  assertResolves('/index.html.md', 'alternate link');
});

test('sitemap.xml is a valid urlset whose lastmod matches the page', () => {
  const xml = read('sitemap.xml');
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
  assert.deepEqual(locs, [`${SITE}/`]);
  assert.equal(lastmods.length, locs.length);
  for (const d of lastmods) assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
  const page = jsonLd()['@graph'].find((n) => n['@type'] === 'ProfilePage');
  assert.equal(page.dateModified, lastmods[0], 'bump sitemap lastmod and ProfilePage dateModified together');
});

test('robots.txt allows crawling and advertises the sitemap', () => {
  const robots = read('robots.txt');
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Allow: \/$/m);
  assert.match(robots, /^Sitemap: https:\/\/ayaankhan\.dev\/sitemap\.xml$/m);
  assert.doesNotMatch(robots, /^Disallow: \/$/m);
});

test('llms.txt follows the llmstxt.org structure', () => {
  const lines = read('llms.txt').split('\n');
  assert.match(lines[0], /^# \S/, 'must open with an H1');
  const firstContent = lines.slice(1).find((l) => l.trim());
  assert.match(firstContent, /^> \S/, 'H1 must be followed by a blockquote summary');
  // Before the first H2: no further headings. After it: H2 sections of link lists.
  const firstH2 = lines.findIndex((l) => l.startsWith('## '));
  assert.ok(firstH2 > 0);
  for (const l of lines.slice(1, firstH2)) assert.doesNotMatch(l, /^#/);
  for (const l of lines.slice(firstH2)) {
    if (!l.trim() || l.startsWith('## ')) continue;
    const m = l.match(/^- \[([^\]]+)\]\(([^)]+)\)(: .+)?$/);
    assert.ok(m, `not a file-list item: ${l}`);
    if (m[2].startsWith(SITE)) assertResolves(m[2], 'llms.txt');
  }
});

test('llms.txt has specific when-to-use guidance', () => {
  const txt = read('llms.txt');
  const section = txt.split(/^## /m).find((s) => s.startsWith('When to use'));
  assert.ok(section, 'missing "When to use" section');
  const items = section.split('\n').filter((l) => l.startsWith('- '));
  assert.ok(items.length >= 3);
  for (const item of items) assert.match(item, /: Use when /, `item lacks when-to-use guidance: ${item}`);
});

test('index.html.md mirrors the homepage content', () => {
  const md = read('index.html.md');
  assert.match(md, /^# Ayaan Khan\n/);
  const sections = [...html.matchAll(/<h2 class="section__title[^"]*"><span[^>]*>\d+<\/span>([^<]+)<\/h2>/g)].map((m) => m[1]);
  assert.equal(sections.length, 5);
  for (const s of sections) assert.ok(md.includes(`\n## ${s}\n`), `Markdown missing section ${s}`);
  const projects = [...html.matchAll(/<h3 class="project__title">([^<]+)<\/h3>/g)].map((m) => m[1]);
  assert.equal(projects.length, 4);
  for (const p of projects) assert.ok(md.includes(`\n### ${p}\n`), `Markdown missing project ${p}`);
  for (const [, url] of md.matchAll(/\]\((https:\/\/ayaankhan\.dev[^)]*)\)|<(https:\/\/ayaankhan\.dev[^>]*)>/g)) {
    if (url) assertResolves(url, 'index.html.md');
  }
});

test('404.html is noindex, root-absolute, and points agents to the docs', () => {
  const page = read('404.html');
  assert.match(page, /<meta name="robots" content="noindex">/);
  for (const href of ['/llms.txt', '/sitemap.xml', '/index.html.md', '/']) {
    assert.ok(page.includes(`href="${href}"`), `404 missing link to ${href}`);
  }
  // Served at arbitrary depths, so no relative asset URLs.
  for (const [, url] of page.matchAll(/(?:href|src)="([^"]+)"/g)) {
    assert.match(url, /^(\/|https:\/\/|#)/, `relative URL in 404.html: ${url}`);
    if (url.startsWith('/')) assertResolves(url.split('?')[0], '404.html');
  }
});

test('.nojekyll keeps GitHub Pages serving the .md files raw', () => {
  assert.ok(existsSync(join(root, '.nojekyll')));
});
