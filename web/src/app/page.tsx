'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, Info, List, LocateFixed, Map as MapIcon, MapPin, RefreshCw, Search, XCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { ReportModal } from '@/components/ReportModal';
import { StationCard } from '@/components/StationCard';
import { CITIES, CITY_CENTERS, DEFAULT_CITY } from '@/lib/constants';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Station } from '@/types/alipo';
import { TimeAgo } from '@/components/TimeAgo';
import { useLanguage } from '@/lib/i18n';

const StationMap = dynamic(() => import('@/components/map/StationMap'), {
  ssr: false,
  loading: () => <div className="grid min-h-[540px] place-items-center bg-[#e7eadf] text-forest"><div className="text-center"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" /><p className="text-sm font-bold">Loading the live fuel map</p></div></div>,
});

const STATUS_FILTERS = [{ id: 'all', label: 'All reports' }, { id: 'available', label: 'Available' }, { id: 'low', label: 'Low supply' }, { id: 'out', label: 'No fuel' }, { id: 'stale', label: 'Stale' }];

function isInMalawi(latitude: number, longitude: number) {
  return latitude >= -17.2 && latitude <= -9.2 && longitude >= 32.65 && longitude <= 35.95;
}

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

  const lastReportedAt = row.last_reported_at ? String(row.last_reported_at) : undefined;
  const reportedStatus = row.latest_status as Station['latest_status'];
  const isStale = lastReportedAt ? Date.now() - new Date(lastReportedAt).getTime() >= 4 * 60 * 60 * 1000 : false;
  const fuelStatus = (fuel: 'petrol' | 'diesel') => {
    const reportedAt = row[`${fuel}_reported_at`] ? String(row[`${fuel}_reported_at`]) : undefined;
    const status = (row[`${fuel}_status`] || 'unknown') as Station['latest_status'];
    return { status: reportedAt && Date.now() - new Date(reportedAt).getTime() >= 4 * 60 * 60 * 1000 && status !== 'unknown' ? 'stale' as const : status, reportedAt };
  };
  const petrol = fuelStatus('petrol');
  const diesel = fuelStatus('diesel');

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
    latest_status: isStale && reportedStatus !== 'unknown' ? 'stale' : reportedStatus,
    petrol_status: petrol.status,
    diesel_status: diesel.status,
    petrol_reported_at: petrol.reportedAt,
    diesel_reported_at: diesel.reportedAt,
    latest_queue: isStale ? undefined : row.latest_queue as Station['latest_queue'],
    last_reported_at: lastReportedAt,
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
  const { t } = useLanguage();
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedCity, setSelectedCity] = useState(DEFAULT_CITY);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedFuel, setSelectedFuel] = useState<'all' | 'petrol' | 'diesel'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'locating' | 'active' | 'outside' | 'error'>('idle');
  const stationRequestRef = useRef(0);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const showMap = useCallback(() => {
    setSelectedStation(null);
    setActiveTab('map');
    window.requestAnimationFrame(() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);

  const fetchStations = useCallback(async () => {
    const requestId = ++stationRequestRef.current;
    setLoading(true);
    try {
      const [latitude, longitude] = selectedCity === 'My Location' && userLocation ? userLocation : (CITY_CENTERS[selectedCity] || CITY_CENTERS['All Cities']);
      const reported = await loadSupabaseStations(selectedCity, latitude, longitude, radiusKm).catch(() => []);

      if (reported.length) {
        if (requestId !== stationRequestRef.current) return;
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
      if (requestId !== stationRequestRef.current) return;
      setStations(mapped);
      setSelectedStation(null);
    } finally {
      if (requestId === stationRequestRef.current) setLoading(false);
    }
  }, [radiusKm, selectedCity, userLocation]);

  const activateLocation = useCallback(() => {
    if (!navigator.geolocation) return setLocationState('error');
    setLocationState('locating');
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      if (!isInMalawi(coords.latitude, coords.longitude)) {
        setUserLocation(null);
        setSelectedStation(null);
        setSelectedCity('All Cities');
        setLocationState('outside');
        return;
      }
      setUserLocation([coords.latitude, coords.longitude]);
      setSelectedStation(null);
      setSelectedCity('My Location');
      setLocationState('active');
    }, () => setLocationState('error'), { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 });
  }, []);

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
    if (selectedFuel !== 'all' && !station.fuel_types.includes(selectedFuel)) return false;
    const effectiveStatus = selectedFuel === 'petrol' ? station.petrol_status : selectedFuel === 'diesel' ? station.diesel_status : station.latest_status;
    if (selectedStatus !== 'all' && effectiveStatus !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return [station.name, station.district, station.brand].some((value) => value.toLowerCase().includes(query));
    }
    return true;
  }), [stations, selectedFuel, selectedStatus, searchQuery]);

  const mapCenter = selectedCity === 'My Location' && userLocation ? userLocation : (CITY_CENTERS[selectedCity] || CITY_CENTERS['All Cities']);
  const stats = useMemo(() => {
    const statusFor = (station: Station) => selectedFuel === 'petrol' ? station.petrol_status : selectedFuel === 'diesel' ? station.diesel_status : station.latest_status;
    return { available: filteredStations.filter((station) => statusFor(station) === 'available').length, low: filteredStations.filter((station) => statusFor(station) === 'low').length, out: filteredStations.filter((station) => statusFor(station) === 'out').length };
  }, [filteredStations, selectedFuel]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-ivory text-ink">
      <Header onOpenReport={() => setIsReportModalOpen(true)} />
      <main>
        <section className="overflow-hidden bg-forest text-white">
          <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[1.35fr_.65fr]">
            <div className="relative border-b border-white/10 px-5 py-10 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
              <div className="absolute right-8 top-6 hidden h-44 w-44 rounded-full border border-white/10 lg:block" />
              <p className="eyebrow relative z-10 max-w-full whitespace-normal leading-5 text-[#f5aa54]">
                {t("Malawi's live fuel network. Keep Malawi moving.")}
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[.96] tracking-[-0.04em] sm:text-6xl lg:text-7xl">{t("Fuel is there. You're not alone.")}</h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/70 sm:text-base">{t('Find fuel, see queue times and share what you know. Built for every drive moving in Malawi.')}</p>
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-1">
              {[
                { label: 'Fuel available', value: stats.available, icon: CheckCircle2, color: 'text-[#9bcf79]' },
                { label: 'Running low', value: stats.low, icon: CircleAlert, color: 'text-[#f5aa54]' },
                { label: 'No fuel', value: stats.out, icon: XCircle, color: 'text-[#ef7c5d]' },
              ].map(({ label, value, icon: Icon, color }) => <div key={label} className="flex min-w-0 items-center gap-2 border-r border-white/10 px-3 py-5 last:border-r-0 sm:gap-3 sm:px-4 lg:border-b lg:border-r-0 lg:px-8 lg:last:border-b-0"><Icon className={`h-5 w-5 shrink-0 ${color}`} /><div className="min-w-0"><p className="text-2xl font-black leading-none">{value}</p><p className="mt-1 text-[9px] font-bold uppercase leading-3 tracking-[.12em] text-white/55 sm:text-xs">{t(label)}</p></div></div>)}
            </div>
          </div>
        </section>

        <section className="sticky top-[72px] z-20 border-b border-line bg-ivory/95 backdrop-blur-xl">
          <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-8 lg:px-12">
            <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center">
              <label className="relative block"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><span className="sr-only">{t('Search station or area')}</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('Search station, area or brand')} className="h-12 w-full border border-line bg-white pl-11 pr-4 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10" /></label>
              <div className="no-scrollbar flex gap-2 overflow-x-auto"><button type="button" onClick={activateLocation} disabled={locationState === 'locating'} className={`inline-flex h-10 items-center gap-2 whitespace-nowrap px-4 text-xs font-bold transition ${selectedCity === 'My Location' ? 'bg-orange text-white' : 'border border-orange/40 bg-white text-forest hover:border-orange'} disabled:opacity-60`}><LocateFixed className={`h-4 w-4 ${locationState === 'locating' ? 'animate-pulse' : ''}`} />{t(locationState === 'locating' ? 'Finding you…' : locationState === 'active' ? 'Near me' : 'Use my location')}</button>{CITIES.map((city) => <button key={city} onClick={() => { setSelectedStation(null); setSelectedCity(city); }} className={`h-10 whitespace-nowrap px-4 text-xs font-bold transition ${selectedCity === city ? 'bg-forest text-white' : 'border border-line bg-white text-ink hover:border-forest'}`}>{city === 'All Cities' ? t('All Malawi') : city}</button>)}</div>
            </div>
            {locationState === 'outside' ? <p role="status" className="mt-3 border-l-2 border-orange pl-3 text-xs font-bold text-muted">{t('Your location is outside Malawi, so the national map is shown.')}</p> : locationState === 'error' ? <p role="status" className="mt-3 border-l-2 border-[#c9583c] pl-3 text-xs font-bold text-[#9d321d]">{t('Location unavailable. Allow location access in your browser and try again.')}</p> : null}
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="no-scrollbar flex gap-2 overflow-x-auto">{STATUS_FILTERS.map((filter) => <button key={filter.id} onClick={() => setSelectedStatus(filter.id)} className={`inline-flex h-9 items-center gap-2 whitespace-nowrap px-3 text-xs font-bold transition ${selectedStatus === filter.id ? 'bg-[#dfead7] text-forest' : 'text-muted hover:bg-white'}`}>{filter.id !== 'all' && <span className={`h-2 w-2 rounded-full ${filter.id === 'available' ? 'bg-[#398151]' : filter.id === 'low' ? 'bg-[#df972f]' : filter.id === 'stale' ? 'bg-[#795548]' : 'bg-[#c9583c]'}`} />}{t(filter.label)}</button>)}</div>
              <div className="flex items-center gap-3"><div className="flex border border-line bg-white" aria-label={t('Fuel type filter')}>{(['all', 'petrol', 'diesel'] as const).map((fuel) => <button key={fuel} type="button" onClick={() => { setSelectedStation(null); setSelectedFuel(fuel); }} aria-pressed={selectedFuel === fuel} className={`h-9 px-3 text-[10px] font-black uppercase ${selectedFuel === fuel ? 'bg-orange text-white' : 'text-muted hover:text-forest'}`}>{t(fuel === 'all' ? 'All fuel' : fuel === 'petrol' ? 'Petrol' : 'Diesel')}</button>)}</div><label className="hidden items-center gap-2 text-xs font-bold text-muted sm:flex">{t('Radius')}<select aria-label={t('Search radius')} value={radiusKm} onChange={(event) => { setSelectedStation(null); setRadiusKm(Number(event.target.value)); }} disabled={selectedCity === 'All Cities'} className="h-9 border border-line bg-white px-2 text-ink disabled:opacity-40">{[5, 10, 20, 30, 50].map((radius) => <option key={radius} value={radius}>{radius} km</option>)}</select></label><div className="flex border border-line bg-white lg:hidden"><button aria-label={t('Show station list')} onClick={() => setActiveTab('list')} className={`p-2.5 ${activeTab === 'list' ? 'bg-forest text-white' : 'text-muted'}`}><List className="h-4 w-4" /></button><button aria-label={t('Show map')} onClick={showMap} className={`p-2.5 ${activeTab === 'map' ? 'bg-forest text-white' : 'text-muted'}`}><MapIcon className="h-4 w-4" /></button></div></div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1440px] lg:min-h-[720px] lg:grid-cols-[440px_minmax(0,1fr)]">
          <aside className={`${activeTab === 'map' ? 'hidden lg:block' : 'block'} border-r border-line bg-[#f8f5ee] px-4 py-6 sm:px-8 lg:px-7`}>
            <div className="mb-3 flex items-end justify-between"><div><p className="eyebrow text-orange">{selectedCity === 'All Cities' ? t('Malawi coverage') : selectedCity === 'My Location' ? t('Near your location') : t('{city} coverage', { city: selectedCity })}</p><h2 className="mt-1 text-xl font-black tracking-[-.03em]">{t(selectedCity !== 'All Cities' ? '{count} fuel stations within {radius} km' : '{count} fuel stations', { count: filteredStations.length, radius: radiusKm })}</h2></div><button onClick={fetchStations} className="inline-flex items-center gap-2 text-xs font-bold text-forest"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('Refresh')}</button></div>
            <p className="mb-5 border-l-2 border-orange pl-3 text-[11px] leading-4 text-muted">{t('Live Alipo station data. OpenStreetMap is used only where Alipo coverage is unavailable.')}</p>
            {loading ? <div role="status" className="border border-line bg-white p-8 text-center"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-orange" /><p className="mt-3 font-bold">{t('Loading fuel stations')}</p><p className="mt-1 text-sm text-muted">{t('Checking live Alipo coverage…')}</p></div> : filteredStations.length ? <div className="space-y-3 lg:max-h-[650px] lg:overflow-y-auto lg:pr-2">{filteredStations.map((station, index) => <StationCard key={station.id} station={station} stationNumber={index + 1} isSelected={selectedStation?.id === station.id} onSelectStation={setSelectedStation} onReportClick={(item) => { setSelectedStation(item); setIsReportModalOpen(true); }} />)}</div> : <div className="border border-line bg-white p-8 text-center"><Info className="mx-auto h-6 w-6 text-muted" /><p className="mt-3 font-bold">{t('No matching stations')}</p><p className="mt-1 text-sm text-muted">{t('Try another area or fuel status.')}</p></div>}
          </aside>

          <div ref={mapSectionRef} className={`${activeTab === 'list' ? 'hidden lg:block' : 'block'} relative min-h-[610px] scroll-mt-[190px] bg-[#dce2d6] lg:min-h-[720px]`}>
            <StationMap stations={filteredStations} selectedStation={selectedStation} onSelectStation={setSelectedStation} center={mapCenter} zoom={selectedCity === 'All Cities' ? 7 : selectedCity === 'My Location' ? 14.5 : 12} radiusKm={selectedCity === 'All Cities' ? undefined : radiusKm} userLocation={userLocation} focusUserLocation={selectedCity === 'My Location'} />
            {loading ? <div role="status" className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 border border-forest/15 bg-ivory px-4 py-3 text-xs font-black text-forest shadow-lg"><span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin text-orange" /> {t('Loading fuel stations…')}</span></div> : null}
            {selectedStation && <div className="absolute bottom-5 left-4 right-4 z-[400] border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(5,48,33,.22)] sm:left-6 sm:right-auto sm:w-[410px]">
              <div className="flex items-start justify-between gap-4"><div><div className="text-[11px] font-black uppercase tracking-[.14em] text-forest">{selectedStation.brand}</div><h3 className="mt-2 text-xl font-black tracking-[-.03em]">{selectedStation.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5" /> {selectedStation.district}, {selectedStation.city}</p></div><span className={`whitespace-nowrap px-3 py-1.5 text-xs font-black ${selectedStation.latest_status === 'available' ? 'bg-[#e1edd9] text-forest' : selectedStation.latest_status === 'stale' ? 'bg-[#f3ece8] text-[#795548]' : 'bg-[#eeeae1] text-muted'}`}>{selectedStation.latest_status === 'available' ? 'Fuel available' : selectedStation.latest_status === 'low' ? 'Low supply' : selectedStation.latest_status === 'out' ? 'No fuel' : selectedStation.latest_status === 'stale' ? 'Stale report' : 'Awaiting report'}</span></div>
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
