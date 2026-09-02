'use client';

import React, { useState } from 'react';
import { Compass, MapPin, Fuel, Clock, Navigation, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { DispatchRecommendation } from '@/types/alipo';
import { QUEUE_LABELS } from '@/lib/constants';

const DEMO_RECOMMENDATIONS: DispatchRecommendation[] = [
  {
    id: 'stat_llw_001',
    name: 'Puma Energy Area 47',
    brand: 'Puma',
    city: 'Lilongwe',
    district: 'Area 47 Sector 2',
    latitude: -13.9572,
    longitude: 33.7915,
    distance_km: 2.8,
    status: 'available',
    queue: 'short',
    verified: true,
    price_petrol: 2530,
    price_diesel: 2734,
    score: 15
  },
  {
    id: 'stat_llw_002',
    name: 'TotalEnergies City Centre',
    brand: 'Total',
    city: 'Lilongwe',
    district: 'City Centre Sector 1',
    latitude: -13.9712,
    longitude: 33.7845,
    distance_km: 4.1,
    status: 'available',
    queue: 'medium',
    verified: true,
    price_petrol: 2530,
    price_diesel: 2734,
    score: 28
  },
  {
    id: 'stat_llw_005',
    name: 'Mount Meru Area 10',
    brand: 'Mount Meru',
    city: 'Lilongwe',
    district: 'Area 10',
    latitude: -13.9450,
    longitude: 33.8050,
    distance_km: 5.4,
    status: 'available',
    queue: 'none',
    verified: false,
    price_petrol: 2530,
    price_diesel: 2734,
    score: 35
  }
];

export default function DispatchPage() {
  const [selectedCity, setSelectedCity] = useState('Lilongwe');
  const [fuelType, setFuelType] = useState<'petrol' | 'diesel'>('diesel');
  const [vehicleLocation, setVehicleLocation] = useState('Area 47 Industrial / Kanengo');
  const [recommendations, setRecommendations] = useState<DispatchRecommendation[]>(DEMO_RECOMMENDATIONS);
  const [isCalculating, setIsCalculating] = useState(false);
  const [dispatchedStation, setDispatchedStation] = useState<string | null>(null);

  const handleRunDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    setDispatchedStation(null);

    setTimeout(() => {
      setIsCalculating(false);
      setRecommendations(DEMO_RECOMMENDATIONS);
    }, 500);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Smart Dispatch Engine</h1>
        <p className="text-xs text-gray-500">
          Recommends the top 3 optimal fuel stations for any vehicle based on queue delays, distance and verification confidence (Spec §8)
        </p>
      </div>

      {/* Input Parameters Box */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <form onSubmit={handleRunDispatch} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Operating City
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Lilongwe">Lilongwe</option>
              <option value="Blantyre">Blantyre</option>
              <option value="Mzuzu">Mzuzu</option>
              <option value="Zomba">Zomba</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Current Vehicle Location
            </label>
            <input
              type="text"
              value={vehicleLocation}
              onChange={(e) => setVehicleLocation(e.target.value)}
              placeholder="e.g. Area 47, Kanengo, Limbe..."
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Fuel Requirement
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['diesel', 'petrol'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFuelType(t)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                    fuelType === t
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isCalculating}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all active:scale-95"
            >
              <Compass className="w-4 h-4" />
              <span>{isCalculating ? 'Computing Top 3...' : 'Find Best Stations'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recommendations Output */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            Top 3 Recommended Stations (Ranked by Minimum Wait & Proximity)
          </h2>
          <span className="text-xs text-gray-500 font-medium">Includes 2 fallback options</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {recommendations.map((rec, index) => {
            const queueInfo = QUEUE_LABELS[rec.queue] || QUEUE_LABELS.short;
            const isRankOne = index === 0;

            return (
              <div
                key={rec.id}
                className={`bg-white rounded-2xl border p-5 shadow-sm relative flex flex-col justify-between ${
                  isRankOne
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                    : 'border-gray-200'
                }`}
              >
                {isRankOne && (
                  <div className="absolute -top-3 left-5 bg-emerald-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full shadow">
                    ★ #1 Optimal Station
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mt-1 mb-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      {rec.brand}
                    </span>
                    {rec.verified && (
                      <span className="flex items-center text-xs font-semibold text-emerald-600 space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-gray-900 text-base">{rec.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center">
                    <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400" />
                    <span>{rec.district}</span>
                  </p>

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center">
                        <Navigation className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        Distance:
                      </span>
                      <strong className="text-gray-900">{rec.distance_km} km</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center">
                        <Clock className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        Estimated Queue:
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] border ${queueInfo.color}`}>
                        {queueInfo.duration}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 flex items-center">
                        <Fuel className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {fuelType === 'diesel' ? 'Diesel Price' : 'Petrol Price'}:
                      </span>
                      <strong className="font-mono text-gray-900">
                        MWK {fuelType === 'diesel' ? rec.price_diesel?.toLocaleString() : rec.price_petrol?.toLocaleString()}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-gray-100">
                  {dispatchedStation === rec.id ? (
                    <div className="w-full bg-emerald-50 text-emerald-700 py-2 rounded-xl text-xs font-bold text-center flex items-center justify-center space-x-1 border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Dispatched to Driver SMS</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDispatchedStation(rec.id)}
                      className="w-full flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold py-2 rounded-xl text-xs transition-colors"
                    >
                      <span>Dispatch to Driver</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
