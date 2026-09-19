'use client';

import { useEffect, useId, useRef } from 'react';
import { LocateFixed, X } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface LocationHelpSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  isSamsung: boolean;
}

export function LocationHelpSheet({ isOpen, onClose, onRetry, isSamsung }: LocationHelpSheetProps) {
  const { t } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

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
              <p className="mt-1 text-xs leading-5 text-muted">
                {isSamsung
                  ? t('Samsung Internet needs location enabled in the browser and on your phone before it can ask for this site.')
                  : t('Your browser blocked location for this site. Allow it, then try again.')}
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

        {isSamsung ? (
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
