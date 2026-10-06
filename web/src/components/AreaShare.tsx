'use client';
import { useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { SHARE_AREAS, areaIdForCity, areaShareUrl, type AreaFuel } from '@/lib/area-share';
import { trackAreaShare } from '@/lib/gtag';
import { useLanguage } from '@/lib/i18n';

export function AreaShare({ city, fuel: selectedFuel }: { city: string; fuel: 'all' | AreaFuel }) {
  const { t } = useLanguage();
  const panel = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const [area, setArea] = useState<string>(areaIdForCity(city));
  const [fuel, setFuel] = useState<AreaFuel>(selectedFuel === 'all' ? 'petrol' : selectedFuel);
  const [message, setMessage] = useState('');
  useEffect(() => { if (!open) { setArea(areaIdForCity(city)); setFuel(selectedFuel === 'all' ? 'petrol' : selectedFuel); } }, [city, selectedFuel, open]);
  const url = () => areaShareUrl(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin, area, fuel);
  const share = (method: 'whatsapp' | 'facebook') => {
    const link = url();
    const text = `${SHARE_AREAS.find((item) => item.id === area)?.name} ${fuel} report — check the latest updates on Alipo: ${link}`;
    const target = method === 'whatsapp'
      ? `https://wa.me/?text=${encodeURIComponent(text)}`
      : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
    window.open(target, '_blank', 'noopener,noreferrer');
    trackAreaShare(method, area, fuel);
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setMessage(t('Link copied'));
      trackAreaShare('copy_link', area, fuel);
    } catch { setMessage(t('Unable to copy. Please use WhatsApp or Facebook.')); }
  };
  return <details ref={panel} onToggle={() => { setOpen(!!panel.current?.open); setMessage(''); }} className="mb-4 border border-forest/20 bg-white">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-xs font-bold text-forest [&::-webkit-details-marker]:hidden"><Share2 className="h-4 w-4" />{t('Share an area fuel report')}</summary>
    {open ? <div className="border-t border-line p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-bold text-muted">{t('Area')}<select value={area} onChange={(event) => { setArea(event.target.value); setMessage(''); }} className="mt-1 min-h-11 w-full min-w-0 border border-line bg-white px-2 text-xs text-ink">{SHARE_AREAS.map((item) => <option key={item.id} value={item.id}>{t(item.name)}</option>)}</select></label>
        <label className="text-[11px] font-bold text-muted">{t('Fuel type')}<select value={fuel} onChange={(event) => { setFuel(event.target.value as AreaFuel); setMessage(''); }} className="mt-1 min-h-11 w-full border border-line bg-white px-2 text-xs text-ink"><option value="petrol">{t('Petrol')}</option><option value="diesel">{t('Diesel')}</option></select></label>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-muted">{t('Share the link for live updates. The preview may show an earlier snapshot.')}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => share('whatsapp')} className="inline-flex min-h-11 items-center justify-center bg-forest px-2 text-xs font-bold text-white">{t('Share on WhatsApp')}</button>
        <button type="button" onClick={() => share('facebook')} className="inline-flex min-h-11 items-center justify-center border border-forest px-2 text-xs font-bold text-forest">{t('Share on Facebook')}</button>
      </div>
      <button type="button" onClick={() => { void copyLink(); }} className="mt-1 min-h-11 text-xs font-bold text-forest underline">{t('Copy link')}</button>
      {message ? <p role="status" className="mt-1 text-xs text-muted">{message}</p> : null}
    </div> : null}
  </details>;
}
