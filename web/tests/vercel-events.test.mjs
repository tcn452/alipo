import test from 'node:test';
import assert from 'node:assert/strict';
import { trackEvent, trackFuelUpdate, trackSponsorClick, trackSponsorImpression, trackPwaInstall, trackShare } from '../src/lib/gtag.ts';

function capture() {
  const vercel = [], ga = [];
  globalThis.window = { va: (...args) => vercel.push(args), gtag: (...args) => ga.push(args) };
  return { vercel, ga };
}

test('fuel updates reach Vercel and GA with stages and queue estimates', () => {
  const { vercel, ga } = capture();
  try {
    for (const stage of ['started', 'completed', 'failed']) trackFuelUpdate(stage, { station_id: 'station', fuel_type: 'diesel', queue_estimate: 'long', phone: 'private', latitude: -13 });
    assert.deepEqual(vercel.map((event) => event[1].name), ['fuel_update_started', 'fuel_update_completed', 'fuel_update_failed']);
    assert.equal(vercel[1][1].data.queue_estimate, 'long');
    assert.equal(ga.length, 3);
    for (const event of vercel) {
      assert.equal('phone' in event[1].data, false);
      assert.equal('latitude' in event[1].data, false);
    }
  } finally { delete globalThis.window; }
});

test('sponsors have one Vercel event per action and no private destination URL', () => {
  const { vercel, ga } = capture();
  try {
    const sponsor = { id: 'sponsor', name: 'Business', city: 'Lilongwe', cta_url: 'https://example.com/?token=private' };
    trackSponsorImpression(sponsor, 'in_feed');
    trackSponsorClick(sponsor, 'in_feed');
    assert.deepEqual(vercel.map((event) => event[1].name), ['sponsor_impression', 'sponsor_click']);
    assert.equal(vercel[1][1].data.sponsor_id, 'sponsor');
    assert.equal(vercel[1][1].data.placement, 'in_feed');
    assert.equal('destination_url' in vercel[1][1].data, false);
    assert.equal(ga.length, 4);
  } finally { delete globalThis.window; }
});

test('Vercel only receives allowlisted properties and canonical events', () => {
  const { vercel } = capture();
  try {
    trackEvent('advertising_enquiry', { method: 'whatsapp', phone: 'private', error: 'private' });
    trackShare('whatsapp', 'https://example.com/?private=value');
    trackPwaInstall('android', 'appinstalled');
    trackEvent('unregistered_event', { arbitrary: 'private' });
    assert.equal(vercel.length, 3);
    assert.deepEqual(vercel[0][1].data, { method: 'whatsapp' });
    assert.equal('item_id' in vercel[1][1].data, false);
    assert.equal(vercel[2][1].name, 'pwa_install');
  } finally { delete globalThis.window; }
});

test('analytics failures cannot prevent actions or the other provider from recording', () => {
  const ga = [];
  globalThis.window = { va: () => { throw new Error('blocked'); }, gtag: (...args) => ga.push(args) };
  assert.doesNotThrow(() => trackEvent('advertising_enquiry', { method: 'email' }));
  assert.equal(ga.length, 1);
  const vercel = [];
  globalThis.window = { va: (...args) => vercel.push(args), gtag: () => { throw new Error('blocked'); } };
  assert.doesNotThrow(() => trackEvent('advertising_enquiry', { method: 'email' }));
  assert.equal(vercel.length, 1);
  delete globalThis.window;
  assert.doesNotThrow(() => trackEvent('advertising_enquiry', { method: 'email' }));
});
