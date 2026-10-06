'use client';

import { ArrowUpRight, Compass, Store, Megaphone } from 'lucide-react';
import { Sponsor } from '@/types/alipo';
import { useLanguage } from '@/lib/i18n';
import { trackSponsorClick } from '@/lib/gtag';

interface SponsoredCardProps {
  sponsor: Sponsor;
}

export function SponsoredCard({ sponsor }: SponsoredCardProps) {
  const { t } = useLanguage();


  return (
    <aside
      aria-label={`${t('Advertisement')}: ${sponsor.name}`}
      className="group relative my-2 rounded-xl border border-[#c4b5df] bg-[#f4effa] p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 border border-[#c4b5df] bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#573780]">
              <Megaphone className="h-2.5 w-2.5 text-[#573780]" />
              {t('Advertisement')}
            </span>
            {sponsor.badge ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6d5a81]">
                {t(sponsor.badge)}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 text-lg font-black tracking-[-0.03em] text-[#39244f] sm:text-xl">
            {sponsor.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-[#573780]">
            <Compass className="h-3.5 w-3.5 text-[#573780]" />
            {t(sponsor.category || 'Travel & Transport')}
          </p>
        </div>

        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#c4b5df] bg-white text-[#573780] shadow-xs">
          <Store className="h-5 w-5 text-[#573780]" />
        </div>
      </div>

      {sponsor.tagline ? (
        <p className="mt-3 text-xs font-bold leading-5 text-[#39244f]">
          {sponsor.tagline}
        </p>
      ) : null}

      {sponsor.description ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-[#6d5a81]">
          {sponsor.description}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-[#c4b5df] pt-3">
        <span className="text-[10px] font-semibold text-[#6d5a81]">
          {sponsor.city && sponsor.city !== 'all' ? sponsor.city : 'Malawi'} · {t(sponsor.category || 'Local business')}
        </span>
        <a
          href={sponsor.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackSponsorClick(sponsor, 'in_feed')}
          className="inline-flex min-h-11 items-center gap-1.5 bg-[#573780] px-3.5 py-1.5 text-xs font-black text-white transition hover:bg-[#432765] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#573780]"
        >
          {t(sponsor.cta_text || 'Explore Giants Travel')}
          <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </div>
    </aside>
  );
}
