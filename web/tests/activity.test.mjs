import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';
const path = new URL('../src/app/api/activity/route.ts', import.meta.url).pathname;
const source = ts.transpileModule(readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function load(client) {
  const route = new Module(path);
  route.require = () => ({ createSupabaseAdminClient: () => client });
  route._compile(source, path);
  return route.exports.GET;
}
test('activity counts the rolling day without exposing reports or excluding expired submissions', async () => {
  const calls = [];
  const query = {
    select(...args) { calls.push(['select', ...args]); return this; },
    gte(...args) { calls.push(['gte', ...args]); return this; },
    lte(...args) { calls.push(['lte', ...args]); return Promise.resolve({ count: 1234, error: null }); },
  };
  const response = await load({ from(table) { assert.equal(table, 'fuel_reports'); return query; } })();
  const data = await response.json();
  assert.equal(data.reportsLast24Hours, 1234);
  assert.deepEqual(calls[0], ['select', 'id', { count: 'exact', head: true }]);
  assert.equal(Date.parse(calls[2][2]) - Date.parse(calls[1][2]), 86_400_000);
  assert.equal(calls[2][2], data.asOf);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(Object.keys(data).sort(), ['asOf', 'reportsLast24Hours']);
});
test('activity distinguishes zero reports from unavailable data', async () => {
  for (const [result, status] of [[{ count: 0, error: null }, 200], [{ count: null, error: {} }, 502]]) {
    const query = { select() { return this; }, gte() { return this; }, lte() { return Promise.resolve(result); } };
    const response = await load({ from() { return query; } })();
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.reportsLast24Hours, status === 200 ? 0 : undefined);
  }
  assert.equal((await load(null)()).status, 503);
});
