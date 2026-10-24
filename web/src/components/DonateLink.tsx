'use client';

import { ArrowUpRight, Heart } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { trackEvent } from '@/lib/gtag';

const DONATION_URL = 'https://give.paychangu.com/dc-c7oh9v';

export function DonateLink({ placement, className = '' }: { placement: string; className?: string }) {
  const { t } = useLanguage();

  return (
    <a
      href={DONATION_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent('donation_link_opened', { placement })}
      className={`inline-flex min-h-11 items-center gap-1.5 text-xs font-bold underline underline-offset-4 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
    >
      <Heart aria-hidden="true" className="h-3.5 w-3.5" />
      {t('Donate to Alipo')}
      <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
      <span className="sr-only">{t('(opens in a new tab)')}</span>
    </a>
  );
}
