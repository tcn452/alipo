import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldResumeLocation, parseLocationPreferences, requestCurrentPosition, watchUserPosition, LOCATION_CONSENT_KEY } from '../src/lib/geolocation.ts';
test('granted permission resumes on every PWA reopen', () => assert.equal(shouldResumeLocation('granted', false), true));
test('unsupported permission queries resume only after a successful allowance', () => {
  assert.equal(shouldResumeLocation('unknown', true), true);
  assert.equal(shouldResumeLocation('unknown', false), false);
});
test('stored consent never overrides revoked or prompt permissions', () => {
  assert.equal(shouldResumeLocation('denied', true), false);
  assert.equal(shouldResumeLocation('prompt', true), false);
});
test('area and radius survive reopen without storing precise coordinates', () => {
  assert.deepEqual(parseLocationPreferences(JSON.stringify({ city: 'My Location', radius: 20, latitude: -15, longitude: 35 })), { city: 'My Location', radius: 20 });
  assert.deepEqual(parseLocationPreferences(JSON.stringify({ city: 'Blantyre', radius: 10 })), { city: 'Blantyre', radius: 10 });
  for (const raw of [null, 'broken', '{}', '{"city":"Unknown","radius":5}', '{"city":"Blantyre","radius":-1}']) assert.equal(parseLocationPreferences(raw), null);
});
test('GPS allowance from any page and the continuous watch is remembered', () => {
  const stored = new Map();
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const position = { coords: { latitude: -15, longitude: 35, accuracy: 10 } };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem: (key, value) => stored.set(key, value) } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Chrome', geolocation: {
    getCurrentPosition: (success) => success(position), watchPosition: (success) => { success(position); return 1; },
  } } });
  try {
    let received = 0;
    requestCurrentPosition(() => { received++; }, () => assert.fail('unexpected failure'));
    assert.equal(stored.get(LOCATION_CONSENT_KEY), 'true');
    stored.clear();
    watchUserPosition(() => { received++; }, () => assert.fail('unexpected failure'));
    assert.equal(stored.get(LOCATION_CONSENT_KEY), 'true');
    assert.equal(received, 2);
  } finally {
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator); else delete globalThis.navigator;
    if (oldStorage) Object.defineProperty(globalThis, 'localStorage', oldStorage); else delete globalThis.localStorage;
  }
});
