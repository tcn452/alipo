'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Bell, CheckCircle2, CircleAlert, CircleHelp, Info, List, LocateFixed, Map as MapIcon, MapPin, MapPinned, RefreshCw, Search, ThumbsUp, XCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { ReportModal } from '@/components/ReportModal';
import { StationCard } from '@/components/StationCard';
import { CITIES, CITY_CENTERS, DEFAULT_CITY, classifyStationBrand, getStationStockStatus, STATION_STOCK_CONFIG } from '@/lib/constants';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Station } from '@/types/alipo';
import { TimeAgo } from '@/components/TimeAgo';
import { useLanguage } from '@/lib/i18n';
import { HowItWorks } from '@/components/HowItWorks';
import { NameSuggestions } from '@/components/NameSuggestions';

const StationMap = dynamic(() => import('@/components/map/StationMap'), {
  ssr: false,
  loading: () => <div className="grid min-h-[540px] place-items-center bg-[#e7eadf] text-forest"><div className="text-center"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" /><p className="text-sm font-bold">Loading the live fuel map</p></div></div>,
});

const STATUS_FILTERS = [{ id: 'all', label: 'All reports' }, { id: 'available', label: 'Available' }, { id: 'low', label: 'Low supply' }, { id: 'out', label: 'No fuel' }, { id: 'stale', label: 'Stale' }];
const STATION_ARRIVAL_RADIUS_METRES = 120;
const STATION_ALERT_DWELL_MS = 60_000;
const STATION_ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000;
const STATION_ALERTS_KEY = 'alipo-station-alerts-enabled';
const STATION_ALERT_HISTORY_KEY = 'alipo-station-alert-history';

function isInMalawi(latitude: number, longitude: number) {
  return latitude >= -17.2 && latitude <= -9.2 && longitude >= 32.65 && longitude <= 35.95;
}

