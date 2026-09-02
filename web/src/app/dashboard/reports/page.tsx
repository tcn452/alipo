'use client';

import React, { useState } from 'react';
import { FileText, Download, Filter, Calendar, Search, ArrowDownToLine } from 'lucide-react';

interface RefuelLog {
  id: string;
  date: string;
  plate: string;
  driver: string;
  station: string;
  litres: number;
  costMwk: number;
  odometerKm: number;
}

const INITIAL_LOGS: RefuelLog[] = [
  { id: '1', date: '2026-09-02 08:30', plate: 'BT 4421', driver: 'Chifundo Banda', station: 'TotalEnergies City Centre', litres: 65, costMwk: 177710, odometerKm: 124500 },
  { id: '2', date: '2026-09-02 07:15', plate: 'LL 9012', driver: 'Blessings Phiri', station: 'Puma Area 47', litres: 45, costMwk: 113850, odometerKm: 89300 },
  { id: '3', date: '2026-09-01 16:40', plate: 'ZA 1140', driver: 'Taonga Gondwe', station: 'Petroda Kanengo', litres: 80, costMwk: 218720, odometerKm: 210400 },
  { id: '4', date: '2026-09-01 14:10', plate: 'BT 8830', driver: 'Kelvin Chirwa', station: 'Puma Gateway Mall', litres: 50, costMwk: 126500, odometerKm: 65120 },
  { id: '5', date: '2026-08-31 11:25', plate: 'LL 3399', driver: 'Mercy Mwale', station: 'TotalEnergies Chichiri', litres: 90, costMwk: 246060, odometerKm: 142000 }
];

export default function ReportsPage() {
  const [logs] = useState<RefuelLog[]>(INITIAL_LOGS);
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter(
    (l) =>
      l.plate.toLowerCase().includes(search.toLowerCase()) ||
      l.driver.toLowerCase().includes(search.toLowerCase()) ||
      l.station.toLowerCase().includes(search.toLowerCase())
  );

  const totalLitres = filteredLogs.reduce((acc, curr) => acc + curr.litres, 0);
  const totalSpend = filteredLogs.reduce((acc, curr) => acc + curr.costMwk, 0);

  const handleExportCsv = () => {
    const headers = ['ID', 'Date', 'License Plate', 'Driver', 'Station', 'Litres', 'Total Cost (MWK)', 'Odometer (KM)'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.date,
      l.plate,
      l.driver,
      `"${l.station}"`,
      l.litres,
      l.costMwk,
      l.odometerKm
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `alipo_refuel_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Fuel Consumption & Export</h1>
          <p className="text-xs text-gray-500">Audit refuel transactions, volume consumed and export reporting data</p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all"
        >
          <ArrowDownToLine className="w-4 h-4" />
          <span>Export CSV Report</span>
        </button>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase">Filtered Total Consumption</span>
          <div className="text-2xl font-black text-gray-900 mt-1">
            {totalLitres.toLocaleString()} <span className="text-sm font-normal text-gray-500">Litres</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase">Total Fuel Expenditure</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            MWK {totalSpend.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter logs by vehicle, driver or station..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
        <div className="text-xs text-gray-500 font-medium">
          Showing <strong className="text-gray-900">{filteredLogs.length}</strong> refuel events
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
            <tr>
              <th className="py-3 px-4">Date & Time</th>
              <th className="py-3 px-4">Vehicle Plate</th>
              <th className="py-3 px-4">Driver</th>
              <th className="py-3 px-4">Station</th>
              <th className="py-3 px-4">Volume</th>
              <th className="py-3 px-4">Total Cost</th>
              <th className="py-3 px-4">Odometer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
            {filteredLogs.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="py-3 px-4 text-gray-500">{l.date}</td>
                <td className="py-3 px-4 font-bold text-gray-900">{l.plate}</td>
                <td className="py-3 px-4">{l.driver}</td>
                <td className="py-3 px-4 text-gray-600">{l.station}</td>
                <td className="py-3 px-4 font-mono">{l.litres} L</td>
                <td className="py-3 px-4 font-mono text-emerald-800">MWK {l.costMwk.toLocaleString()}</td>
                <td className="py-3 px-4 font-mono text-gray-400">{l.odometerKm.toLocaleString()} km</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
