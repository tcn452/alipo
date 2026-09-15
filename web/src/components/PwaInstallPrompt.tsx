'use client';

import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'alipo-install-prompt-dismissed';
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

export function PwaInstallPrompt() {
  const { t } = useLanguage();
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    if (standalone || Date.now() - dismissedAt < DISMISS_FOR_MS) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIos(ios);
    const reveal = window.setTimeout(() => { if (ios) setShow(true); }, 1800);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => {
      window.clearTimeout(reveal);
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShow(false);
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') setShow(false);
    setInstallEvent(null);
  };

  if (!show) return null;

  return <aside className="fixed bottom-4 left-4 right-4 z-[2500] border border-white/20 bg-[#032e20] p-4 text-white shadow-[0_24px_80px_rgba(3,46,32,.35)] sm:left-auto sm:w-[390px]" aria-label={t('Install Alipo')}>
    <button type="button" onClick={dismiss} aria-label={t('Dismiss install prompt')} className="absolute right-3 top-3 grid h-8 w-8 place-items-center border border-white/15 text-white/70 hover:text-white"><X className="h-4 w-4" /></button>
    <div className="flex gap-3 pr-9"><div className="grid h-11 w-11 shrink-0 place-items-center bg-orange"><Download className="h-5 w-5" /></div><div><p className="eyebrow text-[#f5aa54]">{t('Install Alipo')}</p><h2 className="mt-1 text-lg font-black">{t('Fuel updates, one tap away.')}</h2><p className="mt-1 text-xs leading-5 text-white/65">{t('Add Alipo to your phone while we build the Android app.')}</p></div></div>
    {installEvent ? <button type="button" onClick={() => { void install(); }} className="mt-4 h-11 w-full bg-white text-sm font-black text-forest">{t('Install app')}</button> : isIos ? <p className="mt-4 flex items-center gap-2 border border-white/15 px-3 py-2 text-xs font-bold"><Share className="h-4 w-4 text-[#f5aa54]" /> {t('Tap Share, then “Add to Home Screen”.')}</p> : null}
  </aside>;
}
