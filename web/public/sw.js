const CACHE_NAME = 'alipo-shell-v6';
const APP_SHELL = ['/', '/manifest.json', '/favicon.png', '/icon-192.png', '/icon-512.png'];
const LAUNCH_TIMESTAMP = 1790805600000; // 2026-10-01T00:00:00+02:00 (CAT)

let launchTimer = null;

function showLaunchNotification(lang) {
  const isNy = lang === 'ny';
  const title = isNy ? '⛽ Alipo tsopano ili ndi MOYO!' : '⛽ Alipo is officially LIVE!';
  const body = isNy
    ? 'Kutsata mafuta a petulo ndi dizilo ku Malawi konse kwayamba tsopano. Dinani kuti muwone malo a mafuta.'
    : 'Real-time petrol & diesel tracking across Malawi is now active. Tap to find fuel.';

  return self.registration.showNotification(title, {
    body,
    icon: '/icon-192.png',
    badge: '/favicon.png',
    tag: 'alipo-official-launch',
    data: { url: '/' },
    requireInteraction: true,
  });
}

function scheduleLaunchAlert(lang) {
  const delay = LAUNCH_TIMESTAMP - Date.now();
  if (launchTimer) clearTimeout(launchTimer);

  if (delay <= 0) {
    void showLaunchNotification(lang);
    return;
  }

  // Max 32-bit int ms (~24.8 days)
  if (delay < 2147483647) {
    launchTimer = setTimeout(() => {
      void showLaunchNotification(lang);
    }, delay);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_LAUNCH_ALERT') {
    scheduleLaunchAlert(event.data?.lang || 'en');
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const stationId = event.notification.data?.stationId;
  const targetUrl = event.notification.data?.url || (stationId ? `/?reportStation=${encodeURIComponent(stationId)}` : '/');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const client = clients[0];
      if (client) {
        await client.focus();
        if (event.notification.data?.url) {
          await client.navigate(targetUrl);
        } else if (stationId) {
          client.postMessage({ type: 'OPEN_STATION_REPORT', stationId });
        }
        return;
      }
      await self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('push', (event) => {
  let payload;
  try { payload = event.data?.json(); } catch { return; }
  if (!payload || typeof payload.title !== 'string') return;
  const url = new URL(payload.url || '/', self.location.origin);
  if (url.origin !== self.location.origin) return;
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/icon-192.png', badge: '/favicon.png',
    tag: `fuel-available-${payload.stationId || 'saved'}`,
    data: { stationId: payload.stationId, url: url.href },
  }));
});
