'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, Info, List, Map as MapIcon, MapPin, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { ReportModal } from '@/components/ReportModal';
import { StationCard } from '@/components/StationCard';
import { CITIES, CITY_CENTERS, DEFAULT_CITY } from '@/lib/constants';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Station } from '@/types/alipo';
import { TimeAgo } from '@/components/TimeAgo';

const StationMap = dynamic(() => import('@/components/map/StationMap'), {
  ssr: false,
  loading: () => <div className="grid min-h-[540px] place-items-center bg-[#e7eadf] text-forest"><div className="text-center"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" /><p className="text-sm font-bold">Loading the live fuel map</p></div></div>,
});

const STATUS_FILTERS = [{ id: 'all', label: 'All reports' }, { id: 'available', label: 'Available' }, { id: 'low', label: 'Low supply' }, { id: 'out', label: 'No fuel' }];

function stationFromSupabase(row: Record<string, unknown>): Station | null {
  let latitude = typeof row.latitude === 'number' ? row.latitude : undefined;
  let longitude = typeof row.longitude === 'number' ? row.longitude : undefined;
  let location = row.location;
  if (typeof location === 'string') {
    try { location = JSON.parse(location); } catch { location = null; }
  }
  if ((!latitude || !longitude) && location && typeof location === 'object' && 'coordinates' in location) {
    const coordinates = (location as { coordinates?: unknown }).coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      longitude = Number(coordinates[0]);
      latitude = Number(coordinates[1]);
    }
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    id: String(row.id),
    name: String(row.name || 'Fuel station'),
    brand: String(row.brand || 'Independent'),
    latitude: latitude as number,
    longitude: longitude as number,
    district: String(row.district || row.city || 'Malawi'),
    city: String(row.city || 'Malawi'),
    verified: Boolean(row.verified),
    fuel_types: Array.isArray(row.fuel_types) ? row.fuel_types.filter((type): type is 'petrol' | 'diesel' => type === 'petrol' || type === 'diesel') : ['petrol', 'diesel'],
    latest_status: row.latest_status as Station['latest_status'],
    latest_queue: row.latest_queue as Station['latest_queue'],
    last_reported_at: row.last_reported_at ? String(row.last_reported_at) : undefined,
    updated: row.updated_at ? String(row.updated_at) : undefined,
    distance_km: typeof row.distance_km === 'number' ? row.distance_km : undefined,
  };
}

async function loadSupabaseStations(city: string, latitude: number, longitude: number, radiusKm: number) {
  if (!isSupabaseConfigured) return [];
  const query = city === 'All Cities'
    ? supabase.rpc('all_stations')
    : supabase.rpc('nearby_stations', { p_latitude: latitude, p_longitude: longitude, p_radius_km: radiusKm });
  const { data, error } = await query;
  if (error) throw error;
  return ((data || []) as Record<string, unknown>[]).flatMap((row) => {
    const station = stationFromSupabase(row);
    return station ? [station] : [];
  });
}

