'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { usePwaInstall } from '@/lib/usePwaInstall';

export function PwaInstallPrompt() {
  const { t } = useLanguage();
  const [onboarded, setOnboarded] = useState(false);
  const { showBanner, installEvent, isIos, dismissBanner, install } = usePwaInstall({
    autoShowBanner: true,
    deferRevealMs: 2200,
  });

  useEffect(() => {
    try {
      setOnboarded(Boolean(localStorage.getItem('alipo-onboarded')));
    } catch {
      setOnboarded(true);
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'alipo-onboarded') setOnboarded(Boolean(event.newValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Same-tab onboarding finish won't fire storage; poll lightly while hidden
  useEffect(() => {
    if (onboarded) return;
    const id = window.setInterval(() => {
      try {
        if (localStorage.getItem('alipo-onboarded')) setOnboarded(true);
      } catch {
        setOnboarded(true);
      }
    }, 800);
    return () => window.clearInterval(id);
  }, [onboarded]);

  if (!showBanner || !onboarded) return null;

  return (
    <aside
      className="fixed bottom-4 left-4 right-4 z-[2500] border border-white/20 bg-[#032e20] p-4 text-white shadow-[0_24px_80px_rgba(3,46,32,.35)] sm:left-auto sm:w-[390px]"
      aria-label={t('Install Alipo')}
    >
      <button
        type="button"
        onClick={dismissBanner}
        aria-label={t('Dismiss install prompt')}
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center border border-white/15 text-white/70 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-9">
        <div className="grid h-11 w-11 shrink-0 place-items-center bg-orange">
          <Download className="h-5 w-5" />
        </div>
        <div>
          <p className="eyebrow text-[#f5aa54]">{t('Install Alipo')}</p>
          <h2 className="mt-1 text-lg font-black">{t('Fuel updates, one tap away.')}</h2>
          <p className="mt-1 text-xs leading-5 text-white/65">
            {t('Add Alipo to your phone while we build the Android and iPhone apps.')}
          </p>
        </div>
      </div>
      {installEvent ? (
        <button
          type="button"
          onClick={() => {
            void install();
          }}
          className="mt-4 h-11 w-full bg-white text-sm font-black text-forest"
        >
          {t('Install app')}
        </button>
      ) : isIos ? (
        <p className="mt-4 flex items-center gap-2 border border-white/15 px-3 py-2 text-xs font-bold">
          <Share className="h-4 w-4 text-[#f5aa54]" /> {t('Tap Share, then “Add to Home Screen”.')}
        </p>
      ) : null}
    </aside>
  );
}
