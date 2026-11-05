import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker, { passwordVerifier } from '../worker.mjs';

const origin = 'https://redaktion.example';
const request = path => new Request(`${origin}${path}`);
const noindex = response => assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');

test('static editorial assets are excluded even when Cloudflare bypasses the Worker', async () => {
  const headers = await readFile(new URL('../public/_headers', import.meta.url), 'utf8');
  assert.match(headers, /^\/\*\s*\n(?:[ \t]+[^\n]+\n)*[ \t]+X-Robots-Tag: noindex, nofollow(?:\n|$)/);
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /<meta\s+name="robots"\s+content="noindex, nofollow"\s*\/?>/);
});

test('Worker asset responses preserve body, status and existing headers', async () => {
  const response = await worker.fetch(request('/backstage'), {
    ASSETS: { fetch: async () => new Response('<h1>Backstage</h1>', {
      status: 200,
      headers: { 'Content-Type': 'text/html', 'Content-Security-Policy': "default-src 'self'", 'Cache-Control': 'no-store' },
    }) },
  });
  noindex(response);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Content-Security-Policy'), "default-src 'self'");
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(await response.text(), '<h1>Backstage</h1>');
});

test('redirects retain their destination and both session cookies', async () => {
  const headers = new Headers({ Location: '/anmelden', 'Set-Cookie': 'first=one; HttpOnly' });
  headers.append('Set-Cookie', 'second=two; Secure');
  const response = await worker.fetch(request('/team'), {
    ASSETS: { fetch: async () => new Response(null, { status: 302, headers }) },
  });
  noindex(response);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('Location'), '/anmelden');
  assert.deepEqual(response.headers.getSetCookie(), ['first=one; HttpOnly', 'second=two; Secure']);
});

test('configuration errors and unauthorized API responses also carry noindex', async () => {
  const unconfigured = await worker.fetch(request('/api/session'), {});
  noindex(unconfigured);
  assert.equal(unconfigured.status, 503);
  const secret = 'local-test-secret-with-more-than-32-characters';
  const env = {
    SANITY_PROJECT_ID: 'localtest', SANITY_DATASET: 'staging', SANITY_EDITOR_TOKEN: 'local-test-only',
    RUDELBAR_SESSION_SECRET: secret,
    RUDELBAR_PASSWORD_VERIFIER: await passwordVerifier(secret, 'local-test-password'),
  };
  const unauthorized = await worker.fetch(request('/api/events'), env);
  noindex(unauthorized);
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get('Cache-Control'), 'no-store');
  assert.equal(typeof (await unauthorized.json()).error, 'string');
});

test('WebSocket upgrades pass through without reconstructing the response', async () => {
  const upgrade = { status: 101 };
  const response = await worker.fetch(request('/wall-feed'), { ASSETS: { fetch: async () => upgrade } });
  assert.equal(response, upgrade);
});
