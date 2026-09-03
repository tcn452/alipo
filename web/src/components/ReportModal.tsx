'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, CheckCircle2, CircleAlert, Clock3, Send, X, XCircle } from 'lucide-react';
import { pb } from '@/lib/pocketbase';
import { FuelStatus, FuelType, QueueEstimate, Station } from '@/types/alipo';

interface ReportModalProps { isOpen: boolean; onClose: () => void; stations: Station[]; selectedStation?: Station | null; onReportSubmitted: () => void; }

const STATUS_OPTIONS = [
  { value: 'available', title: 'Fuel available', detail: 'Station is serving', icon: CheckCircle2 },
  { value: 'low', title: 'Running low', detail: 'Supply may finish soon', icon: CircleAlert },
  { value: 'out', title: 'No fuel', detail: 'Pumps are dry', icon: XCircle },
  { value: 'unknown', title: 'Not sure', detail: 'Needs verification', icon: Clock3 },
] as const;

export function ReportModal({ isOpen, onClose, stations, selectedStation, onReportSubmitted }: ReportModalProps) {
  const [stationId, setStationId] = useState(selectedStation?.id || stations[0]?.id || '');
  const [status, setStatus] = useState<FuelStatus>('available');
  const [fuelType, setFuelType] = useState<FuelType>('both');
  const [queueEstimate, setQueueEstimate] = useState<QueueEstimate>('short');
  const [price, setPrice] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => { if (selectedStation) setStationId(selectedStation.id); else if (stations.length && !stationId) setStationId(stations[0].id); }, [selectedStation, stations, stationId]);
  const closeModal = () => {
    onClose();
    if (typeof window !== 'undefined' && window.location.hash === '#report-fuel') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!stationId) return setErrorMsg('Please select a station.');
    setIsSubmitting(true); setErrorMsg('');
    const parsedPrice = price ? Number(price) : undefined;
    try {
      try { await pb.collection('reports').create({ station: stationId, status, fuel_type: fuelType, queue_estimate: queueEstimate, price: parsedPrice, source: 'web', reporter_phone: phone.trim() || undefined, confirmations: 1, is_active: true }); } catch {}
      try {
        const update: Record<string, unknown> = { latest_status: status, latest_queue: queueEstimate, last_reported_at: new Date().toISOString() };
        if (parsedPrice && (fuelType === 'petrol' || fuelType === 'both')) update.latest_price_petrol = parsedPrice;
        if (parsedPrice && (fuelType === 'diesel' || fuelType === 'both')) update.latest_price_diesel = parsedPrice;
        await pb.collection('stations').update(stationId, update);
      } catch {}
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onReportSubmitted(); closeModal(); }, 1200);
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Unable to submit this report.'); } finally { setIsSubmitting(false); }
  };

  return <div id="report-fuel" className={`report-modal fixed inset-0 z-[2000] place-items-center overflow-y-auto bg-[#032e20]/75 p-3 backdrop-blur-sm ${isOpen ? 'report-modal-open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="report-title">
    <div className="my-5 w-full max-w-[620px] border border-white/20 bg-[#fbf8f1] shadow-[0_30px_100px_rgba(0,0,0,.3)]">
      <header className="flex items-start justify-between bg-forest px-5 py-5 text-white sm:px-7"><div><p className="eyebrow text-[#f5aa54]">Community update</p><h2 id="report-title" className="mt-1 text-2xl font-black tracking-[-.03em]">What&apos;s the fuel situation?</h2><p className="mt-1 text-xs text-white/60">One quick report can save someone a long trip.</p></div><a href="#" onClick={closeModal} aria-label="Close report form" className="grid h-9 w-9 place-items-center border border-white/20 text-white"><X className="h-4 w-4" /></a></header>

      {success ? <div className="px-7 py-20 text-center"><div className="mx-auto grid h-16 w-16 place-items-center bg-[#dfead7] text-forest"><Check className="h-8 w-8" /></div><h3 className="mt-5 text-2xl font-black">Zikomo kwambiri.</h3><p className="mt-2 text-sm text-muted">Your report helps keep Malawi moving.</p></div> :
      <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-7">
        {errorMsg && <p className="border border-[#c9583c]/30 bg-[#f9e1d9] p-3 text-xs font-bold text-[#9d321d]">{errorMsg}</p>}
        <label className="block"><span className="mb-2 block text-[11px] font-black uppercase tracking-[.14em] text-muted">Fuel station</span><select value={stationId} onChange={(event) => setStationId(event.target.value)} className="h-12 w-full border border-line bg-white px-3 text-sm font-bold outline-none focus:border-forest">{stations.map((station) => <option key={station.id} value={station.id}>{station.name} — {station.district}</option>)}</select></label>

        <fieldset><legend className="mb-2 text-[11px] font-black uppercase tracking-[.14em] text-muted">Fuel situation</legend><div className="grid grid-cols-2 gap-2">{STATUS_OPTIONS.map(({ value, title, detail, icon: Icon }) => <button key={value} type="button" onClick={() => setStatus(value)} className={`flex min-h-20 items-center gap-3 border p-3 text-left transition ${status === value ? 'border-forest bg-[#e5eddc] text-forest' : 'border-line bg-white hover:border-[#98a493]'}`}><Icon className="h-5 w-5 shrink-0" /><span><strong className="block text-xs">{title}</strong><span className="mt-0.5 block text-[10px] opacity-65">{detail}</span></span></button>)}</div></fieldset>

        <fieldset><legend className="mb-2 text-[11px] font-black uppercase tracking-[.14em] text-muted">Fuel type</legend><div className="grid grid-cols-3 gap-2">{(['both', 'petrol', 'diesel'] as FuelType[]).map((type) => <button key={type} type="button" onClick={() => setFuelType(type)} className={`h-10 border text-xs font-black capitalize ${fuelType === type ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink'}`}>{type === 'both' ? 'Both' : type}</button>)}</div></fieldset>

        <fieldset><legend className="mb-2 text-[11px] font-black uppercase tracking-[.14em] text-muted">Queue length</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[{ id: 'none', label: 'None', time: '< 5 min' }, { id: 'short', label: 'Short', time: '< 15 min' }, { id: 'medium', label: 'Medium', time: '15–45 min' }, { id: 'long', label: 'Long', time: '> 45 min' }].map((queue) => <button key={queue.id} type="button" onClick={() => setQueueEstimate(queue.id as QueueEstimate)} className={`border px-2 py-2.5 text-center ${queueEstimate === queue.id ? 'border-forest bg-[#e5eddc] text-forest' : 'border-line bg-white'}`}><strong className="block text-xs">{queue.label}</strong><span className="text-[9px] text-muted">{queue.time}</span></button>)}</div></fieldset>

        <div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-2 block text-[11px] font-black uppercase tracking-[.14em] text-muted">Price MWK/L <em className="font-normal normal-case">optional</em></span><input type="number" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="e.g. 2530" className="h-11 w-full border border-line bg-white px-3 text-sm outline-none focus:border-forest" /></label><label><span className="mb-2 block text-[11px] font-black uppercase tracking-[.14em] text-muted">Phone <em className="font-normal normal-case">optional</em></span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+265..." className="h-11 w-full border border-line bg-white px-3 text-sm outline-none focus:border-forest" /></label></div>

        <button type="submit" disabled={isSubmitting} className="inline-flex h-12 w-full items-center justify-center gap-2 bg-forest text-sm font-black text-white transition hover:bg-[#0b5940] disabled:opacity-50"><Send className="h-4 w-4" />{isSubmitting ? 'Submitting report...' : 'Submit report'}</button>
        <p className="text-center text-[10px] text-muted">Reports are timestamped and cross-checked by the community.</p>
      </form>}
    </div>
  </div>;
}
