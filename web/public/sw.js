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

  // Leave live APIs, third-party maps, and private pages to the browser.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Build-hashed JS/CSS/fonts never change at the same URL. Reuse them without
  // contacting the CDN; activation removes the previous service-worker cache.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })());
    return;
  }

  // Only cache public HTML navigations. RSC responses and authenticated pages
  // must never share an offline cache entry with a document.
  if (event.request.mode !== 'navigate' || !['/', '/privacy'].includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch {
      return await cache.match(event.request) || await cache.match('/') || Response.error();
    }
  })());
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
        if (stationId) {
          client.postMessage({ type: 'OPEN_STATION_REPORT', stationId });
        }
        return;
      }
      await self.clients.openWindow(targetUrl);
    })
  );
});
