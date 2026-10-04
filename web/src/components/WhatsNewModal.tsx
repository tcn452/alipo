'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, Bell, CheckCircle2, Share2, Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { APP_VERSION, RELEASE_SEEN_KEY } from '@/lib/release';

const UPDATES = [
  { icon: CheckCircle2, title: 'Fuel updates in one tap', detail: 'Tap “Still has fuel” or “Out of fuel” for petrol or diesel directly on a station card.' },
  { icon: Share2, title: 'Share a fuel status picture', detail: 'Send a station’s fuel status and report time to friends on WhatsApp, with a link to the latest updates.' },
  { icon: Bell, title: 'Keep an eye on your stations', detail: 'Save the stations you care about. Look for fuel alerts when using the installed app.' },
] as const;

export function WhatsNewModal({ blocked, requested, onClose }: { blocked: boolean; requested: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const [automatic, setAutomatic] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const open = !blocked && (automatic || requested);

  useEffect(() => {
    try {
      if (localStorage.getItem('alipo-onboarded') === 'true') {
        setAutomatic(localStorage.getItem(RELEASE_SEEN_KEY) !== APP_VERSION);
      } else {
        // New users arrive on this release; keep their first visit focused on onboarding.
        localStorage.setItem(RELEASE_SEEN_KEY, APP_VERSION);
      }
    } catch { /* The release remains available from the footer without storage. */ }
  }, []);

  const close = useCallback(() => {
    try { localStorage.setItem(RELEASE_SEEN_KEY, APP_VERSION); } catch { /* Dismiss for this session. */ }
    setAutomatic(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key !== 'Tab') return;
      const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('button');
      if (!buttons?.length) return;
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open, close]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[2400] flex items-start justify-center overflow-y-auto bg-[#032e20]/80 p-4 backdrop-blur-sm">
    <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="whats-new-title" aria-describedby="whats-new-description" className="my-auto w-full max-w-lg border border-white/20 bg-[#fbf8f1] shadow-[0_30px_100px_rgba(0,0,0,.4)]">
      <header className="flex items-start justify-between gap-4 bg-forest p-5 text-white sm:p-6">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.14em] text-[#f5aa54]"><Sparkles className="h-4 w-4" /> Alipo v{APP_VERSION}</p>
          <h2 id="whats-new-title" className="mt-2 text-2xl font-black tracking-[-.03em]">{t('Welcome back. Here’s what’s new.')}</h2>
          <p id="whats-new-description" className="mt-2 text-sm text-white/75">{t('Our first major update makes it easier to find fuel and help others.')}</p>
        </div>
        <button ref={closeButton} type="button" onClick={close} aria-label={t('Close updates')} className="grid min-h-11 min-w-11 shrink-0 place-items-center border border-white/25 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><X className="h-5 w-5" /></button>
      </header>
      <div className="p-5 sm:p-6">
        <ul className="space-y-5">
          {UPDATES.map(({ icon: Icon, title, detail }) => <li key={title} className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#e5eddc] text-forest"><Icon className="h-5 w-5" /></span>
            <div><h3 className="text-sm font-black text-forest">{t(title)}</h3><p className="mt-1 text-xs leading-5 text-muted">{t(detail)}</p></div>
          </li>)}
        </ul>
        <button type="button" onClick={close} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-forest px-5 text-sm font-black text-white hover:bg-[#0b5940] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest">{t('Let’s find fuel')}<ArrowRight className="h-4 w-4" /></button>
      </div>
    </div>
  </div>;
}
