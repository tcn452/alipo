'use client';

import { useEffect, useState } from 'react';
import type { Station } from '@/types/alipo';
import { stationShareCard, stationShareUrl } from '@/lib/station-share';
import { trackEvent } from '@/lib/gtag';
import { useLanguage } from '@/lib/i18n';

export function StationShare({ station }: { station: Station }) {
  const { t } = useLanguage();
  const [card, setCard] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { setCard(null); }, [station.petrol_reported_at, station.diesel_reported_at, station.name]);
  const prepare = async () => {
    setBusy(true);
    try { setCard(await stationShareCard(station, stationShareUrl(window.location.origin, station.id))); }
    catch { setMessage(t('Unable to generate the picture. You can still share the link.')); }
    finally { setBusy(false); }
  };
  const share = async () => {
    const url = stationShareUrl(window.location.origin, station.id);
    if (card && navigator.canShare?.({ files: [card] })) {
      try {
        await navigator.share({ files: [card], title: station.name, text: `${station.name} — check the latest fuel status: ${url}` });
        trackEvent('share', { method: 'native', content_type: 'station_status', item_id: station.id });
      } catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) setMessage(t('Sharing failed. Try downloading the picture.')); }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${station.name} — check fuel status on Alipo: ${url}`)}`, '_blank', 'noopener,noreferrer');
      trackEvent('share', { method: 'whatsapp', content_type: 'station_status', item_id: station.id });
    }
  };
  return <div onClick={(event) => event.stopPropagation()} className="mt-2 text-xs text-forest">
    {!card ? <button type="button" disabled={busy} onClick={() => { void prepare(); }} className="min-h-10 font-black">{t(busy ? 'Preparing picture…' : 'Share fuel status')}</button> : <div className="flex flex-wrap gap-3">
      <button type="button" onClick={() => { void share(); }} className="min-h-10 font-black">{t('Share on WhatsApp')}</button>
      <button type="button" onClick={() => { const url = URL.createObjectURL(card); const a = document.createElement('a'); a.href = url; a.download = card.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }} className="min-h-10 underline">{t('Download picture')}</button>
    </div>}
    {message ? <p role="status">{message} <button type="button" onClick={() => { void share(); }}>{t('Share link')}</button></p> : null}
  </div>;
}
