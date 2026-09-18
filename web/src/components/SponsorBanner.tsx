'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, Globe, Plane, ShieldCheck, Sparkles } from 'lucide-react';
import { Sponsor } from '@/types/alipo';
import { FALLBACK_SPONSORS, getActiveSponsors } from '@/lib/sponsors';
import { useLanguage } from '@/lib/i18n';
import { SponsoredCard } from './SponsoredCard';

interface SponsorBannerProps {
  placement?: 'in_feed' | 'post_report' | 'banner' | 'all';
  city?: string;
  className?: string;
}

export function SponsorBanner({ placement = 'all', city = 'all', className = '' }: SponsorBannerProps) {
  const { t } = useLanguage();
  const [sponsor, setSponsor] = useState<Sponsor>(FALLBACK_SPONSORS[0]);

  useEffect(() => {
    let isMounted = true;
    void getActiveSponsors(placement, city).then((sponsors) => {
      if (isMounted && sponsors.length > 0) {
        setSponsor(sponsors[0]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [placement, city]);

  // If in_feed placement, render the full feed card
  if (placement === 'in_feed') {
    return <SponsoredCard sponsor={sponsor} />;
  }

  // Post-report confirmation screen placement
  if (placement === 'post_report') {
    return (
      <div className={`mt-6 border-t border-line/80 pt-5 text-left ${className}`}>
        <div className="rounded-none border border-forest/25 bg-[#f0f6ec] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-forest">
              <Sparkles className="h-2.5 w-2.5 text-orange" />
              {t('Sponsored')}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
              {t(sponsor.badge || 'Official Partner')}
            </span>
          </div>

          <div className="mt-2.5 flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest text-white">
              <Plane className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-black text-ink sm:text-lg">
                {sponsor.name}
              </h4>
              <p className="mt-0.5 text-xs font-bold text-forest">
                {sponsor.tagline || t('Awaken to a New World. Reliable flights, car rentals & airport transfers.')}
              </p>
            </div>
          </div>

          <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
            {sponsor.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-forest/15 pt-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-forest">
              <ShieldCheck className="h-3.5 w-3.5 text-orange" />
              <span>{t('Local Malawian travel specialists')}</span>
            </div>
            <a
              href={sponsor.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 bg-forest px-4 py-2 text-xs font-black text-white transition hover:bg-[#0b5940]"
            >
              {t(sponsor.cta_text || 'Explore Giants Travel')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Standard horizontal banner
  return (
    <aside
      aria-label={`${t('Sponsored')}: ${sponsor.name}`}
      className={`border border-forest/20 bg-[#f4f7f2] px-4 py-3 sm:px-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 border border-forest/30 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-forest">
            {t('Sponsored')}
          </span>
          <div className="min-w-0">
            <strong className="text-xs font-black text-ink sm:text-sm">
              {sponsor.name}
            </strong>
            <span className="hidden text-xs text-muted sm:inline">
              {' '}— {sponsor.tagline}
            </span>
          </div>
        </div>

        <a
          href={sponsor.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 bg-forest px-3.5 py-1.5 text-xs font-black text-white transition hover:bg-[#0b5940]"
        >
          {t(sponsor.cta_text || 'Explore Giants Travel')}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </aside>
  );
}
