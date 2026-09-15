'use client';

import { useState } from 'react';
import { ArrowUpRight, ChevronDown, Clock3, History, MapPin, RefreshCw } from 'lucide-react';
import { getBrandColor, QUEUE_LABELS, STATUS_CONFIG } from '@/lib/constants';
import { Station, StationReportHistoryItem } from '@/types/alipo';
import { TimeAgo } from '@/components/TimeAgo';

interface StationCardProps { station: Station; stationNumber: number; onReportClick: (station: Station) => void; onSelectStation?: (station: Station) => void; isSelected?: boolean; }

export function StationCard({ station, stationNumber, onReportClick, onSelectStation, isSelected }: StationCardProps) {
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
        <span className={`shrink-0 border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${status.color}`}>{status.label}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 border-y border-line py-3 text-xs">
        <div><span className="block text-[10px] uppercase tracking-wide text-muted">Fuel types</span><strong className="mt-0.5 block capitalize">{station.fuel_types.join(' & ')}</strong></div>
        <div><span className="block text-[10px] uppercase tracking-wide text-muted">Queue</span><strong className="mt-0.5 flex items-center gap-1"><Clock3 className="h-3 w-3" /> {queue?.duration || 'Unknown'}</strong></div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3"><span className="text-[11px] text-muted">Updated <TimeAgo date={station.last_reported_at || station.updated} /></span><div className="flex items-center gap-3"><button type="button" aria-expanded={historyOpen} onClick={(event) => { event.stopPropagation(); void toggleHistory(); }} className="inline-flex items-center gap-1 text-xs font-black text-muted hover:text-forest"><History className="h-3.5 w-3.5" /> History <ChevronDown className={`h-3.5 w-3.5 transition ${historyOpen ? 'rotate-180' : ''}`} /></button><a href="#report-fuel" onClick={(event) => { event.stopPropagation(); onReportClick(station); }} className="inline-flex items-center gap-1 text-xs font-black text-forest">Update <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a></div></div>

      {historyOpen ? <div onClick={(event) => event.stopPropagation()} className="mt-4 border-t border-line pt-3"><p className="mb-2 text-[10px] font-black uppercase tracking-[.14em] text-muted">Recent community reports</p>{historyLoading ? <p role="status" className="flex items-center gap-2 py-3 text-xs text-muted"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Loading history…</p> : historyError ? <p className="py-3 text-xs font-bold text-[#9d321d]">Report history could not be loaded.</p> : history?.length ? <ol className="space-y-2">{history.map((report) => { const reportStatus = STATUS_CONFIG[report.status]; return <li key={report.id} className="flex items-center justify-between gap-3 bg-[#f8f5ee] px-3 py-2 text-[11px]"><div><strong className="block text-ink">{reportStatus.label} · <span className="capitalize">{report.fuel_type}</span></strong><span className="text-muted">{report.queue_estimate ? `${QUEUE_LABELS[report.queue_estimate]?.duration || report.queue_estimate} queue · ` : ''}<TimeAgo date={report.created_at} /></span></div><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${reportStatus.dot}`} /></li>; })}</ol> : <p className="py-3 text-xs text-muted">No community reports yet.</p>}</div> : null}
    </article>
  );
}
