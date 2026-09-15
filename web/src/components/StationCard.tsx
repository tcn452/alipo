'use client';

import { useState } from 'react';
import { ArrowUpRight, ChevronDown, Clock3, History, MapPin, RefreshCw } from 'lucide-react';
import { getBrandColor, QUEUE_LABELS, STATUS_CONFIG } from '@/lib/constants';
import { Station, StationReportHistoryItem } from '@/types/alipo';
import { TimeAgo } from '@/components/TimeAgo';
import { useLanguage } from '@/lib/i18n';

interface StationCardProps { station: Station; stationNumber: number; onReportClick: (station: Station) => void; onSelectStation?: (station: Station) => void; isSelected?: boolean; }

export function StationCard({ station, stationNumber, onReportClick, onSelectStation, isSelected }: StationCardProps) {
  const { t } = useLanguage();
  const status = STATUS_CONFIG[station.latest_status || 'unknown'] || STATUS_CONFIG.unknown;
  const queue = station.latest_queue ? QUEUE_LABELS[station.latest_queue] : null;
  const brandColor = getBrandColor(station.brand);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<StationReportHistoryItem[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(false);

  const toggleHistory = async () => {
    const opening = !historyOpen;
    setHistoryOpen(opening);
    if (!opening || history !== null || historyLoading) return;
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const response = await fetch(`/api/stations/${encodeURIComponent(station.id)}/reports`);
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
    <article onClick={() => onSelectStation?.(station)} className={`group cursor-pointer border bg-white p-4 transition ${isSelected ? 'border-forest shadow-[inset_4px_0_0_#06452f]' : 'border-line hover:border-[#97a491]'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3"><span aria-label={`Station ${stationNumber}`} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black text-white shadow-sm" style={{ backgroundColor: brandColor }}>{stationNumber}</span><div className="min-w-0"><div className="mb-2 text-[10px] font-black uppercase tracking-[.14em] text-muted">{station.brand}</div><h3 className="truncate text-base font-black tracking-[-.02em] text-ink">{station.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5" /> {station.district}, {station.city}</p></div></div>
        <span className={`shrink-0 border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${status.color}`}>{t(status.label)}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 border-y border-line py-3 text-xs">
        <div><span className="block text-[10px] uppercase tracking-wide text-muted">{t('Fuel types')}</span><strong className="mt-0.5 block capitalize">{station.fuel_types.map((type) => t(type === 'petrol' ? 'Petrol' : 'Diesel')).join(' & ')}</strong></div>
        <div><span className="block text-[10px] uppercase tracking-wide text-muted">{t('Queue')}</span><strong className="mt-0.5 flex items-center gap-1"><Clock3 className="h-3 w-3" /> {queue?.duration ? t(queue.duration) : t('Unknown')}</strong></div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3"><span className="text-[11px] text-muted">{t('Updated')} <TimeAgo date={station.last_reported_at || station.updated} /></span><div className="flex items-center gap-3"><button type="button" aria-expanded={historyOpen} onClick={(event) => { event.stopPropagation(); void toggleHistory(); }} className="inline-flex items-center gap-1 text-xs font-black text-muted hover:text-forest"><History className="h-3.5 w-3.5" /> {t('History')} <ChevronDown className={`h-3.5 w-3.5 transition ${historyOpen ? 'rotate-180' : ''}`} /></button><a href="#report-fuel" onClick={(event) => { event.stopPropagation(); onReportClick(station); }} className="inline-flex items-center gap-1 text-xs font-black text-forest">{t('Update')} <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a></div></div>

      {historyOpen ? <div onClick={(event) => event.stopPropagation()} className="mt-4 border-t border-line pt-3"><p className="mb-2 text-[10px] font-black uppercase tracking-[.14em] text-muted">{t('Recent community reports')}</p>{historyLoading ? <p role="status" className="flex items-center gap-2 py-3 text-xs text-muted"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> {t('Loading history…')}</p> : historyError ? <p className="py-3 text-xs font-bold text-[#9d321d]">{t('Report history could not be loaded.')}</p> : history?.length ? <ol className="space-y-2">{history.map((report) => { const reportStatus = report.is_stale ? STATUS_CONFIG.stale : STATUS_CONFIG[report.status]; return <li key={report.id} className={`flex items-center justify-between gap-3 px-3 py-2 text-[11px] ${report.is_stale ? 'bg-[#f3ece8]' : 'bg-[#f8f5ee]'}`}><div><strong className="block text-ink">{t(report.is_stale ? 'Stale' : reportStatus.label)} · <span className="capitalize">{t(report.fuel_type === 'petrol' ? 'Petrol' : report.fuel_type === 'diesel' ? 'Diesel' : 'Both')}</span></strong><span className="text-muted">{report.queue_estimate ? `${t(QUEUE_LABELS[report.queue_estimate]?.duration || report.queue_estimate)} ${t('Queue').toLowerCase()} · ` : ''}<TimeAgo date={report.created_at} /></span></div><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${reportStatus.dot}`} /></li>; })}</ol> : <p className="py-3 text-xs text-muted">{t('No community reports yet.')}</p>}</div> : null}
    </article>
  );
}
