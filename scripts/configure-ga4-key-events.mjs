import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const API_ORIGIN = 'https://analyticsadmin.googleapis.com';
const desired = JSON.parse(await readFile(new URL('./ga4-key-events.json', import.meta.url), 'utf8'));

export async function configureKeyEvents({ propertyId, accessToken, apply = false, fetchImpl = fetch }) {
  if (!/^\d+$/.test(propertyId || '')) throw new Error('Set GA4_PROPERTY_ID to the numeric property ID, not the G- measurement ID.');
  if (!accessToken) throw new Error('Set GA4_ACCESS_TOKEN to an OAuth token with analytics.edit scope and property Editor access.');
  const parent = `properties/${propertyId}`;
  const collection = `${API_ORIGIN}/v1beta/${parent}/keyEvents`;
  const call = async (url, method = 'GET', body) => {
    const response = await fetchImpl(url, { method, headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`GA4 ${method} failed (${response.status}). Check API enablement, token scope, property access and key-event quota.`);
    return response.json();
  };
  const list = async () => {
    const events = []; let pageToken;
    do {
      const url = new URL(collection); url.searchParams.set('pageSize', '200');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const page = await call(url.toString());
      events.push(...(page.keyEvents || [])); pageToken = page.nextPageToken;
    } while (pageToken);
    return new Map(events.map((event) => [event.eventName, event]));
  };
  const existing = await list();
  const actions = [];
  for (const event of desired) {
    const current = existing.get(event.eventName);
    if (current?.countingMethod === event.countingMethod) { actions.push({ event: event.eventName, action: 'verified' }); continue; }
    const action = current ? 'update_counting' : 'create';
    actions.push({ event: event.eventName, action: apply ? action : `would_${action}` });
    if (!apply) continue;
    if (current) {
      if (!new RegExp(`^properties/${propertyId}/keyEvents/[A-Za-z0-9_-]+$`).test(current.name)) throw new Error('Unexpected GA4 key-event resource name.');
      await call(`${API_ORIGIN}/v1beta/${current.name}?updateMask=counting_method`, 'PATCH', { countingMethod: event.countingMethod });
    } else await call(collection, 'POST', event);
  }
  if (apply) {
    const final = await list();
    for (const event of desired) if (final.get(event.eventName)?.countingMethod !== event.countingMethod) throw new Error(`Key-event verification failed for ${event.eventName}.`);
  }
  return { property: parent, mode: apply ? 'applied_and_verified' : 'read_only', actions };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await configureKeyEvents({ propertyId: process.env.GA4_PROPERTY_ID, accessToken: process.env.GA4_ACCESS_TOKEN, apply: process.argv.includes('--apply') });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
