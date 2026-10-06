'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

export function CommunityActivity() {
  const { t } = useLanguage();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;
    const refresh = async () => {
      if (document.visibilityState === 'hidden') return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch('/api/activity', { cache: 'no-store', signal: request.signal });
        if (!response.ok) throw new Error('Activity unavailable');
        const data = await response.json();
        if (!Number.isSafeInteger(data.reportsLast24Hours) || data.reportsLast24Hours < 0) throw new Error('Invalid activity');
        if (!disposed && !request.signal.aborted) setCount(data.reportsLast24Hours);
      } catch {
        if (!disposed && !request.signal.aborted) setCount(null);
      }
    };
    void refresh();
    const interval = window.setInterval(() => { void refresh(); }, 60_000);
    const onVisible = () => { void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('alipo-report-saved', onVisible);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('alipo-report-saved', onVisible);
    };
  }, []);

  if (count === null) return null;
  return <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-white sm:text-sm">
    <Users aria-hidden="true" className="h-4 w-4 shrink-0 text-[#f5aa54]" />
    <span>{t(count === 1 ? '{count} fuel report in the last 24 hours' : '{count} fuel reports in the last 24 hours', { count: count.toLocaleString() })} <span className="text-white/80">· {t('Across Malawi')}</span></span>
  </p>;
}
