'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import type { Station } from '@/types/alipo';
import { stationShareCard, stationShareUrl } from '@/lib/station-share';
import { trackEvent } from '@/lib/gtag';
import { useLanguage } from '@/lib/i18n';

export function StationShare({ station }: { station: Station }) {
  const { t } = useLanguage();
  const menu = useRef<HTMLDetailsElement>(null);
  const [card, setCard] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const preparing = useRef(false);
  useEffect(() => { setCard(null); }, [station.petrol_reported_at, station.diesel_reported_at, station.name]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && menu.current?.open) { menu.current.open = false; menu.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const shareUrl = () => stationShareUrl(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin, station.id);
  const prepare = async () => {
    if (preparing.current || card) return;
    preparing.current = true;
    setBusy(true);
    setMessage('');
    try { setCard(await stationShareCard(station, shareUrl())); }
    catch { setMessage(t('Unable to generate the picture. You can still share the link.')); }
    finally { preparing.current = false; setBusy(false); }
  };
  const share = async (linkOnly = false) => {
    const url = shareUrl();
    if (!linkOnly && card && navigator.canShare?.({ files: [card] })) {
      try {
        await navigator.share({ files: [card], title: station.name, text: `${station.name} — check the latest fuel status: ${url}` });
        trackEvent('share', { method: 'native', content_type: 'station_status', item_id: station.id });
        if (menu.current) menu.current.open = false;
      } catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) setMessage(t('Sharing failed. Try downloading the picture.')); }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${station.name} — check fuel status on Alipo: ${url}`)}`, '_blank', 'noopener,noreferrer');
      trackEvent('share', { method: 'whatsapp', content_type: 'station_status', item_id: station.id });
      if (menu.current) menu.current.open = false;
    }
  };
  return <details ref={menu} onClick={(event) => event.stopPropagation()} onToggle={() => { const isOpen = !!menu.current?.open; setOpen(isOpen); if (isOpen) void prepare(); }} className="relative text-[11px] text-muted [&_summary::-webkit-details-marker]:hidden">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1.5 font-bold hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"><Share2 className="h-3.5 w-3.5" />{t('Share')}</summary>
    <div className="absolute bottom-full right-0 z-20 mb-2 w-60 max-w-[calc(100vw-3rem)] border border-line bg-white p-3 text-xs text-forest shadow-lg">
      <p className="mb-2 font-black">{t('Share station status')}</p>
      <button type="button" disabled={busy} onClick={() => { void share(); }} className="flex min-h-11 w-full items-center justify-center bg-forest px-3 font-bold text-white disabled:opacity-60">{t(busy ? 'Preparing picture…' : 'Share on WhatsApp')}</button>
      <button type="button" disabled={!card} onClick={() => { if (!card) return; const url = URL.createObjectURL(card); const a = document.createElement('a'); a.href = url; a.download = card.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }} className="min-h-11 w-full text-left font-bold disabled:opacity-50">{t('Download picture')}</button>
      <button type="button" onClick={() => { void share(true); }} className="min-h-11 w-full text-left font-bold">{t('Share link')}</button>
      {message ? <p role="status" className="mt-1 text-[11px]">{message}</p> : null}
    </div>
  </details>;
}
