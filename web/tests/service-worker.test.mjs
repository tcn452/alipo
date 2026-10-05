import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function worker() {
  const handlers = {};
  const entries = new Map();
  let requests = 0;
  let offline = false;
  runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
    URL, Response,
    self: { location: { origin: 'https://alipo.test' }, addEventListener: (name, handler) => { handlers[name] = handler; } },
    caches: { open: async () => ({ match: async (request) => entries.get(request.url || request), put: async (request, response) => entries.set(request.url, response) }) },
    fetch: async () => { requests++; if (offline) throw new Error('offline'); return new Response('asset'); },
  });
  return {
    get requests() { return requests; },
    goOffline() { offline = true; },
    request(path, mode = 'cors') {
      let response;
      handlers.fetch({ request: { method: 'GET', url: new URL(path, 'https://alipo.test').href, mode }, respondWith: (promise) => { response = promise; } });
      return response;
    },
  };
}

test('repeat build assets are served offline without another CDN request', async () => {
  const sw = worker();
  assert.equal(await (await sw.request('/_next/static/chunks/abc.js')).text(), 'asset');
  sw.goOffline();
  assert.equal(await (await sw.request('/_next/static/chunks/abc.js')).text(), 'asset');
  assert.equal(sw.requests, 1);
});

test('APIs, private pages, RSC responses, and external assets bypass the cache', () => {
  const sw = worker();
  for (const [path, mode] of [['/api/stations/status', 'cors'], ['/dashboard', 'navigate'], ['/?_rsc=abc', 'cors'], ['https://tiles.openfreemap.org/style.json', 'cors']]) {
    assert.equal(sw.request(path, mode), undefined);
  }
  assert.equal(sw.requests, 0);
});

test('public navigation stays fresh and has an offline fallback', async () => {
  const sw = worker();
  await sw.request('/', 'navigate');
  await sw.request('/', 'navigate');
  assert.equal(sw.requests, 2);
  sw.goOffline();
  assert.equal(await (await sw.request('/', 'navigate')).text(), 'asset');
});
