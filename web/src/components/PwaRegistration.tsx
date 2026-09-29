'use client';

import { useEffect } from 'react';
import { LAUNCH_DATE, LAUNCH_NOTIFICATION_KEY, LAUNCH_NOTIFIED_KEY } from '@/lib/constants';

export function PwaRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const setupLaunchNotification = async (registration: ServiceWorkerRegistration) => {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const isSubscribed = localStorage.getItem(LAUNCH_NOTIFICATION_KEY) === 'true';
      const isNotified = localStorage.getItem(LAUNCH_NOTIFIED_KEY) === 'true';
      const lang = localStorage.getItem('alipo-language') || 'en';

      // If launch date has already arrived and notification hasn't been fired yet
      if (Date.now() >= LAUNCH_DATE.getTime()) {
        if (!isNotified && isSubscribed) {
          localStorage.setItem(LAUNCH_NOTIFIED_KEY, 'true');
          const isNy = lang === 'ny';
          await registration.showNotification(
            isNy ? '⛽ Alipo tsopano ili ndi MOYO!' : '⛽ Alipo is officially LIVE!',
            {
              body: isNy
                ? 'Kutsata mafuta a petulo ndi dizilo ku Malawi konse kwayamba tsopano. Dinani kuti muwone malo a mafuta.'
                : 'Real-time petrol & diesel tracking across Malawi is now active. Tap to find fuel.',
              icon: '/icon-192.png',
              badge: '/favicon.png',
              tag: 'alipo-official-launch',
              data: { url: '/' },
              requireInteraction: true,
            }
          );
        }
        return;
      }

      // Schedule launch alert in Service Worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'SCHEDULE_LAUNCH_ALERT',
          lang,
        });
      }

      // Client-side timer fallback if the tab/PWA is running
      const delay = LAUNCH_DATE.getTime() - Date.now();
      if (delay > 0 && delay < 2147483647) {
        const timer = window.setTimeout(async () => {
          if (localStorage.getItem(LAUNCH_NOTIFIED_KEY) === 'true') return;
          localStorage.setItem(LAUNCH_NOTIFIED_KEY, 'true');
          const isNy = lang === 'ny';
          await registration.showNotification(
            isNy ? '⛽ Alipo tsopano ili ndi MOYO!' : '⛽ Alipo is officially LIVE!',
            {
              body: isNy
                ? 'Kutsata mafuta a petulo ndi dizilo ku Malawi konse kwayamba tsopano. Dinani kuti muwone malo a mafuta.'
                : 'Real-time petrol & diesel tracking across Malawi is now active. Tap to find fuel.',
              icon: '/icon-192.png',
              badge: '/favicon.png',
              tag: 'alipo-official-launch',
              data: { url: '/' },
              requireInteraction: true,
            }
          );
        }, delay);

        return () => window.clearTimeout(timer);
      }
    };

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          void setupLaunchNotification(reg);
        })
        .catch(() => undefined);
    };

    if (document.readyState === 'complete') void register();
    else window.addEventListener('load', register);

    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