function distanceInMetres(from: [number, number], station: Pick<Station, 'latitude' | 'longitude'>) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(station.latitude - from[0]);
  const longitudeDelta = toRadians(station.longitude - from[1]);
  const fromLatitude = toRadians(from[0]);
  const toLatitude = toRadians(station.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
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
    return { status, isStale: Boolean(reportedAt && Date.now() - new Date(reportedAt).getTime() >= 4 * 60 * 60 * 1000 && status !== 'unknown'), reportedAt };
  };
  const petrol = fuelStatus('petrol');
  const diesel = fuelStatus('diesel');

  return {
    id: String(row.id),
    name: String(row.name || 'Fuel station'),
    brand: classifyStationBrand(String(row.name || ''), String(row.brand || '')),
    latitude: latitude as number,
    longitude: longitude as number,
    district: String(row.district || row.city || 'Malawi'),
    city: String(row.city || 'Malawi'),
    verified: Boolean(row.verified),
    fuel_types: Array.isArray(row.fuel_types) ? row.fuel_types.filter((type): type is 'petrol' | 'diesel' => type === 'petrol' || type === 'diesel') : ['petrol', 'diesel'],
    latest_status: reportedStatus,
    is_stale: isStale && reportedStatus !== 'unknown',
    petrol_status: petrol.status,
    diesel_status: diesel.status,
    petrol_is_stale: petrol.isStale,
    diesel_is_stale: diesel.isStale,
    petrol_reported_at: petrol.reportedAt,
    diesel_reported_at: diesel.reportedAt,
    latest_queue: row.latest_queue as Station['latest_queue'],
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
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isNameSuggestionsOpen, setIsNameSuggestionsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'locating' | 'active' | 'outside' | 'error'>('idle');
  const [dismissedArrivalStationId, setDismissedArrivalStationId] = useState<string | null>(null);
  const [stationAlertsEnabled, setStationAlertsEnabled] = useState(false);
  const [notificationState, setNotificationState] = useState<'ready' | 'unsupported' | 'denied'>('ready');
  const stationRequestRef = useRef(0);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const locationWatchRef = useRef<number | null>(null);
  const lastTrackedLocationRef = useRef<[number, number] | null>(null);

  const showMap = useCallback(() => {
    setSelectedStation(null);
    setActiveTab('map');
    window.requestAnimationFrame(() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);
  const clearMapSelection = useCallback(() => setSelectedStation(null), []);
  const closeHowItWorks = useCallback(() => setIsHowItWorksOpen(false), []);

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
    if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
    const handlePosition = ({ coords }: GeolocationPosition) => {
      if (!isInMalawi(coords.latitude, coords.longitude)) {
        setUserLocation(null);
        setLocationAccuracy(null);
        setSelectedStation(null);
        setSelectedCity('All Cities');
        setLocationState('outside');
        return;
      }
      const nextLocation: [number, number] = [coords.latitude, coords.longitude];
      const previousLocation = lastTrackedLocationRef.current;
      setLocationAccuracy(coords.accuracy);
      if (!previousLocation || distanceInMetres(nextLocation, { latitude: previousLocation[0], longitude: previousLocation[1] }) >= 250) {
        lastTrackedLocationRef.current = nextLocation;
        setUserLocation(nextLocation);
      }
      setSelectedCity('My Location');
      setLocationState('active');
    };
    locationWatchRef.current = navigator.geolocation.watchPosition(handlePosition, () => {
      setLocationState((current) => current === 'active' ? current : 'error');
    }, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 });
  }, []);

  useEffect(() => () => {
    if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
  }, []);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setNotificationState('unsupported');
      return;
    }
    setNotificationState(Notification.permission === 'denied' ? 'denied' : 'ready');
    setStationAlertsEnabled(Notification.permission === 'granted' && localStorage.getItem(STATION_ALERTS_KEY) === 'true');
  }, []);

  const toggleStationAlerts = useCallback(async () => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setNotificationState('unsupported');
      return;
    }
    if (stationAlertsEnabled) {
      localStorage.setItem(STATION_ALERTS_KEY, 'false');
      setStationAlertsEnabled(false);
      return;
    }
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') {
      setNotificationState(permission === 'denied' ? 'denied' : 'ready');
      return;
    }
    await navigator.serviceWorker.ready;
    localStorage.setItem(STATION_ALERTS_KEY, 'true');
    setNotificationState('ready');
    setStationAlertsEnabled(true);
  }, [stationAlertsEnabled]);

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
    const effectiveIsStale = selectedFuel === 'petrol' ? station.petrol_is_stale : selectedFuel === 'diesel' ? station.diesel_is_stale : station.is_stale;
    if (selectedStatus === 'stale' ? !effectiveIsStale : selectedStatus !== 'all' && effectiveStatus !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return [station.name, station.district, station.brand].some((value) => value.toLowerCase().includes(query));
    }
    return true;
  }), [stations, selectedFuel, selectedStatus, searchQuery]);

  const nearbyStation = useMemo(() => {
    if (locationState !== 'active' || !userLocation || !stations.length) return null;
    const nearest = stations.reduce<{ station: Station; distance: number } | null>((closest, station) => {
      const distance = distanceInMetres(userLocation, station);
      return !closest || distance < closest.distance ? { station, distance } : closest;
    }, null);
    const reliableRadius = Math.min(200, Math.max(STATION_ARRIVAL_RADIUS_METRES, locationAccuracy || 0));
    return nearest && nearest.distance <= reliableRadius ? nearest : null;
  }, [locationAccuracy, locationState, stations, userLocation]);

  useEffect(() => {
    if (nearbyStation?.station.id !== dismissedArrivalStationId) setDismissedArrivalStationId(null);
  }, [dismissedArrivalStationId, nearbyStation?.station.id]);

  useEffect(() => {
    if (!stationAlertsEnabled || !nearbyStation || !('serviceWorker' in navigator)) return;
    const { station } = nearbyStation;
    const timer = window.setTimeout(async () => {
      let history: Record<string, number> = {};
      try { history = JSON.parse(localStorage.getItem(STATION_ALERT_HISTORY_KEY) || '{}') as Record<string, number>; } catch { history = {}; }
      if (Date.now() - (history[station.id] || 0) < STATION_ALERT_COOLDOWN_MS) return;
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(t('Are you at {station}?', { station: station.name }), {
        body: t('When safely parked, help other drivers with a quick fuel report.'),
        icon: '/icon-192.png',
        badge: '/favicon.png',
        tag: `station-arrival-${station.id}`,
        data: { stationId: station.id },
      });
      localStorage.setItem(STATION_ALERT_HISTORY_KEY, JSON.stringify({ ...history, [station.id]: Date.now() }));
    }, STATION_ALERT_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [nearbyStation, stationAlertsEnabled, t]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const openStationReport = (stationId?: string) => {
      const station = stations.find((item) => item.id === stationId);
      if (!station) return false;
      setSelectedStation(station);
      setIsReportModalOpen(true);
      return true;
    };
    const handleMessage = (event: MessageEvent<{ type?: string; stationId?: string }>) => {
      if (event.data?.type === 'OPEN_STATION_REPORT') openStationReport(event.data.stationId);
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    const stationId = new URL(window.location.href).searchParams.get('reportStation');
    if (stationId && openStationReport(stationId)) window.history.replaceState(null, '', window.location.pathname);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [stations]);

  const mapCenter = selectedCity === 'My Location' && userLocation ? userLocation : (CITY_CENTERS[selectedCity] || CITY_CENTERS['All Cities']);
  const selectedStockStatus = selectedStation ? getStationStockStatus(selectedStation) : null;
  const selectedStockConfig = selectedStockStatus ? STATION_STOCK_CONFIG[selectedStockStatus] : null;
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
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2"><button type="button" onClick={() => setIsHowItWorksOpen(true)} className="inline-flex min-h-11 items-center gap-2 border-b border-white/40 text-sm font-black text-white transition hover:border-[#f5aa54] hover:text-[#f5aa54] focus:outline-none focus:ring-2 focus:ring-[#f5aa54] focus:ring-offset-2 focus:ring-offset-forest"><CircleHelp className="h-4 w-4" /> {t('How Alipo works')}</button><button type="button" onClick={() => setIsNameSuggestionsOpen(true)} className="inline-flex min-h-11 items-center gap-2 border-b border-[#f5aa54] text-sm font-black text-[#f5aa54] transition hover:text-white"><ThumbsUp className="h-4 w-4" /> {t('Confirm suggested filling station names')}</button><Link href="/stations/candidates" className="inline-flex min-h-11 items-center gap-2 border-b border-white/40 text-sm font-black text-white transition hover:border-[#f5aa54] hover:text-[#f5aa54]"><MapPinned className="h-4 w-4" /> {t('Review proposed station locations')}</Link></div>
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

        <section id="find-fuel" className="sticky top-[72px] z-20 scroll-mt-[72px] border-b border-line bg-ivory/95 backdrop-blur-xl">
          <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-8 lg:px-12">
            <div className="grid gap-3">
              <label className="relative block"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><span className="sr-only">{t('Search station or area')}</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={t('Search station or area')} className="h-12 w-full border border-line bg-white pl-11 pr-4 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10" /></label>
              <div className="no-scrollbar flex gap-2 overflow-x-auto border-y border-line/70 py-2"><button type="button" onClick={activateLocation} disabled={locationState === 'locating'} className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap px-4 text-xs font-bold transition ${selectedCity === 'My Location' ? 'bg-orange text-white' : 'border border-orange/40 bg-white text-forest hover:border-orange'} disabled:opacity-60`}><LocateFixed className={`h-4 w-4 ${locationState === 'locating' ? 'animate-pulse' : ''}`} />{t(locationState === 'locating' ? 'Finding you…' : locationState === 'active' ? 'Near me' : 'Use my location')}</button>{notificationState !== 'unsupported' ? <button type="button" onClick={() => { void toggleStationAlerts(); }} aria-pressed={stationAlertsEnabled} className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap px-4 text-xs font-bold transition ${stationAlertsEnabled ? 'bg-forest text-white' : 'border border-line bg-white text-forest hover:border-forest'}`}><Bell className="h-4 w-4" />{t(stationAlertsEnabled ? 'Alerts on' : 'Station alerts')}</button> : null}<label className="flex h-10 shrink-0 items-center gap-2 border border-line bg-white px-3 text-xs font-bold text-muted"><span className="hidden sm:inline">{t('Radius')}</span><select aria-label={t('Search radius')} value={radiusKm} onChange={(event) => { setSelectedStation(null); setRadiusKm(Number(event.target.value)); }} disabled={selectedCity === 'All Cities'} className="bg-transparent font-black text-forest outline-none disabled:opacity-40">{[5, 10, 20, 30, 50].map((radius) => <option key={radius} value={radius}>{radius} km</option>)}</select></label></div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto">{CITIES.map((city) => <button key={city} onClick={() => { setSelectedStation(null); setSelectedCity(city); }} className={`h-10 shrink-0 whitespace-nowrap px-4 text-xs font-bold transition ${selectedCity === city ? 'bg-forest text-white' : 'border border-line bg-white text-ink hover:border-forest'}`}>{city === 'All Cities' ? t('All Malawi') : city}</button>)}</div>
            </div>
            {locationState === 'outside' ? <p role="status" className="mt-3 border-l-2 border-orange pl-3 text-xs font-bold text-muted">{t('Your location is outside Malawi, so the national map is shown.')}</p> : locationState === 'error' ? <p role="status" className="mt-3 border-l-2 border-[#c9583c] pl-3 text-xs font-bold text-[#9d321d]">{t('Location unavailable. Allow location access in your browser and try again.')}</p> : notificationState === 'denied' ? <p role="status" className="mt-3 border-l-2 border-[#c9583c] pl-3 text-xs font-bold text-[#9d321d]">{t('Notifications are blocked. Enable them in your browser settings to use station alerts.')}</p> : null}
            <div className="mt-3 grid gap-2 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-3">
              <div className="flex min-w-0 items-center gap-2"><div className="flex min-w-0 flex-1 border border-line bg-white lg:flex-none" aria-label={t('Fuel type filter')}>{(['all', 'petrol', 'diesel'] as const).map((fuel) => <button key={fuel} type="button" onClick={() => { setSelectedStation(null); setSelectedFuel(fuel); }} aria-pressed={selectedFuel === fuel} className={`h-10 min-w-0 flex-1 whitespace-nowrap px-3 text-[10px] font-black uppercase transition lg:flex-none ${selectedFuel === fuel ? 'bg-orange text-white' : 'text-muted hover:text-forest'}`}>{t(fuel === 'all' ? 'All' : fuel === 'petrol' ? 'Petrol' : 'Diesel')}</button>)}</div><div className="flex shrink-0 border border-line bg-white lg:hidden"><button aria-label={t('Show station list')} onClick={() => setActiveTab('list')} className={`grid h-10 w-11 place-items-center ${activeTab === 'list' ? 'bg-forest text-white' : 'text-muted'}`}><List className="h-4 w-4" /></button><button aria-label={t('Show map')} onClick={showMap} className={`grid h-10 w-11 place-items-center ${activeTab === 'map' ? 'bg-forest text-white' : 'text-muted'}`}><MapIcon className="h-4 w-4" /></button></div></div>
              <div className="no-scrollbar flex min-w-0 gap-1 overflow-x-auto border-y border-line/70 py-1 lg:border-0 lg:py-0">{STATUS_FILTERS.map((filter) => <button key={filter.id} onClick={() => setSelectedStatus(filter.id)} aria-pressed={selectedStatus === filter.id} className={`inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap px-3 text-xs font-bold transition ${selectedStatus === filter.id ? 'bg-[#dfead7] text-forest' : 'text-muted hover:bg-white'}`}>{filter.id !== 'all' && <span className={`h-2 w-2 rounded-full ${filter.id === 'available' ? 'bg-[#398151]' : filter.id === 'low' ? 'bg-[#df972f]' : filter.id === 'stale' ? 'bg-[#795548]' : 'bg-[#c9583c]'}`} />}{t(filter.label)}</button>)}</div>
            </div>
          </div>
        </section>

        {nearbyStation && nearbyStation.station.id !== dismissedArrivalStationId ? <section aria-live="polite" className="border-b border-[#bbd2ae] bg-[#e1edd9]">
          <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-5 py-3 sm:px-8 lg:px-12">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-forest text-white"><MapPin className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.14em] text-forest">{t('You may be at this station')}</p><p className="truncate text-sm font-black text-ink">{nearbyStation.station.name} · {Math.round(nearbyStation.distance)} m {t('away')}</p></div>
            <button type="button" onClick={() => { setSelectedStation(nearbyStation.station); setIsReportModalOpen(true); }} className="shrink-0 bg-forest px-4 py-2.5 text-xs font-black text-white">{t('Quick report')}</button>
            <button type="button" aria-label={t('Dismiss station suggestion')} onClick={() => setDismissedArrivalStationId(nearbyStation.station.id)} className="grid h-9 w-9 shrink-0 place-items-center text-forest"><XCircle className="h-5 w-5" /></button>
          </div>
        </section> : null}

        <section className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] lg:min-h-[720px] lg:grid-cols-[440px_minmax(0,1fr)]">
          <aside className={`${activeTab === 'map' ? 'hidden lg:block' : 'block'} min-w-0 max-w-full border-r border-line bg-[#f8f5ee] px-4 py-6 sm:px-8 lg:px-7`}>
            <div className="mb-3 flex items-end justify-between"><div><p className="eyebrow text-orange">{selectedCity === 'All Cities' ? t('Malawi coverage') : selectedCity === 'My Location' ? t('Near your location') : t('{city} coverage', { city: selectedCity })}</p><h2 className="mt-1 text-xl font-black tracking-[-.03em]">{t(selectedCity !== 'All Cities' ? '{count} fuel stations within {radius} km' : '{count} fuel stations', { count: filteredStations.length, radius: radiusKm })}</h2></div><button onClick={fetchStations} className="inline-flex items-center gap-2 text-xs font-bold text-forest"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('Refresh')}</button></div>
            <button type="button" onClick={() => setIsNameSuggestionsOpen(true)} className="mb-4 flex min-h-11 w-full items-center justify-between border border-forest/20 bg-[#e5eddc] px-4 text-left text-xs font-black text-forest transition hover:border-forest"><span className="inline-flex items-center gap-2"><ThumbsUp className="h-4 w-4" /> {t('Confirm suggested filling station names')}</span><ArrowRight className="h-4 w-4" /></button>
            <p className="mb-5 border-l-2 border-orange pl-3 text-[11px] leading-4 text-muted">{t('Live Alipo station data. OpenStreetMap is used only where Alipo coverage is unavailable.')}</p>
            {loading ? <div role="status" className="border border-line bg-white p-8 text-center"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-orange" /><p className="mt-3 font-bold">{t('Loading fuel stations')}</p><p className="mt-1 text-sm text-muted">{t('Checking live Alipo coverage…')}</p></div> : filteredStations.length ? <div className="min-w-0 space-y-3 lg:max-h-[650px] lg:overflow-y-auto lg:pr-2">{filteredStations.map((station, index) => <StationCard key={station.id} station={station} stationNumber={index + 1} isSelected={selectedStation?.id === station.id} onSelectStation={setSelectedStation} onReportClick={(item) => { setSelectedStation(item); setIsReportModalOpen(true); }} />)}</div> : <div className="border border-line bg-white p-8 text-center"><Info className="mx-auto h-6 w-6 text-muted" /><p className="mt-3 font-bold">{t('No matching stations')}</p><p className="mt-1 text-sm text-muted">{t('Try another area or fuel status.')}</p></div>}
          </aside>

          <div ref={mapSectionRef} className={`${activeTab === 'list' ? 'hidden lg:block' : 'block'} relative min-h-[610px] scroll-mt-[190px] bg-[#dce2d6] lg:min-h-[720px]`}>
            <StationMap stations={filteredStations} selectedStation={selectedStation} onSelectStation={setSelectedStation} onClearSelection={clearMapSelection} center={mapCenter} zoom={selectedCity === 'All Cities' ? 7 : selectedCity === 'My Location' ? 14.5 : 12} radiusKm={selectedCity === 'All Cities' ? undefined : radiusKm} userLocation={userLocation} focusUserLocation={selectedCity === 'My Location'} />
            {loading ? <div role="status" className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 border border-forest/15 bg-ivory px-4 py-3 text-xs font-black text-forest shadow-lg"><span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin text-orange" /> {t('Loading fuel stations…')}</span></div> : null}
            {selectedStation && <div className="absolute bottom-5 left-4 right-4 z-[400] border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(5,48,33,.22)] sm:left-6 sm:right-auto sm:w-[410px]">
              <div className="flex items-start justify-between gap-4"><div><div className="text-[11px] font-black uppercase tracking-[.14em] text-forest">{classifyStationBrand(selectedStation.name, selectedStation.brand)}</div><h3 className="mt-2 text-xl font-black tracking-[-.03em]">{selectedStation.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5" /> {selectedStation.district}, {selectedStation.city}</p></div><div className="flex flex-col items-end gap-1">{selectedStockConfig ? <span className={`whitespace-nowrap border px-3 py-1.5 text-xs font-black ${selectedStockConfig.color}`}>{t(selectedStockConfig.label)}</span> : null}{selectedStation.is_stale ? <span className="bg-[#f3ece8] px-2 py-1 text-[10px] font-black uppercase text-[#795548]">{t('Stale')}</span> : null}</div></div>
              <div className="mt-4 grid grid-cols-2 border-y border-line py-3 text-xs"><div><span className="block text-muted">{t('Fuel types')}</span><strong className="capitalize">{selectedStation.fuel_types.map((fuel) => t(fuel === 'petrol' ? 'Petrol' : 'Diesel')).join(' & ')}</strong></div><div><span className="block text-muted">{t('Updated')}</span><strong><TimeAgo date={selectedStation.last_reported_at || selectedStation.updated} /></strong></div></div>
              <a href="#report-fuel" onClick={() => setIsReportModalOpen(true)} className="mt-4 inline-flex w-full items-center justify-between bg-forest px-4 py-3 text-sm font-black text-white transition hover:bg-[#0b5940]">{t('Report an update')} <ArrowRight className="h-4 w-4" /></a>
            </div>}
          </div>
        </section>

        <section className="border-t border-line bg-[#eee9dd]"><div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 sm:grid-cols-2 sm:px-8 lg:px-12"><div><p className="eyebrow text-orange">No data? No problem.</p><h2 className="mt-2 text-xl font-black">Alipo works wherever you drive.</h2></div><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center border border-forest/20 text-forest"><MapPin className="h-5 w-5" /></div><div><p className="text-xs text-muted">Community reports</p><p className="font-bold">Built around Malawi</p></div></div></div></section>
      </main>
      <footer className="bg-[#032e20] px-5 py-6 text-xs text-white/55"><div className="mx-auto flex max-w-[1440px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p><strong className="text-white">Alipo</strong> — Find fuel. Share updates. Keep Malawi moving.</p><p><a href="mailto:info@wekode.dev" className="transition hover:text-white">info@wekode.dev</a> · WhatsApp +27 68 602 1556 · Created by <a href="https://wekode.dev" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white">WeKode</a></p></div></footer>
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} stations={stations} selectedStation={selectedStation} onReportSubmitted={fetchStations} />
      <HowItWorks isOpen={isHowItWorksOpen} onClose={closeHowItWorks} />
      <NameSuggestions isOpen={isNameSuggestionsOpen} onClose={() => setIsNameSuggestionsOpen(false)} onConfirmed={fetchStations} />
    </div>
  );
}
