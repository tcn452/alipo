import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configureKeyEvents } from '../../scripts/configure-ga4-key-events.mjs';

const args = { propertyId: '123', accessToken: 'test-token' };
const events = ['fuel_update_completed', 'app_install', 'fuel_alert_enabled'];

test('preview only lists planned GA4 changes without mutating the property', async () => {
  const calls = [];
  const result = await configureKeyEvents({ ...args, fetchImpl: async (url, init) => { calls.push(init.method); return Response.json({ keyEvents: [] }); } });
  assert.deepEqual(calls, ['GET']);
  assert.deepEqual(result.actions.map((action) => action.event), events);
  assert.ok(result.actions.every((action) => action.action === 'would_create'));
});

test('apply creates missing events and a second run verifies without duplicates', async () => {
  const stored = []; const writes = [];
  const fetchImpl = async (url, init) => {
    if (init.method === 'POST') {
      const body = JSON.parse(init.body); writes.push(body);
      stored.push({ ...body, name: `properties/123/keyEvents/${stored.length + 1}` });
      return Response.json(stored.at(-1));
    }
    return Response.json({ keyEvents: stored });
  };
  await configureKeyEvents({ ...args, apply: true, fetchImpl });
  const again = await configureKeyEvents({ ...args, apply: true, fetchImpl });
  assert.equal(writes.length, 3);
  assert.ok(writes.every((event) => event.countingMethod === 'ONCE_PER_EVENT'));
  assert.ok(again.actions.every((action) => action.action === 'verified'));
});

test('pagination finds existing events and counting-method updates use PATCH', async () => {
  const stored = events.map((eventName, index) => ({ eventName, name: `properties/123/keyEvents/${index + 1}`, countingMethod: index === 0 ? 'ONCE_PER_SESSION' : 'ONCE_PER_EVENT' }));
  const writes = [];
  const fetchImpl = async (url, init) => {
    if (init.method === 'PATCH') {
      writes.push(url); stored[0].countingMethod = JSON.parse(init.body).countingMethod;
      return Response.json(stored[0]);
    }
    return new URL(url).searchParams.has('pageToken') ? Response.json({ keyEvents: stored.slice(1) }) : Response.json({ keyEvents: stored.slice(0, 1), nextPageToken: 'next-page' });
  };
  await configureKeyEvents({ ...args, apply: true, fetchImpl });
  assert.deepEqual(writes, ['https://analyticsadmin.googleapis.com/v1beta/properties/123/keyEvents/1?updateMask=counting_method']);
});

test('missing access and measurement IDs are rejected before API requests', async () => {
  const fetchImpl = () => { throw new Error('Should not fetch'); };
  await assert.rejects(configureKeyEvents({ ...args, propertyId: 'G-9NR2XVH5WC', fetchImpl }), /numeric property/);
  await assert.rejects(configureKeyEvents({ ...args, accessToken: '', fetchImpl }), /OAuth token/);
});

test('permission errors are reported without exposing the access token', async () => {
  await assert.rejects(configureKeyEvents({ ...args, fetchImpl: async () => new Response('private provider details', { status: 403 }) }), (error) => error.message.includes('403') && !error.message.includes(args.accessToken) && !error.message.includes('private provider details'));
});

test('apply cannot claim success when final registration verification fails', async () => {
  await assert.rejects(configureKeyEvents({ ...args, apply: true, fetchImpl: async () => Response.json({ keyEvents: [] }) }), /verification failed/);
});
