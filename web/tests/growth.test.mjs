import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fuelShareLabel, stationShareUrl } from '../src/lib/station-share.ts';
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
  assert.equal(url.pathname, '/stations/osm-node-123');
  assert.equal(url.searchParams.get('utm_source'), 'whatsapp');
  assert.equal(url.searchParams.get('utm_medium'), 'share');
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
