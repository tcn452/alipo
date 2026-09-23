'use client';

import Link from 'next/link';
import { BarChart3, FileCheck2, Smartphone, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PublicUsageData {
  users30Days: number;
  reports30Days: number;
  pwaUsers30Days: number;
}

export function PublicUsageSnapshot() {
  const [data, setData] = useState<PublicUsageData | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/analytics/public', { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<PublicUsageData> : null)
      .then((summary) => setData(summary))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  if (!data) return null;

  const metrics = [
    { label: 'people used Alipo', value: data.users30Days, icon: Users },
    { label: 'fuel reports shared', value: data.reports30Days, icon: FileCheck2 },
    { label: 'active PWA users', value: data.pwaUsers30Days, icon: Smartphone },
  ];

  return (
    <section className="border-t border-line bg-[#eee9dd]" aria-labelledby="usage-heading">
      <div className="mx-auto grid max-w-[1440px] gap-7 px-5 py-9 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:px-12">
        <div>
          <div className="flex items-center gap-2 text-forest">
            <BarChart3 className="h-5 w-5 text-orange" />
            <h2 id="usage-heading" className="text-xl font-black tracking-[-.03em]">Alipo in use</h2>
          </div>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted">
            A privacy-safe snapshot of how the community has used Alipo over the last 30 days.
          </p>
          <Link href="/privacy" className="mt-3 inline-flex text-xs font-black text-forest underline decoration-forest/30 underline-offset-4 hover:decoration-forest">
            How anonymous usage is measured
          </Link>
        </div>

        <dl className="grid grid-cols-3 divide-x divide-forest/15 border-y border-forest/15 py-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="min-w-0 px-3 first:pl-0 last:pr-0 sm:px-6">
              <Icon className="mb-2 h-4 w-4 text-orange" aria-hidden="true" />
              <dd className="text-2xl font-black tabular-nums text-forest sm:text-3xl">{value.toLocaleString()}</dd>
              <dt className="mt-1 text-[10px] font-bold leading-4 text-muted sm:text-xs">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
