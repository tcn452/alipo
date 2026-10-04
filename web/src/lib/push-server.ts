import 'server-only';
import webpush from 'web-push';

// Allow only known push services. Never send requests to arbitrary subscription URLs.
export function validPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') &&
      (url.hostname === 'fcm.googleapis.com' || url.hostname === 'updates.push.services.mozilla.com' || url.hostname === 'web.push.apple.com' || url.hostname.endsWith('.notify.windows.com'));
  } catch { return false; }
}

export function pushConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

export async function sendFuelPush(subscription: webpush.PushSubscription, payload: Record<string, unknown>) {
  if (!validPushEndpoint(subscription.endpoint) || !pushConfigured()) throw new Error('Push unavailable');
  return webpush.sendNotification(subscription, JSON.stringify(payload), { TTL: 300, timeout: 10_000, vapidDetails: { subject: process.env.VAPID_SUBJECT!, publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! } });
}
