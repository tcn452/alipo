import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesStationFilters, REPORT_FRESHNESS_MS } from '../src/lib/station-filters.ts';

const now = Date.parse('2026-09-23T12:00:00Z');
const recent = new Date(now - 60_000).toISOString();
const older = new Date(now - REPORT_FRESHNESS_MS).toISOString();
const station = {
  name: 'Example station', brand: 'Example', city: 'Lilongwe', district: 'Central',
  fuel_types: ['petrol', 'diesel'], petrol_status: 'available', petrol_reported_at: recent,
  diesel_status: 'out', diesel_reported_at: recent,
};
const match = (changes = {}, fuel = 'all', status = 'has-fuel', freshness = 'all', search = '') =>
  matchesStationFilters({ ...station, ...changes }, fuel, { status, freshness }, search, now);

test('petrol availability never satisfies a diesel search', () => {
  assert.equal(match({}, 'diesel'), false);
  assert.equal(match({}, 'petrol'), true);
  assert.equal(match(), true);
});
test('has fuel includes low supply but requires a dated recent report', () => {
  assert.equal(match({ diesel_status: 'low' }, 'diesel'), true);
  assert.equal(match({ petrol_reported_at: older }), false);
  assert.equal(match({ petrol_reported_at: undefined }), false);
  assert.equal(match({ petrol_is_stale: true }), false);
  assert.equal(match({ petrol_reported_at: 'invalid' }), false);
});
test('status and freshness must match the same fuel', () => {
  assert.equal(match({ petrol_reported_at: older }, 'all', 'available', 'recent'), false);
  assert.equal(match({ petrol_reported_at: older }, 'all', 'available', 'older'), true);
});
test('unreported stations stay visible by default, not in recent or older reports', () => {
  const unknown = { petrol_status: 'unknown', petrol_reported_at: undefined, diesel_status: 'unknown', diesel_reported_at: undefined };
  assert.equal(match(unknown, 'all', 'all'), true);
  assert.equal(match(unknown, 'all', 'all', 'recent'), false);
  assert.equal(match(unknown, 'all', 'all', 'older'), false);
});
test('fresh reports age out at four hours even without a new fetch', () => {
  const filters = { status: 'has-fuel', freshness: 'all' };
  assert.equal(matchesStationFilters(station, 'petrol', filters, '', now), true);
  assert.equal(matchesStationFilters(station, 'petrol', filters, '', now + REPORT_FRESHNESS_MS), false);
});
test('fuel support and trimmed city/name search constrain results', () => {
  assert.equal(match({ fuel_types: ['petrol'] }, 'diesel', 'all'), false);
  assert.equal(match({}, 'all', 'all', 'all', '  LILONGWE  '), true);
  assert.equal(match({}, 'all', 'all', 'all', 'Blantyre'), false);
});
