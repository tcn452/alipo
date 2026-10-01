import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addressQuery, parseAddressMatches } from '../src/lib/address-search.ts';

const feature = (coordinates, properties = {}) => ({ geometry: { type: 'Point', coordinates }, properties: { countrycode: 'MW', name: 'Haile Selassie Avenue', city: 'Blantyre', osm_id: 1, osm_type: 'W', ...properties } });
test('typed address and town form the geocoding query', () => {
  assert.equal(addressQuery('  Haile   Selassie Avenue  ', ' Blantyre '), 'Haile Selassie Avenue, Blantyre');
  assert.equal(addressQuery('Area 18', ''), 'Area 18');
});
test('matches translate longitude/latitude to a Malawi map pin', () => {
  const matches = parseAddressMatches({ features: [feature([35.00795, -15.78724])] });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].latitude, -15.78724);
  assert.equal(matches[0].longitude, 35.00795);
  assert.equal(matches[0].label, 'Haile Selassie Avenue, Blantyre');
});
test('rejects malformed and outside-Malawi matches, deduplicates and bounds results', () => {
  assert.deepEqual(parseAddressMatches(null), []);
  assert.deepEqual(parseAddressMatches({ features: [null, feature([0, 0]), feature([35, -15], { countrycode: 'ZA' }), feature(['35', '-15']), feature([NaN, -15])] }), []);
  assert.equal(parseAddressMatches({ features: [feature([35, -15]), feature([35, -15])] }).length, 1);
  assert.equal(parseAddressMatches({ features: Array.from({ length: 8 }, (_, i) => feature([35, -15], { osm_id: i })) }).length, 5);
});
