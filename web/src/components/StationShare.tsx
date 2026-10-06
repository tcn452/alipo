'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import type { Station } from '@/types/alipo';
import { stationShareUrl } from '@/lib/station-share';
import { trackEvent } from '@/lib/gtag';
import { useLanguage } from '@/lib/i18n';

export function StationShare({ station }: { station: Station }) {
  const { t } = useLanguage();
  const menu = useRef<HTMLDetailsElement>(null);
  const [message, setMessage] = useState('');
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (menu.current && !menu.current.contains(event.target as Node)) menu.current.open = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && menu.current?.open) { menu.current.open = false; menu.current.querySelector('summary')?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const shareUrl = () => stationShareUrl(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin, station.id);
  const share = (method: 'whatsapp' | 'facebook') => {
    const url = shareUrl();
    const target = method === 'whatsapp'
      ? `https://wa.me/?text=${encodeURIComponent(`${station.name} — check the latest fuel status on Alipo: ${url}`)}`
      : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(target, '_blank', 'noopener,noreferrer');
    trackEvent('share', { method, content_type: 'station_status', item_id: station.id });
    if (menu.current) menu.current.open = false;
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      setMessage(t('Link copied'));
      trackEvent('share', { method: 'copy_link', content_type: 'station_status', item_id: station.id });
    } catch { setMessage(t('Unable to copy. Please use WhatsApp or Facebook.')); }
  };
  return <details ref={menu} onClick={(event) => event.stopPropagation()} onToggle={() => { const isOpen = !!menu.current?.open; setOpen(isOpen); if (isOpen) setMessage(''); }} className="relative text-[11px] text-muted [&_summary::-webkit-details-marker]:hidden">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-1.5 font-bold hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"><Share2 className="h-3.5 w-3.5" />{t('Share')}</summary>
    <div className="absolute bottom-full right-0 z-20 mb-2 w-60 max-w-[calc(100vw-3rem)] border border-line bg-white p-3 text-xs text-forest shadow-lg">
      <p className="mb-2 font-black">{t('Share station status')}</p>
      <p className="mb-2 text-[11px] leading-5 text-muted">{t('Share the link for live updates. The preview may show an earlier snapshot.')}</p>
      <button type="button" onClick={() => share('whatsapp')} className="flex min-h-11 w-full items-center justify-center bg-forest px-3 font-bold text-white">{t('Share on WhatsApp')}</button>
      <button type="button" onClick={() => share('facebook')} className="min-h-11 w-full text-left font-bold">{t('Share on Facebook')}</button>
      <button type="button" onClick={() => { void copyLink(); }} className="min-h-11 w-full text-left font-bold">{t('Copy link')}</button>
      {message ? <p role="status" className="mt-1 text-[11px]">{message}</p> : null}
    </div>
  </details>;
}
