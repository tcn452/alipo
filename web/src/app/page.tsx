'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Header } from '@/components/Header';
import { StationCard } from '@/components/StationCard';
import { ReportModal } from '@/components/ReportModal';
import { Station, FuelStatus } from '@/types/alipo';
import { CITIES, BRANDS } from '@/lib/constants';
import { pb } from '@/lib/pocketbase';
import { Search, Map as MapIcon, List, Filter, RefreshCw, CheckCircle, AlertTriangle, XCircle, Info, Radio } from 'lucide-react';

// Dynamically import the Map component without SSR
const StationMap = dynamic(() => import('@/components/map/StationMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[450px] bg-emerald-950/10 rounded-2xl flex flex-col items-center justify-center text-emerald-800 space-y-2">
      <RefreshCw className="w-8 h-8 animate-spin" />
      <span className="text-sm font-medium">Loading Malawi Fuel Map...</span>
    </div>
  )
});

// Fallback initial stations if offline / during fresh build
const SEED_FALLBACK: Station[] = [
  {
    id: 'stat_llw_001',
    name: 'Puma Energy Area 47',
    brand: 'Puma',
    latitude: -13.9572,
    longitude: 33.7915,
    district: 'Area 47',
    city: 'Lilongwe',
    verified: true,
    fuel_types: ['petrol', 'diesel'],
    latest_status: 'available',
    latest_queue: 'short',
    latest_price_petrol: 2530,
    latest_price_diesel: 2734,
    last_reported_at: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    id: 'stat_llw_002',
    name: 'TotalEnergies City Centre',
    brand: 'Total',
    latitude: -13.9712,
    longitude: 33.7845,
    district: 'City Centre',
    city: 'Lilongwe',
    verified: true,
    fuel_types: ['petrol', 'diesel'],
    latest_status: 'available',
    latest_queue: 'medium',
    latest_price_petrol: 2530,
    latest_price_diesel: 2734,
    last_reported_at: new Date(Date.now() - 35 * 60000).toISOString()
  },
  {
    id: 'stat_llw_003',
    name: 'Petroda Kanengo Industrial',
    brand: 'Petroda',
    latitude: -13.8821,
    longitude: 33.7741,
    district: 'Kanengo',
    city: 'Lilongwe',
    verified: true,
    fuel_types: ['petrol', 'diesel'],
    latest_status: 'low',
    latest_queue: 'long',
    latest_price_petrol: 2530,
    latest_price_diesel: 2734,
    last_reported_at: new Date(Date.now() - 50 * 60000).toISOString()
  },
  {
    id: 'stat_llw_004',
    name: 'OilCom Old Town (Paul Kagame)',
    brand: 'OilCom',
    latitude: -13.9845,
    longitude: 33.7689,
    district: 'Old Town',
    city: 'Lilongwe',
    verified: true,
    fuel_types: ['petrol', 'diesel'],
    latest_status: 'out',
    latest_queue: 'none',
    latest_price_petrol: 2530,
    latest_price_diesel: 2734,
    last_reported_at: new Date(Date.now() - 120 * 60000).toISOString()
  },
  {
    id: 'stat_bt_001',
    name: 'TotalEnergies Chichiri',
    brand: 'Total',
    latitude: -15.7981,
    longitude: 35.0254,
    district: 'Chichiri',
    city: 'Blantyre',
    verified: true,
    fuel_types: ['petrol', 'diesel'],
    latest_status: 'available',
    latest_queue: 'short',
    latest_price_petrol: 2530,
    latest_price_diesel: 2734,
    last_reported_at: new Date(Date.now() - 25 * 60000).toISOString()
  },
  {
    id: 'stat_bt_002',
    name: 'Puma Ginnery Corner',
    brand: 'Puma',
    latitude: -15.7925,
    longitude: 35.0118,
    district: 'Ginnery Corner',
    city: 'Blantyre',
    verified: true,
    fuel_types: ['petrol', 'diesel'],
    latest_status: 'low',
    latest_queue: 'long',
    latest_price_petrol: 2530,
    latest_price_diesel: 2734,
    last_reported_at: new Date(Date.now() - 60 * 60000).toISOString()
  }
];

