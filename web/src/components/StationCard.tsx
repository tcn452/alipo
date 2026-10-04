'use client';

import { useEffect, useRef, useState } from 'react';
import { trackFuelUpdate, trackEvent } from '@/lib/gtag';
import { ArrowUpRight, BadgeCheck, Bell, BellOff, Check, X, CircleX, ChevronDown, Clock3, MapPin, MapPinned, Navigation, RefreshCw } from 'lucide-react';
import { classifyStationBrand, getBrandColor, QUEUE_LABELS, STATUS_CONFIG } from '@/lib/constants';
import { Station, StationReportHistoryItem } from '@/types/alipo';
import { TimeAgo } from '@/components/TimeAgo';
import { useLanguage } from '@/lib/i18n';
import { LocationVote } from '@/components/LocationVote';
import { StationShare } from '@/components/StationShare';
import { savedStationIds } from '@/lib/fuel-alerts';

interface StationCardProps { station: Station; stationNumber: number; onReportClick: (station: Station) => void; onViewMap: (station: Station) => void; onSelectStation?: (station: Station) => void; onDataChanged?: () => void; isSelected?: boolean; }

export function StationCard({ station, stationNumber, onReportClick, onViewMap, onSelectStation, onDataChanged, isSelected }: StationCardProps) {
  const { t } = useLanguage();
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
    <article onClick={() => onSelectStation?.(station)} className={`group min-w-0 border bg-white p-4 transition ${isSelected ? 'border-forest shadow-[inset_4px_0_0_#06452f]' : 'border-line hover:border-[#97a491]'}`}>
      <div className="flex min-w-0 items-start gap-3">
        <span aria-label={`Station ${stationNumber}`} className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black text-white" style={{ backgroundColor: brandColor }}>{stationNumber}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-[.14em] text-muted">{displayBrand}</p>
          <h3 className="mt-1 text-base font-black leading-snug tracking-[-.02em] text-ink">{station.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-[11px] text-muted"><MapPin className="h-3 w-3 shrink-0" /><span>{station.district === station.city ? station.city : `${station.district}, ${station.city}`}</span></p>
        </div>
        <button type="button" onClick={(event) => { event.stopPropagation(); void toggleWatch(); }} aria-label={t(watched ? 'Stop watching' : 'Watch')} title={t(watched ? 'Stop watching' : 'Watch')} aria-pressed={watched} className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:bg-[#e5eddc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest ${watched ? 'bg-[#e5eddc] text-forest' : 'text-muted'}`}>
          {watched ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </button>
      </div>

      {station.needs_location_confirmation ? <LocationVote stationId={station.id} onConfirmed={onDataChanged} /> : null}
      <div className="mt-4 border-y border-line py-3">
        <div className="mb-1 flex items-center justify-between text-[9px] font-bold uppercase tracking-wide text-muted"><span>{t('Fuel availability')}</span><span>{t('Confirm availability')}</span></div>
        <div className="divide-y divide-line/60">{(['petrol', 'diesel'] as const).filter((fuel) => !station.fuel_types?.length || station.fuel_types.includes(fuel)).map((fuel) => {
          const fuelStatus = station[`${fuel}_status`] || 'unknown';
          const stale = station[`${fuel}_is_stale`];
          const config = STATUS_CONFIG[fuelStatus] || STATUS_CONFIG.unknown;
          const label = fuelStatus === 'available' ? 'Available' : fuelStatus === 'out' ? 'Out of fuel' : fuelStatus === 'low' ? 'Low supply' : fuelStatus === 'unknown' ? 'Awaiting report' : config.label;
          return <div key={fuel} className="flex items-center justify-between gap-2 py-2">
            <div className="min-w-0"><strong className="text-sm">{t(fuel === 'petrol' ? 'Petrol' : 'Diesel')}</strong><p className={`mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] ${fuelStatus === 'out' ? 'font-bold text-fuel-out' : 'text-muted'}`}><span className="inline-flex items-center gap-1.5 whitespace-nowrap">{fuelStatus === 'out' ? <CircleX aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-fuel-out" /> : <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dot}`} />}{t(label)}</span>{stale ? <span className="rounded bg-[#f3ece8] px-1 py-0.5 text-[9px] font-bold text-[#795548]">{t('Stale')}</span> : null}</p></div>
            <div className="flex shrink-0 items-center rounded border border-line">
              <button type="button" disabled={confirmingFuel !== null} aria-label={`${t(fuel === 'petrol' ? 'Petrol' : 'Diesel')}: ${t('Still has fuel')}`} onClick={(event) => { event.stopPropagation(); void confirmFuel(fuel, 'available'); }} className="inline-flex min-h-11 items-center gap-1 px-2 text-[11px] font-bold text-forest transition hover:bg-[#e5eddc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest disabled:opacity-50"><Check className="h-3.5 w-3.5" />{t('Still has fuel')}</button>
              <button type="button" disabled={confirmingFuel !== null} aria-label={`${t(fuel === 'petrol' ? 'Petrol' : 'Diesel')}: ${t('Out of fuel')}`} onClick={(event) => { event.stopPropagation(); void confirmFuel(fuel, 'out'); }} className="inline-flex min-h-11 items-center gap-1 border-l border-line px-2 text-[11px] font-bold text-fuel-out transition hover:bg-[#fff1eb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest disabled:opacity-50"><X className="h-3.5 w-3.5" />{t('Out')}</button>
            </div>
          </div>;
        })}</div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <span>{t('Updated')} <TimeAgo date={station.last_reported_at || station.updated} /></span>
        {queue?.duration ? <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{t('Queue')} · {t(queue.duration)}</span> : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a onClick={(event) => event.stopPropagation()} href={`https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 bg-forest px-3 text-xs font-black text-white transition hover:bg-[#0b5940] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"><Navigation className="h-4 w-4 text-[#f5aa54]" />{t('Directions')}</a>
        <button type="button" onClick={(event) => { event.stopPropagation(); onReportClick(station); }} className="inline-flex min-h-11 items-center justify-center gap-2 border border-forest px-3 text-xs font-black text-forest transition hover:bg-[#e5eddc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest">{t('Update fuel')}<ArrowUpRight className="h-4 w-4" /></button>
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1 text-[11px] font-bold text-muted">
        <button type="button" onClick={(event) => { event.stopPropagation(); onViewMap(station); }} className="inline-flex min-h-11 items-center justify-center gap-1.5 hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest"><MapPinned className="h-3.5 w-3.5" />{t('Map')}</button>
        <button type="button" aria-expanded={historyOpen} onClick={(event) => { event.stopPropagation(); void toggleHistory(); }} className="inline-flex min-h-11 items-center justify-center gap-1.5 hover:text-forest focus-visible:outline focus-visible:outline-2 focus-visible:outline-forest">{t(historyOpen ? 'Hide' : 'Details')}<ChevronDown className={`h-3.5 w-3.5 transition ${historyOpen ? 'rotate-180' : ''}`} /></button>
        <StationShare station={station} />
      </div>
      {actionMessage ? <p role="status" className="mt-1 text-[11px] font-bold text-forest">{actionMessage}</p> : null}

      {historyOpen ? (
        <div onClick={(event) => event.stopPropagation()} className="mt-4 border-t border-line pt-3">
          <div className="mb-3 space-y-2 text-[11px] text-muted">{(['petrol', 'diesel'] as const).map((fuel) => {
            const confirmations = station[`${fuel}_confirmations`] || 0;
            const reports = station[`${fuel}_reports`] || 0;
            return <p key={fuel} className="flex items-start gap-1.5"><BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span><strong>{t(fuel === 'petrol' ? 'Petrol' : 'Diesel')}</strong> · {t(confirmations >= 2 ? 'Confirmed by community' : 'Community reports')} · {t(reports === 1 ? '{count} report' : '{count} reports', { count: reports })}{confirmations > 0 ? ` · ${t(confirmations === 1 ? '{count} person reported' : '{count} people reported', { count: confirmations })}` : ''}{station[`${fuel}_reported_at`] ? <> · <TimeAgo date={station[`${fuel}_reported_at`]} /></> : null}</span></p>;
          })}</div>
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
