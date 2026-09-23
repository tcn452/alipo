'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, CheckCircle2, CircleAlert, MapPinOff, PencilLine, Send, X, XCircle } from 'lucide-react';
import { FuelStatus, FuelType, QueueEstimate, Station } from '@/types/alipo';
import { useLanguage } from '@/lib/i18n';
import { SponsorBanner } from '@/components/SponsorBanner';

interface ReportModalProps { isOpen: boolean; onClose: () => void; stations: Station[]; selectedStation?: Station | null; onReportSubmitted: () => void; }

const STATUS_OPTIONS = [
  { value: 'available', title: 'Fuel available', detail: 'Station is serving', icon: CheckCircle2 },
  { value: 'low', title: 'Running low', detail: 'Supply may finish soon', icon: CircleAlert },
  { value: 'out', title: 'No fuel', detail: 'Pumps are dry', icon: XCircle },
] as const;

export function ReportModal({ isOpen, onClose, stations, selectedStation, onReportSubmitted }: ReportModalProps) {
  const { t } = useLanguage();
  const [stationId, setStationId] = useState(selectedStation?.id || stations[0]?.id || '');
  const [status, setStatus] = useState<FuelStatus>('available');
  const [reportType, setReportType] = useState<'fuel' | 'missing_station' | 'name_suggestion'>('fuel');
  const [suggestedName, setSuggestedName] = useState('');
  const [fuelType, setFuelType] = useState<FuelType>('both');
  const [queueEstimate, setQueueEstimate] = useState<QueueEstimate>('short');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('Your report helps keep Malawi moving.');
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
    if (!stationId) return setErrorMsg(t('Please select a station.'));
    setIsSubmitting(true); setErrorMsg('');
    try {
      const station = stations.find((item) => item.id === stationId);
      if (!station) throw new Error(t('Please select a valid station.'));
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station, report_type: reportType, status, fuel_type: fuelType, queue_estimate: queueEstimate, phone: phone.trim() || undefined, suggested_name: suggestedName.trim() || undefined }),
      });
      const result = await response.json() as { error?: string; votes?: number; confirmed?: boolean };
      if (!response.ok) throw new Error(t('Unable to submit this report.'));
      setSuccessMessage(reportType === 'name_suggestion'
        ? result.confirmed ? 'The station name is now confirmed and updated.' : 'Suggestion saved. One more matching vote will confirm this name.'
        : 'Your report helps keep Malawi moving.');
      setSuccess(true);
      onReportSubmitted();
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : t('Unable to submit this report.')); } finally { setIsSubmitting(false); }
  };

  return <div id="report-fuel" className={`report-modal fixed inset-0 z-[2000] place-items-center overflow-y-auto bg-[#032e20]/75 p-3 backdrop-blur-sm ${isOpen ? 'report-modal-open' : ''}`} role="dialog" aria-modal="true" aria-labelledby="report-title">
    <div className="my-5 w-full max-w-[620px] border border-white/20 bg-[#fbf8f1] shadow-[0_30px_100px_rgba(0,0,0,.3)]">
      <header className="flex items-start justify-between bg-forest px-5 py-5 text-white sm:px-7"><div><p className="eyebrow text-[#f5aa54]">{t('Community update')}</p><h2 id="report-title" className="mt-1 text-2xl font-black tracking-[-.03em]">{t("What's the fuel situation?")}</h2><p className="mt-1 text-xs text-white/60">{t('One quick report can save someone a long trip.')}</p></div><a href="#" onClick={closeModal} aria-label={t('Close report form')} className="grid h-9 w-9 place-items-center border border-white/20 text-white"><X className="h-4 w-4" /></a></header>

      {success ? <div className="px-5 py-8 text-center sm:px-7"><div className="mx-auto grid h-14 w-14 place-items-center bg-[#dfead7] text-forest"><Check className="h-7 w-7" /></div><h3 className="mt-4 text-2xl font-black">Zikomo kwambiri.</h3><p className="mt-1.5 text-sm text-muted">{t(successMessage)}</p><SponsorBanner placement="post_report" city={selectedStation?.city} /><div className="mt-6 flex justify-center"><button type="button" onClick={() => { setSuccess(false); closeModal(); }} className="inline-flex min-h-11 items-center justify-center bg-forest px-8 text-xs font-black text-white transition hover:bg-[#0b5940]">{t('Done')}</button></div></div> :
      <form onSubmit={handleSubmit} className="space-y-6 p-5 sm:p-7">
        {errorMsg && <p className="border border-[#c9583c]/30 bg-[#f9e1d9] p-3 text-xs font-bold text-[#9d321d]">{errorMsg}</p>}
        <label className="block">
          <span className="mb-2 block text-[11px] font-black uppercase tracking-[.14em] text-muted">{t('Fuel station')}</span>
          <select value={stationId} onChange={(event) => setStationId(event.target.value)} className="h-12 w-full border border-line bg-white px-3 text-sm font-bold outline-none focus:border-forest">
            {stations.map((station) => <option key={station.id} value={station.id}>{station.name} — {station.district}</option>)}
          </select>
        </label>

        {reportType === 'fuel' ? (
          <>
            <fieldset>
              <legend className="mb-2 text-[11px] font-black uppercase tracking-[.14em] text-muted">{t('Fuel situation')}</legend>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_OPTIONS.map(({ value, title, detail, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatus(value)}
                    className={`flex flex-col items-center justify-center border p-3 text-center transition min-h-[96px] ${
                      status === value
                        ? 'border-forest bg-[#e5eddc] text-forest shadow-xs'
                        : 'border-line bg-white hover:border-[#98a493]'
                    }`}
                  >
                    <Icon className="h-6 w-6 shrink-0" />
                    <strong className="mt-1.5 block text-xs leading-tight">{t(title)}</strong>
                    <span className="mt-0.5 block text-[9px] opacity-70 leading-tight">{t(detail)}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-[11px] font-black uppercase tracking-[.14em] text-muted">{t('Fuel type')}</legend>
              <div className="grid grid-cols-3 gap-2">
                {(['both', 'petrol', 'diesel'] as FuelType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFuelType(type)}
                    className={`h-11 border text-xs font-black capitalize transition ${
                      fuelType === type ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink hover:border-forest'
                    }`}
                  >
                    {t(type === 'both' ? 'Both' : type === 'petrol' ? 'Petrol' : 'Diesel')}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-[11px] font-black uppercase tracking-[.14em] text-muted">{t('Queue length')}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { id: 'none', label: 'None', time: '< 5 min' },
                  { id: 'short', label: 'Short', time: '< 15 min' },
                  { id: 'medium', label: 'Medium', time: '15–45 min' },
                  { id: 'long', label: 'Long', time: '> 45 min' }
                ].map((queue) => (
                  <button
                    key={queue.id}
                    type="button"
                    onClick={() => setQueueEstimate(queue.id as QueueEstimate)}
                    className={`border px-2 py-2.5 text-center transition ${
                      queueEstimate === queue.id ? 'border-forest bg-[#e5eddc] text-forest font-bold' : 'border-line bg-white text-ink hover:border-forest'
                    }`}
                  >
                    <strong className="block text-xs">{t(queue.label)}</strong>
                    <span className="text-[9px] text-muted">{t(queue.time)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        ) : reportType === 'name_suggestion' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-forest">{t('Correct station name')}</span>
              <button
                type="button"
                onClick={() => setReportType('fuel')}
                className="text-xs font-bold text-muted underline hover:text-forest"
              >
                {t('Back to fuel report')}
              </button>
            </div>
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[.14em] text-muted">{t('Suggested station name')}</span>
              <input
                value={suggestedName}
                onChange={(event) => setSuggestedName(event.target.value)}
                required
                minLength={2}
                maxLength={200}
                placeholder={t('Enter the correct station name')}
                className="h-12 w-full border border-line bg-white px-3 text-sm font-bold outline-none focus:border-forest"
              />
            </label>
            <p className="border-l-2 border-forest bg-[#e5eddc] px-4 py-3 text-xs leading-5 text-forest">
              {t('Two matching suggestions from different phone numbers will confirm and update the station name.')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#9d321d]">{t('Station does not exist')}</span>
              <button
                type="button"
                onClick={() => setReportType('fuel')}
                className="text-xs font-bold text-muted underline hover:text-forest"
              >
                {t('Back to fuel report')}
              </button>
            </div>
            <p className="border-l-2 border-[#c9583c] bg-[#f9e1d9]/60 px-4 py-3 text-xs leading-5 text-[#713021]">
              {t('Five reports from different phone numbers will remove this station from public results. Reports are retained for review.')}
            </p>
          </div>
        )}

        <label className="block">
          <span className="mb-2 block text-[11px] font-black uppercase tracking-[.14em] text-muted">
            {t('Phone')} <em className="font-normal normal-case text-muted">({t(reportType === 'fuel' ? 'optional' : 'required to prevent duplicate reports')})</em>
          </span>
          <input
            type="tel"
            required={reportType !== 'fuel'}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+265..."
            className="h-11 w-full border border-line bg-white px-3 text-sm outline-none focus:border-forest"
          />
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 bg-forest text-sm font-black text-white transition hover:bg-[#0b5940] disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {t(isSubmitting ? 'Submitting report...' : 'Submit report')}
        </button>

        {reportType === 'fuel' ? (
          <div className="border-t border-line/70 pt-3 text-center">
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted">
              <span>{t('Need to report a missing station or name error?')}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setReportType('name_suggestion')}
                  className="font-bold text-forest underline hover:text-orange"
                >
                  {t('Correct station name')}
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setReportType('missing_station')}
                  className="font-bold text-[#9d321d] underline hover:text-orange"
                >
                  {t('Station does not exist')}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <p className="text-center text-[10px] text-muted">{t('Reports are timestamped and cross-checked by the community.')}</p>
      </form>}
    </div>
  </div>;
}
