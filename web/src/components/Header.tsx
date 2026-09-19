'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CircleHelp, Download, Languages, LayoutDashboard, MapPinned, Plus, Radio, Share, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { usePwaInstall } from '@/lib/usePwaInstall';

interface HeaderProps {
  onOpenReport?: () => void;
  onOpenHowItWorks?: () => void;
}

export function Header({ onOpenReport, onOpenHowItWorks }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  const { installEvent, isIos, isStandalone, install } = usePwaInstall({ autoShowBanner: false });
  const [installOpen, setInstallOpen] = useState(false);
  const installPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!installOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!installPanelRef.current?.contains(event.target as Node)) setInstallOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setInstallOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [installOpen]);

  const handleInstallClick = async () => {
    if (installEvent) {
      const accepted = await install();
      if (accepted) setInstallOpen(false);
      return;
    }
    setInstallOpen((open) => !open);
  };

  return (
    <header className="sticky top-0 z-30 h-[72px] border-b border-line bg-[#fbf8f1]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center" aria-label="Alipo home">
          <Image
            src="/alipo-mark.png"
            alt="Alipo"
            width={46}
            height={60}
            priority
            className="h-11 w-auto object-contain sm:hidden"
          />
          <Image
            src="/alipo-lockup.png"
            alt="Alipo — Fuel is there"
            width={160}
            height={62}
            priority
            className="hidden h-12 w-auto object-contain sm:block"
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-black text-forest">
            <Radio className="h-4 w-4 text-orange" /> {t('Live map')}
          </Link>
          {onOpenHowItWorks ? (
            <button
              type="button"
              onClick={onOpenHowItWorks}
              className="inline-flex items-center gap-2 text-xs font-black text-forest transition hover:text-[#0b5940]"
            >
              <CircleHelp className="h-4 w-4 text-orange" /> {t('How Alipo works')}
            </button>
          ) : null}
          <Link href="/stations/candidates" className="inline-flex items-center gap-2 text-xs font-bold text-ink transition hover:text-forest">
            <MapPinned className="h-4 w-4" /> {t('Review stations')}
          </Link>
          <Link href="/stations/add" className="inline-flex items-center gap-2 text-xs font-bold text-ink transition hover:text-forest">
            <Plus className="h-4 w-4" /> Add station
          </Link>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-ink transition hover:text-forest">
            <LayoutDashboard className="h-4 w-4" /> {t('Fleet portal')}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {!isStandalone ? (
            <div className="relative lg:hidden" ref={installPanelRef}>
              <button
                type="button"
                onClick={() => {
                  void handleInstallClick();
                }}
                aria-expanded={installOpen}
                aria-haspopup="dialog"
                className="inline-flex h-10 items-center gap-1.5 border border-forest/25 bg-white px-2.5 text-[11px] font-black text-forest transition hover:border-forest sm:px-3"
              >
                <Download className="h-3.5 w-3.5 text-orange" />
                <span className="max-w-[4.5rem] truncate sm:max-w-none">{t('Install')}</span>
              </button>
              {installOpen && !installEvent ? (
                <div
                  role="dialog"
                  aria-label={t('Install Alipo')}
                  className="absolute right-0 top-[calc(100%+8px)] z-40 w-[min(18rem,calc(100vw-2rem))] border border-line bg-white p-3 text-ink shadow-[0_16px_48px_rgba(3,46,32,.18)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-black text-forest">{t('Install to this device')}</p>
                    <button
                      type="button"
                      onClick={() => setInstallOpen(false)}
                      aria-label={t('Close')}
                      className="grid h-7 w-7 place-items-center text-muted hover:text-ink"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {isIos ? (
                    <p className="mt-2 flex items-start gap-2 text-[11px] font-bold leading-4 text-ink">
                      <Share className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange" />
                      {t('Tap Share, then “Add to Home Screen”.')}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] font-bold leading-4 text-muted">
                      {t('On Chrome or Edge, open the browser menu and choose Install app or Add to Home screen.')}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex h-10 items-center border border-line bg-white p-1" aria-label="Language">
            <Languages className="mx-1 h-3.5 w-3.5 text-muted" />
            <button
              type="button"
              onClick={() => setLanguage('en')}
              aria-pressed={language === 'en'}
              className={`h-7 px-2 text-[10px] font-black ${language === 'en' ? 'bg-forest text-white' : 'text-muted'}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ny')}
              aria-pressed={language === 'ny'}
              className={`h-7 px-2 text-[10px] font-black ${language === 'ny' ? 'bg-forest text-white' : 'text-muted'}`}
            >
              CH
            </button>
          </div>
          {onOpenReport && (
            <a
              href="#report-fuel"
              onClick={onOpenReport}
              className="inline-flex h-10 items-center gap-2 bg-orange px-3 text-xs font-black text-white transition hover:bg-[#d95a1c] sm:px-4"
            >
              <Plus className="h-4 w-4" />
              <span className="sm:hidden">{t('Report')}</span>
              <span className="hidden sm:inline">{t('Report fuel')}</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
