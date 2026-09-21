'use client';

import { useEffect } from 'react';
import { isStandalonePwa } from '@/lib/geolocation';

export function UsageTracker() {
  useEffect(() => {
    try {
      let visitorId = localStorage.getItem('alipo-analytics-id');
      if (!visitorId) { visitorId = crypto.randomUUID(); localStorage.setItem('alipo-analytics-id', visitorId); }
      void fetch('/api/analytics/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitorId, channel: isStandalonePwa() ? 'pwa' : 'web' }), keepalive: true });
    } catch { /* Analytics must never interrupt the app. */ }
  }, []);
  return null;
}
