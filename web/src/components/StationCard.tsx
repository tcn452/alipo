'use client';

import { ArrowUpRight, Clock3, MapPin, ShieldCheck } from 'lucide-react';
import { QUEUE_LABELS, STATUS_CONFIG } from '@/lib/constants';
import { Station } from '@/types/alipo';
import { TimeAgo } from '@/components/TimeAgo';

interface StationCardProps { station: Station; onReportClick: (station: Station) => void; onSelectStation?: (station: Station) => void; isSelected?: boolean; }

export function StationCard({ station, onReportClick, onSelectStation, isSelected }: StationCardProps) {
  const status = STATUS_CONFIG[station.latest_status || 'unknown'] || STATUS_CONFIG.unknown;
  const queue = station.latest_queue ? QUEUE_LABELS[station.latest_queue] : null;

  return (
    <article onClick={() => onSelectStation?.(station)} className={`group cursor-pointer border bg-white p-4 transition ${isSelected ? 'border-forest shadow-[inset_4px_0_0_#06452f]' : 'border-line hover:border-[#97a491]'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0"><div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-muted"><span>{station.brand}</span>{station.verified ? <span className="inline-flex items-center gap-1 text-forest"><ShieldCheck className="h-3.5 w-3.5" /> Verified</span> : <span>Mapped</span>}</div><h3 className="truncate text-base font-black tracking-[-.02em] text-ink">{station.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5" /> {station.district}, {station.city}</p></div>
        <span className={`shrink-0 border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${status.color}`}>{status.label}</span>
      </div>

      <div className="mt-4 grid grid-cols-3 border-y border-line py-3 text-xs">
        <div><span className="block text-[10px] uppercase tracking-wide text-muted">Petrol</span><strong className="mt-0.5 block font-mono">{station.latest_price_petrol ? `K${station.latest_price_petrol.toLocaleString()}` : '—'}</strong></div>
        <div><span className="block text-[10px] uppercase tracking-wide text-muted">Diesel</span><strong className="mt-0.5 block font-mono">{station.latest_price_diesel ? `K${station.latest_price_diesel.toLocaleString()}` : '—'}</strong></div>
        <div><span className="block text-[10px] uppercase tracking-wide text-muted">Queue</span><strong className="mt-0.5 flex items-center gap-1"><Clock3 className="h-3 w-3" /> {queue?.duration || 'Unknown'}</strong></div>
      </div>

      <div className="mt-3 flex items-center justify-between"><span className="text-[11px] text-muted">Updated <TimeAgo date={station.last_reported_at || station.updated} /></span><a href="#report-fuel" onClick={(event) => { event.stopPropagation(); onReportClick(station); }} className="inline-flex items-center gap-1 text-xs font-black text-forest">Update <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a></div>
    </article>
  );
}
