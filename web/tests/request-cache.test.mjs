import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequestCache } from '../src/lib/request-cache.ts';

test('catalogue is reused until expiry and concurrent requests share a load', async () => {
  let now = 0;
  let calls = 0;
  const cache = createRequestCache(() => now);
  const load = async () => ++calls;
  assert.deepEqual(await Promise.all([cache.get('catalogue', 300_000, load), cache.get('catalogue', 300_000, load)]), [1, 1]);
  now = 299_999;
  assert.equal(await cache.get('catalogue', 300_000, load), 1);
  now = 300_000;
  assert.equal(await cache.get('catalogue', 300_000, load), 2);
});

test('live status is never retained after completion and failures can retry', async () => {
  const cache = createRequestCache();
  let calls = 0;
  const load = async () => ++calls;
  assert.equal(await cache.get('status', 0, load), 1);
  assert.equal(await cache.get('status', 0, load), 2);
  await assert.rejects(cache.get('catalogue', 300_000, async () => { throw new Error('offline'); }));
  assert.equal(await cache.get('catalogue', 300_000, load), 3);
});
