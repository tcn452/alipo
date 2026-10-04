'use client';

import { useEffect, useRef, useState } from 'react';
import { trackFuelUpdate, trackEvent } from '@/lib/gtag';
import { ArrowUpRight, BadgeCheck, Bell, BellOff, Check, ChevronDown, Clock3, MapPin, MapPinned, Navigation, RefreshCw } from 'lucide-react';
import { classifyStationBrand, getBrandColor, getStationStockStatus, QUEUE_LABELS, STATION_STOCK_CONFIG, STATUS_CONFIG } from '@/lib/constants';
import { Station, StationReportHistoryItem } from '@/types/alipo';
import { TimeAgo } from '@/components/TimeAgo';
import { useLanguage } from '@/lib/i18n';
import { LocationVote } from '@/components/LocationVote';
import { StationShare } from '@/components/StationShare';
import { savedStationIds } from '@/lib/fuel-alerts';

interface StationCardProps { station: Station; stationNumber: number; onReportClick: (station: Station) => void; onViewMap: (station: Station) => void; onSelectStation?: (station: Station) => void; onDataChanged?: () => void; isSelected?: boolean; }

export function StationCard({ station, stationNumber, onReportClick, onViewMap, onSelectStation, onDataChanged, isSelected }: StationCardProps) {
  const { t } = useLanguage();
  const stockStatus = getStationStockStatus(station);
  const status = stockStatus ? STATION_STOCK_CONFIG[stockStatus] : null;
  const queue = station.latest_queue ? QUEUE_LABELS[station.latest_queue] : null;
  const displayBrand = classifyStationBrand(station.name, station.brand);
  const brandColor = getBrandColor(displayBrand);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<StationReportHistoryItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [confirmingFuel, setConfirmingFuel] = useState<'petrol' | 'diesel' | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const submitting = useRef(false);
  const [watched, setWatched] = useState(false);
  useEffect(() => {
    const refresh = () => setWatched(savedStationIds().includes(station.id));
    refresh();
    window.addEventListener('alipo-watch-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('alipo-watch-changed', refresh); window.removeEventListener('storage', refresh); };
  }, [station.id]);

  const confirmFuel = async (fuel: 'petrol' | 'diesel', status: 'available' | 'out') => {
    if (submitting.current) return;
    submitting.current = true;
    setConfirmingFuel(fuel);
    setActionMessage('');
    const details = { station_id: station.id, city: station.city, fuel_type: fuel, fuel_status: status, method: 'one_tap' as const };
    trackFuelUpdate('started', details);
    let responseStatus = 0;
    try {
      const response = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ station, status, fuel_type: fuel }) });
      responseStatus = response.status;
      if (!response.ok) throw new Error('Report unavailable');
      trackFuelUpdate('completed', { ...details, response_status: response.status });
      setActionMessage(t('Your fuel update was saved. Thank you.'));
      setHistory(null);
      onDataChanged?.();
    } catch {
      trackFuelUpdate('failed', { ...details, response_status: responseStatus });
      setActionMessage(t('Unable to save your update. Please try again.'));
    } finally { submitting.current = false; setConfirmingFuel(null); }
  };

  const toggleWatch = async () => {
    const next = !watched;
    let watchedIds = savedStationIds();
    if (next && watchedIds.length >= 50) { setActionMessage(t('You can save up to 50 stations.')); return; }
    watchedIds = next ? Array.from(new Set([...watchedIds, station.id])) : watchedIds.filter((id) => id !== station.id);
    try { localStorage.setItem('alipo-watched-stations', JSON.stringify(watchedIds)); } catch { setActionMessage(t('Unable to save this station on your device.')); return; }
    setWatched(next);
    trackEvent(next ? 'station_saved' : 'station_unsaved', { station_id: station.id });
    window.dispatchEvent(new Event('alipo-watch-changed'));
    setActionMessage(t(next ? 'Watching this station for fuel updates.' : 'Station watch removed.'));
  };

  const toggleHistory = async () => {
    const opening = !historyOpen;
    setHistoryOpen(opening);
    if (!opening || historyLoading) return;
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const response = await fetch(`/api/stations/${encodeURIComponent(station.id)}/reports`, { cache: 'no-store' });
      if (!response.ok) throw new Error('History unavailable');
      const result = await response.json() as { reports?: StationReportHistoryItem[] };
      setHistory(result.reports || []);
    } catch {
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <article onClick={() => onSelectStation?.(station)} className={`group min-w-0 overflow-hidden border bg-white p-4 transition ${isSelected ? 'border-forest shadow-[inset_4px_0_0_#06452f]' : 'border-line hover:border-[#97a491]'}`}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3"><span aria-label={`Station ${stationNumber}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black text-white shadow-sm" style={{ backgroundColor: brandColor }}>{stationNumber}</span><div className="min-w-0"><div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-muted"><span>{displayBrand}</span>{stationNumber === 1 && station.latest_status === 'available' ? <span className="bg-[#e5eddc] px-1.5 py-0.5 text-[8px] text-forest">{t('Best option')}</span> : null}</div><h3 className="truncate text-base font-black tracking-[-.02em] text-ink">{station.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5" /> {station.district}, {station.city}</p></div></div>
        <div className="flex shrink-0 flex-col items-end gap-1">{status ? <span className={`border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${status.color}`}>{t(status.label)}</span> : null}{station.is_stale ? <span className="bg-[#f3ece8] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#795548]">{t('Stale')}</span> : null}</div>
      </div>

      {station.needs_location_confirmation ? <LocationVote stationId={station.id} onConfirmed={onDataChanged} /> : null}
      <div className="mt-4 grid grid-cols-2 gap-3 border-y border-line py-3 text-xs">
        <div><span className="block text-[10px] uppercase tracking-wide text-muted">{t('Fuel availability')}</span><div className="mt-1.5 space-y-2">{(['petrol', 'diesel'] as const).map((fuel) => { const fuelStatus = station[`${fuel}_status`] || 'unknown'; const fuelIsStale = station[`${fuel}_is_stale`]; const config = STATUS_CONFIG[fuelStatus] || STATUS_CONFIG.unknown; const confirmations = station[`${fuel}_confirmations`] || 0; const reportCount = station[`${fuel}_reports`] || 0; return <div key={fuel}><div className="flex items-center justify-between gap-2"><strong>{t(fuel === 'petrol' ? 'Petrol' : 'Diesel')}</strong><span className="flex items-center gap-1"><span className={`border px-1.5 py-0.5 text-[9px] font-black uppercase ${config.color}`}>{t(config.label)}</span>{fuelIsStale ? <span className="bg-[#f3ece8] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#795548]">{t('Stale')}</span> : null}</span></div><div className="mt-0.5 flex items-center justify-end text-[9px] text-muted"><span className="inline-flex items-center gap-0.5"><BadgeCheck className="h-3 w-3" />{confirmations >= 2 ? t('Confirmed by community') : t('Community reports')} · {t(reportCount === 1 ? '{count} report' : '{count} reports', { count: reportCount })}{confirmations > 0 ? ` · ${t(confirmations === 1 ? '{count} person reported' : '{count} people reported', { count: confirmations })}` : ''}</span></div><div className="mt-2 flex flex-wrap gap-2">{(['available', 'out'] as const).map((choice) => <button key={choice} type="button" disabled={confirmingFuel !== null} aria-label={`${fuel === 'petrol' ? t('Petrol') : t('Diesel')}: ${t(choice === 'available' ? 'Still has fuel' : 'Out of fuel')}`} onClick={(event) => { event.stopPropagation(); void confirmFuel(fuel, choice); }} className="min-h-10 border border-forest/30 px-2 text-[10px] font-black text-forest disabled:opacity-50">{t(choice === 'available' ? 'Still has fuel' : 'Out of fuel')}</button>)}</div></div>; })}</div></div>
        <div><span className="block text-[10px] uppercase tracking-wide text-muted">{t('Queue')}</span><strong className="mt-0.5 flex items-center gap-1"><Clock3 className="h-3 w-3" /> {queue?.duration ? t(queue.duration) : t('Unknown')}</strong></div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] text-muted">
          {t('Updated')} <TimeAgo date={station.last_reported_at || station.updated} />
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            onClick={(event) => event.stopPropagation()}
            href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 bg-forest px-3 text-xs font-black text-white transition hover:bg-[#0b5940] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          >
            <Navigation className="h-4 w-4 text-[#f5aa54]" />
            {t('Directions')}
          </a>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onReportClick(station); }}
            className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-forest bg-white px-3 text-xs font-black text-forest transition hover:bg-[#e5eddc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          >
            <span>{t('Update fuel')}</span>
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-2 grid grid-cols-3 divide-x divide-line border border-line bg-[#f8f5ee]">
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); void toggleWatch(); }}
            aria-pressed={watched}
            className={`inline-flex min-h-10 items-center justify-center gap-1.5 px-2 text-[10px] font-black transition hover:bg-white focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest ${watched ? 'bg-[#e5eddc] text-forest' : 'text-muted'}`}
          >
            {watched ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            {t(watched ? 'Stop watching' : 'Watch')}
          </button>
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onViewMap(station); }}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 px-2 text-[10px] font-black text-muted transition hover:bg-white hover:text-forest focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"
          >
            <MapPinned className="h-3.5 w-3.5" />
            {t('Map')}
          </button>
          <button
            type="button"
            aria-expanded={historyOpen}
            onClick={(event) => { event.stopPropagation(); void toggleHistory(); }}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 px-2 text-[10px] font-black text-muted transition hover:bg-white hover:text-forest focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"
          >
            {t(historyOpen ? 'Hide' : 'Details')}
            <ChevronDown className={`h-3.5 w-3.5 transition ${historyOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {actionMessage ? <p role="status" className="mt-2 text-[10px] font-bold text-forest">{actionMessage}</p> : null}
      <StationShare station={station} />

      {historyOpen ? (
        <div onClick={(event) => event.stopPropagation()} className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[.14em] text-muted">
            {t('Report history')}
          </p>
          {historyLoading ? (
            <p role="status" className="flex items-center gap-2 py-3 text-xs text-muted">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {t('Loading history…')}
            </p>
          ) : historyError ? (
            <p className="py-3 text-xs font-bold text-[#9d321d]">{t('Report history could not be loaded.')}</p>
          ) : history?.length ? (
            <ol className="space-y-2">
              {history.map((report) => {
                const reportStatus = STATUS_CONFIG[report.status];
                return (
                  <li key={report.id} className={`flex items-center justify-between gap-3 px-3 py-2 text-[11px] ${report.is_stale ? 'bg-[#f3ece8]' : 'bg-[#f8f5ee]'}`}>
                    <div>
                      <strong className="block text-ink">
                        {t(reportStatus.label)} · <span className="capitalize">{t(report.fuel_type === 'petrol' ? 'Petrol' : report.fuel_type === 'diesel' ? 'Diesel' : 'Both')}</span>
                        {report.is_stale ? <span className="ml-1.5 bg-white px-1.5 py-0.5 text-[9px] font-black uppercase text-[#795548]">{t('Stale')}</span> : null}
                      </strong>
                      <span className="text-muted">
                        {report.queue_estimate ? `${t(QUEUE_LABELS[report.queue_estimate]?.duration || report.queue_estimate)} ${t('Queue').toLowerCase()} · ` : ''}
                        <TimeAgo date={report.created_at} />
                      </span>
                    </div>
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${reportStatus.dot}`} />
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="py-3 text-xs text-muted">{t('No community reports yet.')}</p>
          )}
        </div>
      ) : null}
    </article>
  );
}
