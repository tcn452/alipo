import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import { test } from 'node:test';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const routePath = new URL('../src/app/stations/[id]/image/route.tsx', import.meta.url).pathname;
const source = ts.transpileModule(readFileSync(routePath, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

test('station OG route renders a real PNG for current fuel reports', async () => {
  const station = {
    name: 'Puma Energy Safari', district: 'Lilongwe', city: 'Lilongwe',
    petrol_status: 'available', diesel_status: 'out',
    petrol_reported_at: new Date().toISOString(), diesel_reported_at: new Date().toISOString(),
  };
  const route = new Module(routePath);
  route.filename = routePath;
  route.require = (id) => {
    if (id === '@/lib/shared-station-server') return { getSharedStation: async () => station };
    if (id === '@/lib/station-share') return require('../src/lib/station-share.ts');
    return require(id);
  };
  route._compile(source, routePath);
  const response = await route.exports.GET(new Request('https://www.alipo.co.mw/stations/test/image'), { params: { id: 'test' } });
  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(response.headers.get('content-type'), 'image/png');
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
});
