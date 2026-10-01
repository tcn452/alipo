import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldResumeLocation } from '../src/lib/geolocation.ts';
test('granted permission resumes on every PWA reopen', () => assert.equal(shouldResumeLocation('granted', false), true));
test('unsupported permission queries resume only after a successful allowance', () => {
  assert.equal(shouldResumeLocation('unknown', true), true);
  assert.equal(shouldResumeLocation('unknown', false), false);
});
test('stored consent never overrides revoked or prompt permissions', () => {
  assert.equal(shouldResumeLocation('denied', true), false);
  assert.equal(shouldResumeLocation('prompt', true), false);
});
