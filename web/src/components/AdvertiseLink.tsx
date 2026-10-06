'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { trackEvent } from '@/lib/gtag';

export function AdvertiseLink({ placement, className = '' }: { placement: string; className?: string }) {
  const { t } = useLanguage();
  return <Link href="/advertise" prefetch={false} onClick={() => trackEvent('advertising_rate_card_opened', { placement })} className={`inline-flex min-h-11 items-center gap-1.5 text-xs font-bold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}>
    {t('Advertise on Alipo')}<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
  </Link>;
}
