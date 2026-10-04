import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
import { trackAreaShare } from '../src/lib/gtag.ts';
const require = createRequire(import.meta.url);
function compile(path, aliases = {}) {
  const filename = new URL(path, import.meta.url).pathname;
  const module = new Module(filename);
  module.filename = filename;
  module.require = (id) => aliases[id] || require(id);
  module._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
  return module.exports;
}
const helpers = compile('../src/lib/area-share.ts', { './station-share': require('../src/lib/station-share.ts') });
const now = Date.parse('2026-10-04T18:00:00Z');
const fresh = '2026-10-04T17:30:00Z';
function station(id, changes = {}) { return { id, name: `Station ${id}`, city: 'Lilongwe', district: 'Lilongwe', latitude: -13.9626, longitude: 33.7741, fuel_types: ['petrol','diesel'], petrol_status: 'available', diesel_status: 'out', petrol_reported_at: fresh, diesel_reported_at: fresh, ...changes }; }

test('area fuel reports never mix petrol and diesel or count stale reports as fresh', () => {
  const report = helpers.buildAreaReport([
    station('fresh'), station('stale', { diesel_status: 'available', diesel_reported_at: '2026-10-04T13:00:00Z' }),
    station('diesel', { diesel_status: 'low' }), station('unknown', { diesel_reported_at: undefined }),
    station('petrol-only', { fuel_types: ['petrol'] }), station('south', { city: 'Blantyre', district: 'Blantyre', latitude: -15.78, longitude: 35 }),
  ], 'lilongwe', 'diesel', now);
  assert.equal(report.total, 4); assert.equal(report.available, 1); assert.equal(report.out, 1); assert.equal(report.stale, 1); assert.equal(report.unknown, 1);
  assert.equal(report.stations[0].id, 'diesel'); assert.equal(report.stations[2].id, 'stale');
  assert.equal(helpers.areaFuelState(station('future', { diesel_status: 'available', diesel_reported_at: '2026-10-05T17:00:00Z' }), 'diesel', now), 'stale');
});
test('regional reports use named districts and nearby public city centres, never guess unknown locations', () => {
  assert.equal(helpers.stationInShareArea(station('north', { city: 'Rumphi', district: 'Rumphi', latitude: -10.9, longitude: 33.8 }), 'northern'), true);
  assert.equal(helpers.stationInShareArea(station('south', { city: 'Zomba', district: 'Zomba', latitude: -15.3833, longitude: 35.3333 }), 'central'), false);
  assert.equal(helpers.stationInShareArea(station('generic', { city: 'Malawi', district: 'Malawi' }), 'central'), true);
  assert.equal(helpers.stationInShareArea(station('unknown', { city: 'Malawi', district: 'Malawi', latitude: 0, longitude: 0 }), 'central'), false);
  assert.equal(helpers.stationInShareArea(station('boundary', { city: 'Nkhata Bay', district: 'Nkhata Bay', latitude: -11.6, longitude: 34.3 }), 'northern'), true);
});
test('short area links restore fuel and area with WhatsApp attribution', () => {
  assert.equal(helpers.areaShareUrl('https://alipo.co.mw', 'central', 'diesel'), 'https://alipo.co.mw/r/central/diesel');
  const route = compile('../src/app/r/[area]/[fuel]/route.ts', { '@/lib/area-share': helpers });
  const response = route.GET(new Request('https://alipo.co.mw/r/central/diesel'), { params: { area: 'central', fuel: 'diesel' } });
  const url = new URL(response.headers.get('location'));
  assert.equal(response.status, 307); assert.equal(url.pathname, '/a/central/diesel');
  assert.equal(url.searchParams.get('utm_source'), 'whatsapp'); assert.equal(url.searchParams.get('utm_campaign'), 'area_report');
  assert.equal(route.GET(new Request('https://alipo.co.mw/r/bad/fuel'), { params: { area: 'bad', fuel: 'fuel' } }).status, 404);
  assert.throws(() => helpers.areaShareUrl('https://alipo.co.mw', '../bad', 'diesel'));
});
test('area shares distinguish scope without sending coordinates or personal data', () => {
  globalThis.window = {};
  trackAreaShare('whatsapp', 'central', 'diesel');
  const payload = Array.from(window.dataLayer[0]);
  assert.equal(payload[1], 'share');
  assert.deepEqual(payload[2], { method: 'whatsapp', content_type: 'area_status', item_id: 'central:diesel', area_id: 'central', fuel_type: 'diesel' });
  delete globalThis.window;
});
test('regional OG image renders a real PNG with available, out, stale and empty states', async () => {
  let report = helpers.buildAreaReport(Array.from({length:6}, (_,i)=>station(String(i), { diesel_status: i%2 ? 'available' : 'out', diesel_reported_at: i===3 ? '2026-10-04T12:00:00Z' : fresh })), 'central', 'diesel', now);
  const route = compile('../src/app/a/[area]/[fuel]/image/route.tsx', { '@/lib/area-share': helpers, '@/lib/area-report-server': { getAreaReport: async () => report }, '@/lib/station-share': require('../src/lib/station-share.ts') });
  for (const rows of [report.stations, []]) {
    report = helpers.buildAreaReport(rows, 'central', 'diesel', now);
    const response = await route.GET(new Request('https://alipo.co.mw/a/central/diesel/image'), { params: { area: 'central', fuel: 'diesel' } });
    const png = Buffer.from(await response.arrayBuffer());
    assert.deepEqual([...png.subarray(0,8)], [137,80,78,71,13,10,26,10]);
    assert.equal(png.readUInt32BE(16),1200); assert.equal(png.readUInt32BE(20),630);
  }
});
