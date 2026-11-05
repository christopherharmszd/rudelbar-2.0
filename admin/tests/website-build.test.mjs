import test from 'node:test';
import assert from 'node:assert/strict';
import { requestWebsiteBuild } from '../lib/website-build.mjs';

test('publication requests only the production workflow and never puts credentials in the payload', async () => {
  const result = await requestWebsiteBuild({ RUDELBAR_GITHUB_WORKFLOW_TOKEN: 'local-test-token' }, async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/christopherharmszd/rudelbar-pages/actions/workflows/production.yml/dispatches');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer local-test-token');
    assert.deepEqual(JSON.parse(options.body), { ref: 'main' });
    return new Response(null, { status: 204 });
  });
  assert.deepEqual(result, { status: 'queued' });
});

test('a missing or temporarily unavailable build service keeps a successful CMS publication intact', async () => {
  assert.deepEqual(await requestWebsiteBuild({}, () => assert.fail('no credentials must make no request')), { status: 'scheduled' });
  assert.deepEqual(await requestWebsiteBuild({ RUDELBAR_GITHUB_WORKFLOW_TOKEN: 'local-test-token' }, async () => new Response(null, { status: 503 })), { status: 'scheduled' });
  assert.deepEqual(await requestWebsiteBuild({ RUDELBAR_GITHUB_WORKFLOW_TOKEN: 'local-test-token' }, async () => { throw new Error('offline'); }), { status: 'scheduled' });
});
