'use client';

import React from 'react';
import { Station } from '@/types/alipo';
import { STATUS_CONFIG, QUEUE_LABELS } from '@/lib/constants';
import { formatTimeAgo } from '@/lib/utils';
import { ShieldCheck, MapPin, Clock, PlusCircle, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

interface StationCardProps {
  station: Station;
  onReportClick: (station: Station) => void;
  onSelectStation?: (station: Station) => void;
  isSelected?: boolean;
}

export function StationCard({ station, onReportClick, onSelectStation, isSelected }: StationCardProps) {
  const statusKey = station.latest_status || 'unknown';
  const statusInfo = STATUS_CONFIG[statusKey] || STATUS_CONFIG.unknown;
  const queueInfo = station.latest_queue ? QUEUE_LABELS[station.latest_queue] : null;

  return (
    <div
      onClick={() => onSelectStation && onSelectStation(station)}
      className={`bg-white rounded-xl border p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
        isSelected
          ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/20'
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {/* Brand & Verified */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
              {station.brand}
            </span>
            {station.verified && (
              <span className="flex items-center text-xs font-medium text-emerald-600 space-x-1" title="Station manager verified">
                <ShieldCheck className="w-3.5 h-3.5 fill-emerald-100" />
                <span className="hidden sm:inline">Verified</span>
              </span>
            )}
          </div>

          {/* Station Name */}
          <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-700 transition-colors">
            {station.name}
          </h3>

          {/* Location & District */}
          <p className="flex items-center text-xs text-gray-500 mt-1">
            <MapPin className="w-3.5 h-3.5 mr-1 text-gray-400 shrink-0" />
            <span>{station.district}, {station.city}</span>
            {station.distance_km !== undefined && (
              <span className="ml-2 font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                {station.distance_km} km away
              </span>
            )}
          </p>
        </div>

        {/* Primary Status Badge */}
        <div className="shrink-0 text-right">
          <div className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.color}`}>
            <span className={`w-2 h-2 rounded-full ${statusInfo.dot} animate-pulse`} />
            <span>{statusInfo.label}</span>
          </div>
        </div>
      </div>

      {/* Fuel details & Queue Info */}
      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
        {/* Queue status */}
        <div className="flex items-center text-gray-600">
          <Clock className="w-3.5 h-3.5 mr-1 text-gray-400 shrink-0" />
          <span>Queue: </span>
          {queueInfo ? (
            <span className={`ml-1 font-semibold px-1.5 py-0.5 rounded border text-[11px] ${queueInfo.color}`}>
              {queueInfo.duration}
            </span>
          ) : (
            <span className="ml-1 text-gray-400">Unknown</span>
          )}
        </div>

        {/* Last updated recency */}
        <div className="flex items-center justify-end text-gray-500 text-[11px]">
          <span>Updated {formatTimeAgo(station.last_reported_at || station.updated)}</span>
        </div>
      </div>

      {/* Pricing / Types & Quick Action */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs">
          {station.latest_price_petrol ? (
            <div className="bg-gray-50 px-2 py-1 rounded text-gray-700 font-mono text-[11px]">
              Petrol: <strong className="text-gray-900">MWK {station.latest_price_petrol.toLocaleString()}</strong>
            </div>
          ) : null}
          {station.latest_price_diesel ? (
            <div className="bg-gray-50 px-2 py-1 rounded text-gray-700 font-mono text-[11px]">
              Diesel: <strong className="text-gray-900">MWK {station.latest_price_diesel.toLocaleString()}</strong>
            </div>
          ) : null}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onReportClick(station);
          }}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Update</span>
        </button>
      </div>
    </div>
  );
}
