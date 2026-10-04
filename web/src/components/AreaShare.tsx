'use client';
import { useEffect, useRef, useState } from 'react';
import { Share2, Download, RefreshCw } from 'lucide-react';
import { SHARE_AREAS, areaIdForCity, areaShareCard, areaShareUrl, type AreaFuel, type AreaReport } from '@/lib/area-share';
import { trackEvent, trackAreaShare } from '@/lib/gtag';
import { useLanguage } from '@/lib/i18n';

export function AreaShare({ city, fuel: selectedFuel }: { city: string; fuel: 'all' | AreaFuel }) {
  const { t } = useLanguage();
  const panel = useRef<HTMLDetailsElement>(null);
  const [open, setOpen] = useState(false);
  const [area, setArea] = useState<string>(areaIdForCity(city));
  const [fuel, setFuel] = useState<AreaFuel>(selectedFuel === 'all' ? 'petrol' : selectedFuel);
  const [report, setReport] = useState<AreaReport | null>(null);
  const [card, setCard] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!open) { setArea(areaIdForCity(city)); setFuel(selectedFuel === 'all' ? 'petrol' : selectedFuel); } }, [city, selectedFuel, open]);
  const url = () => areaShareUrl(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin, area, fuel);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const controller = new AbortController();
    setBusy(true); setCard(null); setReport(null); setError('');
    void (async () => {
      try {
        const response = await fetch(`/api/share/area?area=${encodeURIComponent(area)}&fuel=${fuel}`, { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Report unavailable');
        const data = await response.json() as AreaReport;
        if (cancelled) return;
        setReport(data);
        const image = await areaShareCard(data, areaShareUrl(process.env.NEXT_PUBLIC_SITE_URL || window.location.origin, area, fuel));
        if (!cancelled) setCard(image);
      } catch { if (!cancelled) setError(t('Unable to prepare the area report. Please try again.')); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [area, fuel, open, t]);
  const share = async (linkOnly = false) => {
    const text = `${report?.areaName || SHARE_AREAS.find((item) => item.id === area)?.name} ${fuel} report on Alipo: ${url()}`;
    if (!linkOnly && card && navigator.canShare?.({ files: [card] })) {
      try {
        await navigator.share({ files: [card], title: `Alipo ${fuel} area report`, text });
        trackAreaShare('native', area, fuel);
      } catch (failure) { if (!(failure instanceof Error && failure.name === 'AbortError')) setError(t('Sharing failed. Try downloading the picture.')); }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
      trackAreaShare('whatsapp', area, fuel);
    }
  };
  return <details ref={panel} onToggle={() => setOpen(!!panel.current?.open)} className="mb-4 border border-forest/20 bg-white">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-xs font-bold text-forest [&::-webkit-details-marker]:hidden"><Share2 className="h-4 w-4" />{t('Share an area fuel report')}</summary>
    {open ? <div className="border-t border-line p-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] font-bold text-muted">{t('Area')}<select value={area} onChange={(event) => setArea(event.target.value)} className="mt-1 min-h-11 w-full min-w-0 border border-line bg-white px-2 text-xs text-ink">{SHARE_AREAS.map((item) => <option key={item.id} value={item.id}>{t(item.name)}</option>)}</select></label>
        <label className="text-[11px] font-bold text-muted">{t('Fuel type')}<select value={fuel} onChange={(event) => setFuel(event.target.value as AreaFuel)} className="mt-1 min-h-11 w-full border border-line bg-white px-2 text-xs text-ink"><option value="petrol">{t('Petrol')}</option><option value="diesel">{t('Diesel')}</option></select></label>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-muted">{t('A fresh snapshot of the whole area. Stale reports stay labelled. Open the link for live updates.')}</p>
      {busy ? <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-muted"><RefreshCw className="h-3.5 w-3.5 animate-spin" />{t('Preparing picture…')}</p> : report ? <p className="mt-2 text-xs font-bold text-forest">{t('{count} stations reporting fuel', { count: report.available })} · {t('{count} stations in the report', { count: report.total })}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" disabled={busy || !card} onClick={() => { void share(); }} className="inline-flex min-h-11 items-center justify-center gap-1.5 bg-forest px-2 text-xs font-bold text-white disabled:opacity-50"><Share2 className="h-4 w-4" />{t('Share on WhatsApp')}</button>
        <button type="button" disabled={!card || busy} onClick={() => { if (!card) return; const objectUrl = URL.createObjectURL(card); const anchor = document.createElement('a'); anchor.href = objectUrl; anchor.download = card.name; anchor.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); trackEvent('share_card_downloaded', { content_type: 'area_status', area_id: area, fuel_type: fuel }); }} className="inline-flex min-h-11 items-center justify-center gap-1.5 border border-forest px-2 text-xs font-bold text-forest disabled:opacity-50"><Download className="h-4 w-4" />{t('Download picture')}</button>
      </div>
      <button type="button" onClick={() => { void share(true); }} className="mt-1 min-h-11 text-xs font-bold text-forest underline">{t('Share link')}</button>
      {error ? <p role="status" className="mt-1 text-xs text-fuel-out">{error}</p> : null}
    </div> : null}
  </details>;
}
