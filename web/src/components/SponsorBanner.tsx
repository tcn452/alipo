'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, MapPin, Store, Megaphone } from 'lucide-react';
import { Sponsor } from '@/types/alipo';
import { getActiveSponsors, pickNextSponsor } from '@/lib/sponsors';
import { nextSponsor } from '@/lib/sponsor-rotation';
import { useLanguage } from '@/lib/i18n';
import { trackSponsorImpression, trackSponsorClick } from '@/lib/gtag';
import { AdvertiseLink } from './AdvertiseLink';
import { SponsoredCard } from './SponsoredCard';

interface SponsorBannerProps {
  placement?: 'in_feed' | 'post_report' | 'banner' | 'all';
  city?: string;
  className?: string;
  slotId?: string;
}

export function SponsorBanner({ placement = 'all', city = 'all', className = '', slotId = 'default' }: SponsorBannerProps) {
  const [sponsor, setSponsor] = useState<Sponsor | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [visible, setVisible] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const counted = useRef(new Set<string>());
  const slot = `${placement}:${slotId}`;

  useEffect(() => {
    let isMounted = true;
    void getActiveSponsors(placement, city).then((sponsors) => {
      if (isMounted && sponsors.length > 0) {
        setSponsors(sponsors);
        setSponsor(pickNextSponsor(sponsors, slot));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [placement, city, slot]);

  useEffect(() => {
    if (!container.current) return;
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.5), { threshold: [0, 0.5] });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || sponsors.length < 2) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setSponsor((current) => {
        const picked = nextSponsor(sponsors, current?.id || null);
        if (picked) { try { localStorage.setItem(`alipo-sponsor-last-v1:${slot}`, picked.id); } catch { /* Storage is optional. */ } }
        return picked;
      });
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [visible, sponsors, slot]);

  useEffect(() => {
    const record = () => {
      if (!visible || !sponsor || document.visibilityState !== 'visible') return;
      const key = `${slot}:${sponsor.id}`;
      if (counted.current.has(key)) return;
      counted.current.add(key);
      trackSponsorImpression(sponsor, placement);
    };
    record();
    document.addEventListener('visibilitychange', record);
    return () => document.removeEventListener('visibilitychange', record);
  }, [visible, sponsor, placement, slot]);

  return <div ref={container} className="min-h-[72px]">{sponsor ? <SponsorContent sponsor={sponsor} placement={placement} className={className} /> : null}{sponsor && placement === 'in_feed' ? <div className="flex justify-end"><AdvertiseLink placement="in_feed" className="text-[#573780]" /></div> : null}</div>;
}

function SponsorContent({ sponsor, placement, className }: { sponsor: Sponsor; placement: NonNullable<SponsorBannerProps['placement']>; className: string }) {
  const { t } = useLanguage();

  // If in_feed placement, render the full feed card
  if (placement === 'in_feed') {
    return <SponsoredCard sponsor={sponsor} />;
  }

  // Post-report confirmation screen placement
  if (placement === 'post_report') {
    return (
      <div className={`mt-6 border-t border-line/80 pt-5 text-left ${className}`}>
        <div className="rounded-xl border border-[#c4b5df] bg-[#f4effa] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#573780]">
              <Megaphone className="h-2.5 w-2.5 text-[#573780]" />
              {t('Advertisement')}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6d5a81]">
              {t(sponsor.badge || 'Official Partner')}
            </span>
          </div>

          <div className="mt-2.5 flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#573780] text-white">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-black text-[#39244f] sm:text-lg">
                {sponsor.name}
              </h4>
              <p className="mt-0.5 text-xs font-bold text-[#573780]">
                {sponsor.tagline || t('Awaken to a New World. Reliable flights, car rentals & airport transfers.')}
              </p>
            </div>
          </div>

          <p className="mt-2.5 text-[11px] leading-relaxed text-[#6d5a81]">
            {sponsor.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#c4b5df] pt-3">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#573780]">
              <MapPin className="h-3.5 w-3.5 text-[#573780]" />
              <span>{sponsor.city && sponsor.city !== 'all' ? sponsor.city : 'Malawi'} · {t(sponsor.category || 'Local business')}</span>
            </div>
            <a
              href={sponsor.cta_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackSponsorClick(sponsor, 'post_report')}
              className="inline-flex min-h-11 items-center gap-1.5 bg-[#573780] px-4 py-2 text-xs font-black text-white transition hover:bg-[#432765] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#573780]"
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
      aria-label={`${t('Advertisement')}: ${sponsor.name}`}
      className={`rounded-xl border border-[#c4b5df] bg-[#f4effa] px-4 py-3 sm:px-6 ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 border border-[#c4b5df] bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#573780]">
            {t('Advertisement')}
          </span>
          <div className="min-w-0">
            <strong className="text-xs font-black text-[#39244f] sm:text-sm">
              {sponsor.name}
            </strong>
            <span className="hidden text-xs text-[#6d5a81] sm:inline">
              {' '}— {sponsor.tagline}
            </span>
          </div>
        </div>

        <a
          href={sponsor.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackSponsorClick(sponsor, placement || 'banner')}
          className="inline-flex min-h-11 items-center gap-1.5 bg-[#573780] px-3.5 py-1.5 text-xs font-black text-white transition hover:bg-[#432765] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#573780]"
        >
          {t(sponsor.cta_text || 'Explore Giants Travel')}
          <ArrowUpRight className="h-3 w-3" />
        </a>
      </div>
    </aside>
  );
}
