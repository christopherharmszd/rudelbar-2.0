import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { imageUrl, imageDescription } from '../src/images.js';
import { contentSlug, matchContent, legacyPath, postPath } from '../src/site.js';
import { pageMetadata } from '../src/seo.js';
import { todayLocal } from '../src/content.js';

const production = process.env.RUDELBAR_BUILD_TARGET === 'production';
const out = path => new URL(`../dist/${production ? 'production' : 'client'}/${path}`, import.meta.url);
const origin = production ? 'https://rudelbar.de/' : 'https://christopherharmszd.github.io/rudelbar-2.0/';
const fixture = { _id: 'example-id', slug: 'ein-fester-link-example-id', title: 'Ein neuer Titel', date: '2026-10-02', teaser: 'Ein Dorfabend.', body: 'Der Beitrag.' };

test('public routes contain readable HTML, unique metadata and the correct indexing policy', async () => {
  const titles = new Set();
  for (const route of ['', 'termine/', 'das-rudel/', 'dein-event/', 'kontakt/', 'datenschutz/', 'impressum/']) {
    const html = await readFile(out(`${route}index.html`), 'utf8');
    assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, route);
    assert.ok(html.includes('Direkt zum Inhalt'));
    assert.match(html, /<meta name="description" content="[^"]+/);
    assert.ok(html.includes(`<link rel="canonical" href="${origin}${route}">`));
    assert.match(html, production ? /name="robots" content="index, follow"/ : /name="robots" content="noindex, follow"/);
    assert.ok(!html.includes('RUDELBAR_GITHUB_WORKFLOW_TOKEN'));
    const title = html.match(/<title>(.*?)<\/title>/s)[1];
    assert.ok(!titles.has(title)); titles.add(title);
  }
});

test('sitemap lists real pages and excludes internal and hash addresses', async () => {
  const sitemap = await readFile(out('sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes(`<loc>${origin}termine/</loc>`));
  assert.doesNotMatch(sitemap, /redaktion|backstage|#\/|drafts\./);
  const robots = await readFile(out('robots.txt'), 'utf8');
  assert.ok(robots.includes(`Sitemap: ${origin}sitemap.xml`));
  assert.doesNotMatch(robots, /Disallow:\s*\//);
  const missing = await readFile(out('404.html'), 'utf8');
  assert.match(missing, /name="robots" content="noindex, follow"/);
  assert.ok(missing.includes('Kontakt aufnehmen'));
});

test('published articles are rendered and empty news stays absent', async () => {
  const manifest = JSON.parse(await readFile(out('site-manifest.json'), 'utf8'));
  const index = await readFile(out('index.html'), 'utf8');
  const stories = manifest.pages.filter(path => path.startsWith('aktuelles/') && path !== 'aktuelles/');
  assert.equal(index.includes('>Aktuelles</a>'), stories.length > 0);
  for (const path of stories) {
    const html = await readFile(out(`${path}index.html`), 'utf8');
    assert.match(html, /"@type":"Article"/);
    assert.match(html, /property="og:type" content="article"/);
    assert.match(html, /class="post-body"/);
  }
});

test('stable article slugs and legacy links survive title edits', () => {
  assert.equal(contentSlug(fixture), fixture.slug);
  assert.equal(matchContent([fixture], fixture._id), fixture);
  assert.equal(matchContent([fixture], 'alter-titel-example-id'), fixture);
  assert.equal(legacyPath('#/aktuelles/example-id', { posts: [fixture] }), postPath(fixture));
  assert.equal(legacyPath('#/unbekannt', {}), null);
});

test('responsive Sanity URLs preserve the source and supply a smaller variant', () => {
  const source = 'https://cdn.sanity.io/images/project/production/abc-1600x900.png';
  const result = new URL(imageUrl(source, 640));
  assert.equal(result.pathname, new URL(source).pathname);
  assert.equal(result.searchParams.get('w'), '640');
  assert.equal(result.searchParams.get('auto'), 'format');
  assert.equal(imageUrl('https://example.com/image.png', 640), 'https://example.com/image.png');
  assert.equal(imageDescription({ alt: fixture.teaser, caption: 'Der Wagen auf dem Dorfplatz' }, fixture, 1), 'Der Wagen auf dem Dorfplatz');
});

test('structured events use the visible time with the Berlin daylight-saving offset', () => {
  const event = { _id: 'event-id', title: 'Rudel Abend', date: '2026-10-02', time: 'ab 18 Uhr', venue: 'Dorfplatz', address: 'Scharnebeck' };
  const metadata = pageMetadata({ page: 'termin', key: event._id }, { events: [event], posts: [] }, '/termine/event-id/');
  const schema = metadata.jsonld['@graph'].find(item => item['@type'] === 'Event');
  assert.equal(schema.startDate, '2026-10-02T18:00:00+02:00');
  assert.equal(schema.location.name, 'Dorfplatz');
  assert.equal(schema.offers, undefined);
  assert.equal(todayLocal(new Date('2026-11-05T23:30:00Z')), '2026-11-06');
});
