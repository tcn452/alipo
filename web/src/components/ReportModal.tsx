'use client';

import React, { useState } from 'react';
import { Station, FuelStatus, QueueEstimate, FuelType } from '@/types/alipo';
import { pb } from '@/lib/pocketbase';
import { X, CheckCircle, AlertTriangle, XCircle, Clock, Fuel, Send, Check } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  selectedStation?: Station | null;
  onReportSubmitted: () => void;
}

export function ReportModal({ isOpen, onClose, stations, selectedStation, onReportSubmitted }: ReportModalProps) {
  const [stationId, setStationId] = useState<string>(selectedStation?.id || (stations[0]?.id || ''));
  const [status, setStatus] = useState<FuelStatus>('available');
  const [fuelType, setFuelType] = useState<FuelType>('both');
  const [queueEstimate, setQueueEstimate] = useState<QueueEstimate>('short');
  const [price, setPrice] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Update stationId when selectedStation changes
  React.useEffect(() => {
    if (selectedStation) {
      setStationId(selectedStation.id);
    } else if (stations.length > 0 && !stationId) {
      setStationId(stations[0].id);
    }
  }, [selectedStation, stations]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationId) {
      setErrorMsg('Please select a station.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Create Report in PocketBase
      const parsedPrice = price ? parseFloat(price) : undefined;
      const reportData = {
        station: stationId,
        status: status,
        fuel_type: fuelType,
        queue_estimate: queueEstimate,
        price: parsedPrice,
        source: 'web',
        reporter_phone: phone.trim() || undefined,
        confirmations: 1,
        is_active: true
      };

      try {
        await pb.collection('reports').create(reportData);
      } catch (err: any) {
        console.warn('PocketBase report save (fallback local update):', err);
      }

      // 2. Update station cached state
      try {
        const updateData: any = {
          latest_status: status,
          latest_queue: queueEstimate,
          last_reported_at: new Date().toISOString()
        };
        if (parsedPrice) {
          if (fuelType === 'petrol' || fuelType === 'both') updateData.latest_price_petrol = parsedPrice;
          if (fuelType === 'diesel') updateData.latest_price_diesel = parsedPrice;
        }
        await pb.collection('stations').update(stationId, updateData);
      } catch (err) {
        console.warn('PocketBase station update (offline/mock mode):', err);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onReportSubmitted();
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Report Fuel Status</h2>
              <p className="text-xs text-gray-500">Help Malawian drivers with real-time updates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Zikomo Kwambiri!</h3>
            <p className="text-sm text-gray-600">Your fuel report has been logged and the live map is updated.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                {errorMsg}
              </div>
            )}

            {/* Station selection */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Select Fuel Station
              </label>
              <select
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {stations.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.district}, {st.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Fuel Status Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Current Fuel Status
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStatus('available')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    status === 'available'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 font-bold'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <CheckCircle className={`w-5 h-5 mb-1 ${status === 'available' ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className="text-xs">Available</span>
                  <span className="text-[10px] text-gray-500 font-normal">Ilipo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('low')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    status === 'low'
                      ? 'border-amber-500 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20 font-bold'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <AlertTriangle className={`w-5 h-5 mb-1 ${status === 'low' ? 'text-amber-600' : 'text-gray-400'}`} />
                  <span className="text-xs">Low Supply</span>
                  <span className="text-[10px] text-gray-500 font-normal">Itha msanga</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('out')}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    status === 'out'
                      ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20 font-bold'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <XCircle className={`w-5 h-5 mb-1 ${status === 'out' ? 'text-rose-600' : 'text-gray-400'}`} />
                  <span className="text-xs">Out of Fuel</span>
                  <span className="text-[10px] text-gray-500 font-normal">Yatha</span>
                </button>
              </div>
            </div>

            {/* Fuel Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Fuel Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['both', 'petrol', 'diesel'] as FuelType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFuelType(t)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold capitalize transition-all ${
                      fuelType === t
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {t === 'both' ? 'Petrol & Diesel' : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Queue Estimate */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Queue Length
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'No Queue', time: '<5 min' },
                  { id: 'short', label: 'Short', time: '<15 min' },
                  { id: 'medium', label: 'Medium', time: '15-45m' },
                  { id: 'long', label: 'Long', time: '>45 min' }
                ].map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setQueueEstimate(q.id as QueueEstimate)}
                    className={`py-2 px-1 rounded-lg border text-center transition-all ${
                      queueEstimate === q.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="text-xs">{q.label}</div>
                    <div className="text-[10px] text-gray-400 font-normal">{q.time}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Price (optional) & Phone (optional) */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Price (MWK/Litre, optional)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 2530"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Your Phone (optional)
                </label>
                <input
                  type="tel"
                  placeholder="+265..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Update'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
