'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Truck, Fuel, Compass, AlertTriangle, TrendingUp, CheckCircle, Clock, MapPin, ArrowRight } from 'lucide-react';

export default function DashboardOverviewPage() {
  const [fleetMetrics] = useState({
    totalVehicles: 12,
    activeVehicles: 9,
    allocatedLitresMonth: 4500,
    consumedLitresMonth: 2840,
    activeAnomalies: 1,
    savedHoursEstimate: '38h'
  });

  const recentRefuels = [
    { id: '1', plate: 'BT 4421', driver: 'Chifundo Banda', station: 'TotalEnergies City Centre', litres: 65, cost: 164450, time: '25m ago', status: 'verified' },
    { id: '2', plate: 'LL 9012', driver: 'Blessings Phiri', station: 'Puma Area 47', litres: 45, cost: 113850, time: '2h ago', status: 'verified' },
    { id: '3', plate: 'ZA 1140', driver: 'Taonga Gondwe', station: 'Petroda Kanengo', litres: 80, cost: 202400, time: '4h ago', status: 'anomaly_flag' },
    { id: '4', plate: 'BT 8830', driver: 'Kelvin Chirwa', station: 'Puma Gateway Mall', litres: 50, cost: 126500, time: '5h ago', status: 'verified' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Fleet Operations Overview</h1>
          <p className="text-xs text-gray-500">Live fuel tracking, allocation quotas and driver refuel logging</p>
        </div>

        <Link
          href="/dashboard/dispatch"
          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
        >
          <Compass className="w-4 h-4" />
          <span>Dispatch Recommended Station</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-2">
            <span>ACTIVE FLEET</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">
            {fleetMetrics.activeVehicles} <span className="text-xs text-gray-400 font-normal">/ {fleetMetrics.totalVehicles} Vehicles</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium flex items-center">
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            <span>75% fleet active today</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-2">
            <span>FUEL ALLOCATION (SEPT)</span>
            <Fuel className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-gray-900">
            {fleetMetrics.consumedLitresMonth.toLocaleString()} <span className="text-xs text-gray-400 font-normal">/ {fleetMetrics.allocatedLitresMonth.toLocaleString()} L</span>
          </div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '63%' }} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-2">
            <span>TIME SAVED (QUEUES)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {fleetMetrics.savedHoursEstimate}
          </div>
          <div className="mt-2 text-[11px] text-gray-500">
            Calculated via Alipo Smart Dispatch
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-2">
            <span>FRAUD / ANOMALIES</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {fleetMetrics.activeAnomalies} Flag
          </div>
          <div className="mt-2 text-[11px] text-amber-700 font-medium">
            Vehicle ZA 1140 (Consumption spike)
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Activity & Quick Dispatch */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Refuels (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Recent Refueling Events
            </h2>
            <Link href="/dashboard/reports" className="text-xs text-emerald-600 hover:underline font-semibold">
              View All Logs
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 border-y border-gray-200">
                <tr>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Driver</th>
                  <th className="py-2.5 px-3">Station</th>
                  <th className="py-2.5 px-3">Litres</th>
                  <th className="py-2.5 px-3">Total (MWK)</th>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {recentRefuels.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3 font-bold text-gray-900">{r.plate}</td>
                    <td className="py-3 px-3">{r.driver}</td>
                    <td className="py-3 px-3 text-gray-600">{r.station}</td>
                    <td className="py-3 px-3 font-mono">{r.litres} L</td>
                    <td className="py-3 px-3 font-mono">MWK {r.cost.toLocaleString()}</td>
                    <td className="py-3 px-3 text-gray-400">{r.time}</td>
                    <td className="py-3 px-3">
                      {r.status === 'verified' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                          Review Flag
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Dispatch Action Card (4 cols) */}
        <div className="lg:col-span-4 bg-emerald-900 text-white rounded-2xl p-5 shadow-md flex flex-col justify-between space-y-4">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center mb-3">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold tracking-tight">Need Fuel For a Vehicle?</h3>
            <p className="text-xs text-emerald-200 mt-1">
              Alipo calculates current station queue lengths, distance, and verified fuel levels to recommend the fastest refueling spot.
            </p>
          </div>

          <div className="bg-emerald-950/60 p-3 rounded-xl border border-emerald-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-emerald-200">
              <span>Lilongwe Area 47</span>
              <span className="text-emerald-400 font-bold">Puma (Short Queue)</span>
            </div>
            <div className="flex items-center justify-between text-emerald-200">
              <span>Blantyre Chichiri</span>
              <span className="text-emerald-400 font-bold">Total (Available)</span>
            </div>
          </div>

          <Link
            href="/dashboard/dispatch"
            className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold py-2.5 rounded-xl text-xs transition-colors"
          >
            <span>Launch Dispatch Engine</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