export default function HomePage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);

  const fetchStations = useCallback(async () => {
    setLoading(true);
    try {
      const [latitude, longitude] = CITY_CENTERS[selectedCity];
      const reported = await loadSupabaseStations(selectedCity, latitude, longitude, radiusKm).catch(() => []);

      if (reported.length) {
        setStations(reported);
        setSelectedStation(null);
        return;
      }

      const mappedUrl = `/api/stations?city=${encodeURIComponent(selectedCity)}&lat=${latitude}&lon=${longitude}&radius=${radiusKm}`;
      const mapped = await fetch(mappedUrl)
        .then(async (response) => {
        if (!response.ok) throw new Error('Mapped stations unavailable');
        return response.json() as Promise<{ stations: Station[] }>;
        })
        .then((result) => result.stations)
        .catch(() => []);
      setStations(mapped);
      setSelectedStation(null);
    } finally {
      setLoading(false);
    }
  }, [radiusKm, selectedCity]);

  useEffect(() => {
    void fetchStations();
  }, [fetchStations]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase
      .channel('public-stations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, () => { void fetchStations(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [fetchStations]);

  const filteredStations = useMemo(() => stations.filter((station) => {
    if (selectedStatus !== 'all' && station.latest_status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return [station.name, station.district, station.brand].some((value) => value.toLowerCase().includes(query));
    }
    return true;
  }), [stations, selectedCity, selectedStatus, searchQuery]);

  const mapCenter = CITY_CENTERS[selectedCity];
  const stats = useMemo(() => ({ available: filteredStations.filter((station) => station.latest_status === 'available').length, low: filteredStations.filter((station) => station.latest_status === 'low').length, out: filteredStations.filter((station) => station.latest_status === 'out').length }), [filteredStations]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-ivory text-ink">
      <Header onOpenReport={() => setIsReportModalOpen(true)} />
      <main>
        <section className="overflow-hidden bg-forest text-white">
          <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[1.35fr_.65fr]">
            <div className="relative border-b border-white/10 px-5 py-10 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
              <div className="absolute right-8 top-6 hidden h-44 w-44 rounded-full border border-white/10 lg:block" />
              <p className="eyebrow relative z-10 max-w-full whitespace-normal leading-5 text-[#f5aa54]">
                Malawi&apos;s live fuel network. Keep Malawi moving.
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[.96] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Fuel is there.<br />You&apos;re not alone.</h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Find fuel, see queue times and share what you know. Built for every drive moving in Malawi.</p>
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-1">
              {[
                { label: 'Fuel available', value: stats.available, icon: CheckCircle2, color: 'text-[#9bcf79]' },
                { label: 'Running low', value: stats.low, icon: CircleAlert, color: 'text-[#f5aa54]' },
                { label: 'No fuel', value: stats.out, icon: XCircle, color: 'text-[#ef7c5d]' },
              ].map(({ label, value, icon: Icon, color }) => <div key={label} className="flex min-w-0 items-center gap-2 border-r border-white/10 px-3 py-5 last:border-r-0 sm:gap-3 sm:px-4 lg:border-b lg:border-r-0 lg:px-8 lg:last:border-b-0"><Icon className={`h-5 w-5 shrink-0 ${color}`} /><div className="min-w-0"><p className="text-2xl font-black leading-none">{value}</p><p className="mt-1 text-[9px] font-bold uppercase leading-3 tracking-[.12em] text-white/55 sm:text-xs">{label}</p></div></div>)}
            </div>
          </div>
        </section>

        <section className="sticky top-[72px] z-20 border-b border-line bg-ivory/95 backdrop-blur-xl">
          <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-8 lg:px-12">
            <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center">
              <label className="relative block"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><span className="sr-only">Search station or area</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search station, area or brand" className="h-12 w-full border border-line bg-white pl-11 pr-4 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10" /></label>
              <div className="no-scrollbar flex gap-2 overflow-x-auto">{CITIES.map((city) => <button key={city} onClick={() => setSelectedCity(city)} className={`h-10 whitespace-nowrap px-4 text-xs font-bold transition ${selectedCity === city ? 'bg-forest text-white' : 'border border-line bg-white text-ink hover:border-forest'}`}>{city === 'All Cities' ? 'All Malawi' : city}</button>)}</div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="no-scrollbar flex gap-2 overflow-x-auto">{STATUS_FILTERS.map((filter) => <button key={filter.id} onClick={() => setSelectedStatus(filter.id)} className={`inline-flex h-9 items-center gap-2 whitespace-nowrap px-3 text-xs font-bold transition ${selectedStatus === filter.id ? 'bg-[#dfead7] text-forest' : 'text-muted hover:bg-white'}`}>{filter.id !== 'all' && <span className={`h-2 w-2 rounded-full ${filter.id === 'available' ? 'bg-[#398151]' : filter.id === 'low' ? 'bg-[#df972f]' : 'bg-[#c9583c]'}`} />}{filter.label}</button>)}</div>
              <div className="flex items-center gap-3"><label className="flex items-center gap-2 text-xs font-bold text-muted">Radius<select aria-label="Search radius" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} disabled={selectedCity === 'All Cities'} className="h-9 border border-line bg-white px-2 text-ink disabled:opacity-40">{[5, 10, 20, 30, 50].map((radius) => <option key={radius} value={radius}>{radius} km</option>)}</select></label><div className="flex border border-line bg-white lg:hidden"><button aria-label="Show station list" onClick={() => setActiveTab('list')} className={`p-2.5 ${activeTab === 'list' ? 'bg-forest text-white' : 'text-muted'}`}><List className="h-4 w-4" /></button><button aria-label="Show map" onClick={() => setActiveTab('map')} className={`p-2.5 ${activeTab === 'map' ? 'bg-forest text-white' : 'text-muted'}`}><MapIcon className="h-4 w-4" /></button></div></div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1440px] lg:min-h-[720px] lg:grid-cols-[440px_minmax(0,1fr)]">
          <aside className={`${activeTab === 'map' ? 'hidden lg:block' : 'block'} border-r border-line bg-[#f8f5ee] px-4 py-6 sm:px-8 lg:px-7`}>
            <div className="mb-3 flex items-end justify-between"><div><p className="eyebrow text-orange">{selectedCity === 'All Cities' ? 'Malawi coverage' : `${selectedCity} coverage`}</p><h2 className="mt-1 text-xl font-black tracking-[-.03em]">{filteredStations.length} fuel stations{selectedCity !== 'All Cities' ? ` within ${radiusKm} km` : ''}</h2></div><button onClick={fetchStations} className="inline-flex items-center gap-2 text-xs font-bold text-forest"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button></div>
            <p className="mb-5 border-l-2 border-orange pl-3 text-[11px] leading-4 text-muted">Live Alipo station data. OpenStreetMap is used only where Alipo coverage is unavailable.</p>
            {filteredStations.length ? <div className="space-y-3 lg:max-h-[650px] lg:overflow-y-auto lg:pr-2">{filteredStations.map((station, index) => <StationCard key={station.id} station={station} stationNumber={index + 1} isSelected={selectedStation?.id === station.id} onSelectStation={setSelectedStation} onReportClick={(item) => { setSelectedStation(item); setIsReportModalOpen(true); }} />)}</div> : <div className="border border-line bg-white p-8 text-center"><Info className="mx-auto h-6 w-6 text-muted" /><p className="mt-3 font-bold">No matching stations</p><p className="mt-1 text-sm text-muted">Try another area or fuel status.</p></div>}
          </aside>

          <div className={`${activeTab === 'list' ? 'hidden lg:block' : 'block'} relative min-h-[610px] bg-[#dce2d6] lg:min-h-[720px]`}>
            <StationMap stations={filteredStations} selectedStation={selectedStation} onSelectStation={setSelectedStation} center={mapCenter} zoom={selectedCity === 'All Cities' ? 7 : 12} radiusKm={selectedCity === 'All Cities' ? undefined : radiusKm} />
            {selectedStation && <div className="absolute bottom-5 left-4 right-4 z-[400] border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(5,48,33,.22)] sm:left-6 sm:right-auto sm:w-[410px]">
              <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.14em] text-forest"><ShieldCheck className="h-4 w-4" /> {selectedStation.verified ? 'Station verified' : 'Mapped location'}</div><h3 className="mt-2 text-xl font-black tracking-[-.03em]">{selectedStation.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5" /> {selectedStation.district}, {selectedStation.city}</p></div><span className={`whitespace-nowrap px-3 py-1.5 text-xs font-black ${selectedStation.latest_status === 'available' ? 'bg-[#e1edd9] text-forest' : 'bg-[#eeeae1] text-muted'}`}>{selectedStation.latest_status === 'available' ? 'Fuel available' : selectedStation.latest_status === 'low' ? 'Low supply' : selectedStation.latest_status === 'out' ? 'No fuel' : 'Awaiting report'}</span></div>
              <div className="mt-4 grid grid-cols-2 border-y border-line py-3 text-xs"><div><span className="block text-muted">Fuel types</span><strong className="capitalize">{selectedStation.fuel_types.join(' & ')}</strong></div><div><span className="block text-muted">Updated</span><strong><TimeAgo date={selectedStation.last_reported_at || selectedStation.updated} /></strong></div></div>
              <a href="#report-fuel" onClick={() => setIsReportModalOpen(true)} className="mt-4 inline-flex w-full items-center justify-between bg-forest px-4 py-3 text-sm font-black text-white transition hover:bg-[#0b5940]">Report an update <ArrowRight className="h-4 w-4" /></a>
            </div>}
          </div>
        </section>

        <section className="border-t border-line bg-[#eee9dd]"><div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:px-12"><div><p className="eyebrow text-orange">No data? No problem.</p><h2 className="mt-2 text-xl font-black">Alipo works for every phone.</h2></div><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center border border-forest/20 text-forest"><Clock3 className="h-5 w-5" /></div><div><p className="text-xs text-muted">Dial from any network</p><p className="font-mono font-bold">*384*265#</p></div></div><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center border border-forest/20 text-forest"><MapPin className="h-5 w-5" /></div><div><p className="text-xs text-muted">Community reports</p><p className="font-bold">Built around Malawi</p></div></div></div></section>
      </main>
      <footer className="bg-[#032e20] px-5 py-6 text-xs text-white/55"><div className="mx-auto flex max-w-[1440px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p><strong className="text-white">Alipo</strong> — Find fuel. Share updates. Keep Malawi moving.</p><p>USSD *384*265# · WhatsApp +265 888 000 100 · Created by <a href="https://wekode.dev" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white">WeKode</a></p></div></footer>
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} stations={stations} selectedStation={selectedStation} onReportSubmitted={fetchStations} />
    </div>
  );
}
