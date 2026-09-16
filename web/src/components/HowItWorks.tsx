'use client';

import { useEffect, useRef } from 'react';
import { ArrowRight, Fuel, MapPinned, MessageSquareMore, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface HowItWorksProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { title: 'Find stations near you', detail: 'Use your location, choose a city, or change the radius.', icon: MapPinned },
  { title: 'Check before you drive', detail: 'See petrol and diesel availability, queues, and when reports become stale.', icon: Fuel },
  { title: 'Share what you see', detail: 'Submit a quick report, correct a station name, or flag a station that no longer exists.', icon: MessageSquareMore },
] as const;

export function HowItWorks({ isOpen, onClose }: HowItWorksProps) {
  const { t } = useLanguage();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = previousOverflow; };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return <div className="fixed inset-0 z-[2100] flex items-end bg-[#032e20]/60 sm:items-stretch sm:justify-end" role="presentation">
    <button type="button" onClick={onClose} aria-label={t('Close how Alipo works')} className="absolute inset-0 cursor-default" />
    <aside ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="how-alipo-works-title" className="relative z-10 max-h-[88dvh] w-full overflow-y-auto bg-[#fbf8f1] shadow-[0_24px_80px_rgba(3,46,32,.35)] sm:h-full sm:max-h-none sm:max-w-[480px]">
      <header className="flex items-start justify-between bg-forest px-5 py-6 text-white sm:px-8 sm:py-8">
        <div><p className="text-sm font-bold text-[#f5aa54]">Alipo</p><h2 id="how-alipo-works-title" className="mt-1 font-display text-3xl tracking-[-.03em]">{t('How Alipo works')}</h2></div>
        <button ref={closeButtonRef} type="button" onClick={onClose} aria-label={t('Close how Alipo works')} className="grid h-11 w-11 place-items-center border border-white/25 text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#f5aa54]"><X className="h-5 w-5" /></button>
      </header>

      <div className="px-5 py-3 sm:px-8 sm:py-5">
        <ol>
          {STEPS.map(({ title, detail, icon: Icon }, index) => <li key={title} className="grid grid-cols-[48px_minmax(0,1fr)] gap-4 border-b border-line py-5 last:border-0">
            <div className="grid h-12 w-12 place-items-center bg-[#e1edd9] text-forest"><Icon className="h-5 w-5" /></div>
            <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-orange">{t('Step {number}', { number: index + 1 })}</p><h3 className="mt-1 text-base font-black text-ink">{t(title)}</h3><p className="mt-1 text-sm leading-5 text-muted">{t(detail)}</p></div>
          </li>)}
        </ol>
        <div className="mt-2 bg-[#eee9dd] px-4 py-4 text-ink"><p className="text-sm font-black">{t("Powered by Malawi's community")}</p><p className="mt-1 text-xs leading-5">{t('Alipo uses crowdsourced information shared by drivers and communities across Malawi. Thank you for helping us build and improve it.')}</p><p className="mt-2 text-[11px] leading-4 text-muted">{t('Community reports become stale after four hours and are removed after twelve hours.')}</p></div>
        <a href="#find-fuel" onClick={onClose} className="mt-5 inline-flex min-h-12 w-full items-center justify-between bg-orange px-4 text-sm font-black text-white transition hover:bg-[#d95a1c] focus:outline-none focus:ring-2 focus:ring-forest focus:ring-offset-2">{t('Start finding fuel')} <ArrowRight className="h-4 w-4" /></a>
      </div>
    </aside>
  </div>;
}