export default function HomePage() {
  const [stations, setStations] = useState<Station[]>(SEED_FALLBACK);
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedBrand, setSelectedBrand] = useState<string>('All Brands');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'both' | 'map' | 'list'>('both');
  const [loading, setLoading] = useState(false);

  // Fetch stations from PocketBase with fallback
  const fetchStations = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('stations').getFullList({
        sort: '-updated',
      });
      if (records && records.length > 0) {
        setStations(records as unknown as Station[]);
      }
    } catch (err) {
      console.log('Using local station data (PocketBase offline or initializing)');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();

    // Subscribe to realtime updates on stations collection
    try {
      pb.collection('stations').subscribe('*', (e) => {
        if (e.action === 'create') {
          setStations((prev) => [e.record as unknown as Station, ...prev]);
        } else if (e.action === 'update') {
          setStations((prev) =>
            prev.map((s) => (s.id === e.record.id ? (e.record as unknown as Station) : s))
          );
        } else if (e.action === 'delete') {
          setStations((prev) => prev.filter((s) => s.id !== e.record.id));
        }
      });
    } catch (e) {
      // realtime subscription error
    }

    return () => {
      try {
        pb.collection('stations').unsubscribe('*');
      } catch (e) {}
    };
  }, []);

  // Filtered station list
  const filteredStations = useMemo(() => {
    return stations.filter((st) => {
      // City filter
      if (selectedCity !== 'All Cities' && st.city !== selectedCity) return false;
      // Brand filter
      if (selectedBrand !== 'All Brands' && st.brand !== selectedBrand) return false;
      // Status filter
      if (selectedStatus !== 'all' && st.latest_status !== selectedStatus) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = st.name.toLowerCase().includes(q);
        const matchDistrict = st.district.toLowerCase().includes(q);
        const matchBrand = st.brand.toLowerCase().includes(q);
        if (!matchName && !matchDistrict && !matchBrand) return false;
      }
      return true;
    });
  }, [stations, selectedCity, selectedBrand, selectedStatus, searchQuery]);

  // City center for Map
  const mapCenter: [number, number] = useMemo(() => {
    if (selectedCity === 'Blantyre') return [-15.7861, 35.0058];
    if (selectedCity === 'Mzuzu') return [-11.4589, 34.0152];
    if (selectedCity === 'Zomba') return [-15.3833, 35.3333];
    return [-13.9626, 33.7741]; // Lilongwe
  }, [selectedCity]);

  // Aggregate stats
  const stats = useMemo(() => {
    const available = filteredStations.filter((s) => s.latest_status === 'available').length;
    const low = filteredStations.filter((s) => s.latest_status === 'low').length;
    const out = filteredStations.filter((s) => s.latest_status === 'out').length;
    return { available, low, out, total: filteredStations.length };
  }, [filteredStations]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onOpenReport={() => setIsReportModalOpen(true)} />

      {/* Hero / Quick Status Banner */}
      <section className="bg-emerald-900 text-white py-4 px-4 sm:px-6 shadow-inner border-b border-emerald-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Malawi Live Fuel Availability
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200 mt-0.5">
              Crowdsourced queue reports & verified station updates across Malawi
            </p>
          </div>

          {/* Metric Badges */}
          <div className="flex items-center space-x-2 sm:space-x-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="flex items-center space-x-2 bg-emerald-800/80 px-3 py-2 rounded-xl border border-emerald-700/60 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <div className="text-xs text-emerald-200">Available</div>
                <div className="text-base font-bold text-white leading-tight">{stats.available}</div>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-emerald-800/80 px-3 py-2 rounded-xl border border-emerald-700/60 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div>
                <div className="text-xs text-emerald-200">Low Supply</div>
                <div className="text-base font-bold text-white leading-tight">{stats.low}</div>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-emerald-800/80 px-3 py-2 rounded-xl border border-emerald-700/60 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div>
                <div className="text-xs text-emerald-200">Out of Fuel</div>
                <div className="text-base font-bold text-white leading-tight">{stats.out}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search station, area, brand (e.g. Area 47, Puma, Total)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              />
            </div>

            {/* City Dropdown / Pills */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
              {CITIES.slice(0, 5).map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedCity === city
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Status Pills & Mobile View Toggle */}
          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
            <div className="flex items-center space-x-1.5 overflow-x-auto">
              {[
                { id: 'all', label: 'All Statuses' },
                { id: 'available', label: '🟢 Available' },
                { id: 'low', label: '🟡 Low Supply' },
                { id: 'out', label: '🔴 Out' }
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedStatus(s.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    selectedStatus === s.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex lg:hidden bg-gray-100 p-0.5 rounded-lg">
              <button
                onClick={() => setActiveTab('map')}
                className={`p-1.5 rounded-md text-xs font-semibold ${
                  activeTab === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                <MapIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('list')}
                className={`p-1.5 rounded-md text-xs font-semibold ${
                  activeTab === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-start">
          {/* Left Column: Station List (5 columns on desktop) */}
          <div
            className={`lg:col-span-5 space-y-3 ${
              activeTab === 'map' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Fuel Stations ({filteredStations.length})
              </h2>
              <button
                onClick={fetchStations}
                className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {filteredStations.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-800">No stations match your criteria</p>
                <p className="text-xs text-gray-500 mt-1">Try selecting a different city or status filter.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filteredStations.map((station) => (
                  <StationCard
                    key={station.id}
                    station={station}
                    isSelected={selectedStation?.id === station.id}
                    onSelectStation={(st) => setSelectedStation(st)}
                    onReportClick={(st) => {
                      setSelectedStation(st);
                      setIsReportModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Live Leaflet Map (7 columns on desktop) */}
          <div
            className={`lg:col-span-7 h-[500px] lg:h-[calc(100vh-240px)] sticky top-36 ${
              activeTab === 'list' ? 'hidden lg:block' : 'block'
            }`}
          >
            <StationMap
              stations={filteredStations}
              selectedStation={selectedStation}
              onSelectStation={(st) => setSelectedStation(st)}
              center={mapCenter}
              zoom={selectedCity === 'All Cities' ? 7 : 12}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-6 border-t border-gray-800 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white text-sm">Alipo Malawi</span>
            <span>—</span>
            <span>Fuel Availability & Fleet Management</span>
          </div>
          <div className="flex items-center space-x-4 text-gray-400">
            <span>USSD: *384*265#</span>
            <span>WhatsApp: +265888000100</span>
            <span className="text-emerald-400">Phase 1 MVP</span>
          </div>
        </div>
      </footer>

      {/* Quick Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        stations={stations}
        selectedStation={selectedStation}
        onReportSubmitted={fetchStations}
      />
    </div>
  );
}
