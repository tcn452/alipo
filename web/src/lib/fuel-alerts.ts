export function savedStationIds(): string[] {
  try { const value: unknown = JSON.parse(localStorage.getItem('alipo-watched-stations') || '[]'); return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(0, 50) : []; } catch { return []; }
}

export async function syncFuelAlerts(subscription: PushSubscription, stationIds = savedStationIds()) {
  const response = await fetch('/api/push/subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON(), station_ids: stationIds }) });
  if (!response.ok) throw new Error('Unable to save fuel alerts. Please try again.');
}

export async function enableFuelAlerts(publicKey: string) {
  if (!savedStationIds().length) throw new Error('Save a station first.');
  if (!publicKey) throw new Error('Fuel alerts are not available yet. Please try again later.');
  // Called directly from the button gesture (required by iOS).
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications were not enabled. You can change this in browser settings.');
  const registration = await navigator.serviceWorker.ready;
  const decoded = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/'));
  const key = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  try { await syncFuelAlerts(subscription); } catch (error) { await subscription.unsubscribe(); throw error; }
}
