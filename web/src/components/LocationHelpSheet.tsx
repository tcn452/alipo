'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ExternalLink, LocateFixed, Settings, X } from 'lucide-react';
import {
  isAndroidDevice,
  isSamsungInternet,
  isStandalonePwa,
  openAndroidAppListSettings,
  openAndroidLocationSettings,
} from '@/lib/geolocation';
import { useLanguage } from '@/lib/i18n';

interface LocationHelpSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
}

export function LocationHelpSheet({ isOpen, onClose, onRetry }: LocationHelpSheetProps) {
  const { t } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [isPwa, setIsPwa] = useState(false);
  const [isSamsung, setIsSamsung] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsPwa(isStandalonePwa());
    setIsSamsung(isSamsungInternet());
    setIsAndroid(isAndroidDevice());
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtitle = isPwa
    ? t('Installed Alipo uses your phone app permissions. Android often will not show a website location prompt inside the app.')
    : isSamsung
      ? t('Samsung Internet needs location enabled in the browser and on your phone before it can ask for this site.')
      : t('Your browser blocked location for this site. Allow it, then try again.');

  return (
    <div className="fixed inset-0 z-[2600] flex items-end justify-center bg-[#032e20]/65 p-0 sm:items-center sm:p-4" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default" aria-label={t('Close')} onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-md border border-line bg-[#fbf8f1] p-5 shadow-[0_24px_80px_rgba(3,46,32,.35)] sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center bg-[#dfead7] text-forest">
              <LocateFixed className="h-5 w-5" />
            </span>
            <div>
              <h2 id={titleId} className="text-lg font-black tracking-[-0.02em] text-ink">
                {t('Turn on location for Alipo')}
              </h2>
              <p className="mt-1 text-xs leading-5 text-muted">{subtitle}</p>
              <p className="mt-2 text-[11px] font-bold leading-4 text-[#9a5b12]">
                {t('Browsers cannot show the location prompt again after it was blocked. Use the shortcuts below, then return and try again.')}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('Close')}
            className="grid h-9 w-9 place-items-center border border-line text-muted hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isAndroid ? (
          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => {
                openAndroidLocationSettings();
              }}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-orange px-3 text-xs font-black text-white hover:bg-[#d95a1c]"
            >
              <Settings className="h-4 w-4" />
              {t('Open phone Location settings')}
            </button>
            {isPwa ? (
              <button
                type="button"
                onClick={() => {
                  openAndroidAppListSettings();
                }}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 border-2 border-forest bg-white px-3 text-xs font-black text-forest hover:bg-[#e5eddc]"
              >
                <ExternalLink className="h-4 w-4" />
                {t('Open Apps settings (then tap Alipo)')}
              </button>
            ) : null}
            <p className="text-[10px] leading-4 text-muted">
              {isPwa
                ? t('After opening Apps settings: Alipo → Permissions → Location → Allow. Then come back here.')
                : t('Also allow Location for this site via the lock icon in the address bar if your browser shows one.')}
            </p>
          </div>
        ) : null}

        {isPwa ? (
          <ol className="mt-4 space-y-3 text-xs leading-5 text-ink">
            <li className="border border-line bg-white p-3">
              <strong className="block font-black">{t('1. Open Android app settings')}</strong>
              <span className="text-muted">
                {t('Long-press the Alipo app icon → App info (or Info). Or go to Android Settings → Apps → Alipo.')}
              </span>
            </li>
            <li className="border border-line bg-white p-3">
              <strong className="block font-black">{t('2. Allow Location for Alipo')}</strong>
              <span className="text-muted">
                {t('Tap Permissions → Location → Allow (or Allow only while using the app).')}
              </span>
            </li>
            <li className="border border-line bg-white p-3">
              <strong className="block font-black">{t('3. Phone location must be on')}</strong>
              <span className="text-muted">
                {t('In Android Settings → Location, turn Location on, then return to Alipo and try again.')}
              </span>
            </li>
            {isSamsung ? (
              <li className="border border-dashed border-orange/40 bg-[#fef3e3] p-3">
                <strong className="block font-black text-[#9a5b12]">{t('Samsung Internet tip')}</strong>
                <span className="text-muted">
                  {t('Also enable Location under Samsung Internet → Settings → Site permissions, then reinstall or reopen the Alipo app.')}
                </span>
              </li>
            ) : null}
          </ol>
        ) : isSamsung ? (
          <ol className="mt-4 space-y-3 text-xs leading-5 text-ink">
            <li className="border border-line bg-white p-3">
              <strong className="block font-black">{t('1. Allow Samsung Internet location')}</strong>
              <span className="text-muted">
                {t('Open the Samsung Internet menu → Settings → Sites and downloads → Site permissions → Location, and turn it on.')}
              </span>
            </li>
            <li className="border border-line bg-white p-3">
              <strong className="block font-black">{t('2. Allow this site')}</strong>
              <span className="text-muted">
                {t('Tap the lock or site info icon beside the address bar → Permissions → Location → Allow.')}
              </span>
            </li>
            <li className="border border-line bg-white p-3">
              <strong className="block font-black">{t('3. Phone location must be on')}</strong>
              <span className="text-muted">
                {t('In Android Settings → Location, turn Location on. Then open Apps → Samsung Internet → Permissions → Location → Allow.')}
              </span>
            </li>
          </ol>
        ) : (
          <ol className="mt-4 space-y-3 text-xs leading-5 text-ink">
            <li className="border border-line bg-white p-3">
              <strong className="block font-black">{t('1. Site permission')}</strong>
              <span className="text-muted">
                {t('Tap the lock or site info icon beside the address bar, allow Location, then return here.')}
              </span>
            </li>
            <li className="border border-line bg-white p-3">
              <strong className="block font-black">{t('2. Try again')}</strong>
              <span className="text-muted">{t('After allowing location, tap Use my location again.')}</span>
            </li>
          </ol>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 flex-1 items-center justify-center border border-line bg-white text-xs font-bold text-muted hover:text-ink"
          >
            {t('Close')}
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onRetry();
            }}
            className="inline-flex h-11 flex-[1.4] items-center justify-center gap-2 bg-forest text-xs font-black text-white hover:bg-[#0b5940]"
          >
            <LocateFixed className="h-4 w-4 text-[#f5aa54]" />
            {t('Try location again')}
          </button>
        </div>
      </aside>
    </div>
  );
}
