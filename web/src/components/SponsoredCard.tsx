'use client';

import { ArrowUpRight, Compass, Globe, Sparkles } from 'lucide-react';
import { Sponsor } from '@/types/alipo';
import { useLanguage } from '@/lib/i18n';

interface SponsoredCardProps {
  sponsor: Sponsor;
}

export function SponsoredCard({ sponsor }: SponsoredCardProps) {
  const { t } = useLanguage();

  return (
    <aside
      aria-label={`${t('Sponsored')}: ${sponsor.name}`}
      className="group relative border-2 border-forest/20 bg-gradient-to-br from-[#f8faf6] to-[#f0f5ed] p-4 shadow-sm transition hover:border-forest/50 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 border border-forest/30 bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-forest">
              <Sparkles className="h-2.5 w-2.5 text-orange" />
              {t('Sponsored')}
            </span>
            {sponsor.badge ? (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                {t(sponsor.badge)}
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 text-lg font-black tracking-[-0.03em] text-ink sm:text-xl">
            {sponsor.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-bold text-forest">
            <Compass className="h-3.5 w-3.5 text-orange" />
            {t(sponsor.category || 'Travel & Transport')}
          </p>
        </div>

        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-forest/20 bg-white text-forest shadow-xs">
          <Globe className="h-5 w-5 text-forest" />
        </div>
      </div>

      {sponsor.tagline ? (
        <p className="mt-3 text-xs font-bold leading-5 text-ink/90">
          {sponsor.tagline}
        </p>
      ) : null}

      {sponsor.description ? (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          {sponsor.description}
        </p>
      ) : null}

      <div className="mt-4 flex items-center justify-between border-t border-forest/15 pt-3">
        <span className="text-[10px] font-semibold text-muted">
          Malawi travel & transfers
        </span>
        <a
          href={sponsor.cta_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center gap-1.5 bg-forest px-3.5 py-1.5 text-xs font-black text-white transition hover:bg-[#0b5940]"
        >
          {t(sponsor.cta_text || 'Explore Giants Travel')}
          <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </div>
    </aside>
  );
}
