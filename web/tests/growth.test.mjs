import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fuelShareLabel, stationShareUrl, stationShareCode, stationIdFromShareCode, trackedStationUrl, shareReportTime } from '../src/lib/station-share.ts';
import { trackEvent, trackFuelUpdate } from '../src/lib/gtag.ts';

test('fuel completion uses an explicit payload allowlist and queues before GA loads', () => {
  globalThis.window = {};
  trackFuelUpdate('completed', { station_id: 'station-1', fuel_type: 'petrol', method: 'one_tap', phone: '+265123456789', latitude: -13, error: 'private' });
  const event = Array.from(window.dataLayer[0]);
  assert.equal(event[1], 'fuel_update_completed');
  assert.equal(event[2].method, 'one_tap');
  assert.equal('phone' in event[2], false);
  assert.equal('latitude' in event[2], false);
  assert.equal('error' in event[2], false);
  delete globalThis.window;
  assert.doesNotThrow(() => trackEvent('server_render'));
});

test('WhatsApp links identify the station and preserve attribution', () => {
  const url = new URL(stationShareUrl('https://alipo.co.mw', 'osm-node-123'));
  assert.equal(url.toString(), 'https://alipo.co.mw/s/n123');
  assert.equal(stationIdFromShareCode('n123'), 'osm-node-123');
  const destination = new URL(trackedStationUrl(url.origin, stationIdFromShareCode('n123')));
  assert.equal(destination.pathname, '/stations/osm-node-123');
  assert.equal(destination.searchParams.get('utm_source'), 'whatsapp');
  assert.equal(destination.searchParams.get('utm_medium'), 'share');
  assert.equal(destination.searchParams.get('utm_campaign'), 'station_status');
});

test('short station IDs round-trip the full UUID without collisions or unsafe paths', () => {
  for (const id of ['91566731-f730-4c92-a34d-407dc5d20e97', '00000000-0000-0000-0000-000000000000', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'osm-way-123', 'osm-relation-999']) {
    const code = stationShareCode(id);
    assert.equal(stationIdFromShareCode(code), id);
    assert.equal(new URL(stationShareUrl('https://alipo.co.mw', id)).search, '');
  }
  assert.equal(stationShareCode('https://evil.example'), null);
  for (const code of ['../bad', 'https://evil.example', 'n123/bad', 'bad', '_____________________x']) assert.equal(stationIdFromShareCode(code), null);
  assert.ok(stationShareUrl('https://alipo.co.mw', '91566731-f730-4c92-a34d-407dc5d20e97').length < 50);
});

test('share cards never present expired or missing reports as fresh fuel', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');
  const station = { petrol_status: 'available', petrol_reported_at: '2026-10-04T11:30:00Z' };
  assert.equal(fuelShareLabel(station, 'petrol', now), 'Fuel available');
  assert.equal(fuelShareLabel({ ...station, petrol_reported_at: '2026-10-04T08:00:00Z' }, 'petrol', now), 'Stale — check before travelling');
  assert.equal(fuelShareLabel({ ...station, petrol_reported_at: 'invalid' }, 'petrol', now), 'Stale — check before travelling');
  assert.equal(fuelShareLabel({ ...station, petrol_reported_at: undefined }, 'petrol', now), 'Unknown');
  assert.equal(fuelShareLabel({ ...station, petrol_status: 'out' }, 'petrol', now), 'Out of fuel');
});

test('shared report times use readable elapsed time and an unambiguous CAT date', () => {
  const now = Date.parse('2026-10-04T18:30:00Z');
  assert.equal(shareReportTime('2026-10-04T17:30:00Z', now), 'Reported 1 hour ago · 4 Oct 2026, 7:30 PM CAT');
  assert.match(shareReportTime('2026-10-04T18:25:00Z', now), /^Reported 5 minutes ago/);
  assert.match(shareReportTime('2026-10-04T18:29:30Z', now), /^Reported just now/);
  assert.equal(shareReportTime('2026-10-03T18:30:00Z', now), 'Reported 1 day ago · 3 Oct 2026, 8:30 PM CAT');
  assert.equal(shareReportTime(), 'No recent report');
  assert.equal(shareReportTime('invalid', now), 'No recent report');
  assert.doesNotMatch(shareReportTime('2026-10-04T18:31:00Z', now), /ago/);
});
