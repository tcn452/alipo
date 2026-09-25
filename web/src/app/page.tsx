'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Bell, CircleHelp, Info, List, Map as MapIcon, MapPin, MapPinned, Navigation, Plus, RefreshCw, ThumbsUp, XCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { ReportModal } from '@/components/ReportModal';
import { StationCard } from '@/components/StationCard';
import { SponsorBanner } from '@/components/SponsorBanner';
import { CITY_CENTERS, DEFAULT_CITY, classifyStationBrand, getStationStockStatus, STATION_STOCK_CONFIG } from '@/lib/constants';
import { queryGeolocationPermission, requestCurrentPosition, watchUserPosition, isStandalonePwa, subscribeGeolocationPermissionChange } from '@/lib/geolocation';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Station } from '@/types/alipo';
import { TimeAgo } from '@/components/TimeAgo';
import { useLanguage } from '@/lib/i18n';
import { HowItWorks } from '@/components/HowItWorks';
import { NameSuggestions } from '@/components/NameSuggestions';
import { OnboardingModal } from '@/components/OnboardingModal';
import { LocationHelpSheet } from '@/components/LocationHelpSheet';
import { StationFilters } from '@/components/StationFilters';
import { matchesStationFilters, type ReportFilters } from '@/lib/station-filters';

function StationMapLoading() {
  const { t } = useLanguage();
  return (
    <div className="grid min-h-[540px] place-items-center bg-[#e7eadf] text-forest">
      <div className="text-center">
        <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" />
        <p className="text-sm font-bold">{t('Loading the live fuel map')}</p>
      </div>
    </div>
  );
}

const StationMap = dynamic(() => import('@/components/map/StationMap'), {
  ssr: false,
  loading: () => <StationMapLoading />,
});

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
    petrol_confidence: typeof row.petrol_confidence === 'number' ? row.petrol_confidence : Number(row.petrol_confidence || 0),
    diesel_confidence: typeof row.diesel_confidence === 'number' ? row.diesel_confidence : Number(row.diesel_confidence || 0),
    petrol_confirmations: Number(row.petrol_confirmations || 0),
    diesel_confirmations: Number(row.diesel_confirmations || 0),
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
  const [reportFilters, setReportFilters] = useState<ReportFilters>({ status: 'all', freshness: 'all' });
  const [filterTime, setFilterTime] = useState(Date.now);
  const [fuelPreferenceLoaded, setFuelPreferenceLoaded] = useState(false);
  const [selectedFuel, setSelectedFuel] = useState<'all' | 'petrol' | 'diesel'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isNameSuggestionsOpen, setIsNameSuggestionsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('list');
  const [loading, setLoading] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [locationState, setLocationState] = useState<'idle' | 'locating' | 'active' | 'outside' | 'error' | 'denied'>('idle');
  const [isLocationHelpOpen, setIsLocationHelpOpen] = useState(false);
  const [dismissedArrivalStationId, setDismissedArrivalStationId] = useState<string | null>(null);
  const [stationAlertsEnabled, setStationAlertsEnabled] = useState(false);
  const [notificationState, setNotificationState] = useState<'ready' | 'unsupported' | 'denied'>('ready');
  const stationRequestRef = useRef(0);
  const mapSectionRef = useRef<HTMLDivElement>(null);
  const locationWatchRef = useRef<number | null>(null);
  const followLocationRef = useRef(false);
  const lastTrackedLocationRef = useRef<[number, number] | null>(null);
  const lastLocationRequestAtRef = useRef(0);
  const watchedStatusRef = useRef<Record<string, string>>({});

  const showMap = useCallback(() => {
    setSelectedStation(null);
    setActiveTab('map');
    window.requestAnimationFrame(() => mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);
  const viewStationOnMap = useCallback((station: Station) => {
    setSelectedStation(station);
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
        setSelectedStation((current) => current && reported.some((item) => item.id === current.id) ? current : null);
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
      setSelectedStation((current) => current && mapped.some((item) => item.id === current.id) ? current : null);
    } finally {
      if (requestId === stationRequestRef.current) setLoading(false);
    }
  }, [radiusKm, selectedCity, userLocation]);

  const applyPosition = useCallback((coords: GeolocationCoordinates) => {
    if (!isInMalawi(coords.latitude, coords.longitude)) {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
      setUserLocation(null);
      setLocationAccuracy(null);
      setSelectedCity((current) => (current === 'My Location' ? 'All Cities' : current));
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
    if (followLocationRef.current) setSelectedCity('My Location');
    setLocationState('active');
  }, []);

  const startLocationWatch = useCallback(() => {
    if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
    locationWatchRef.current = watchUserPosition(
      ({ coords }) => applyPosition(coords),
      (code) => {
        if (code === 'denied') {
          setLocationState((current) => (current === 'active' ? current : 'denied'));
          return;
        }
        setLocationState((current) => (current === 'active' ? current : 'error'));
      },
    );
  }, [applyPosition]);

  const activateLocation = useCallback(() => {
    followLocationRef.current = true;
    if (!navigator.geolocation) {
      setLocationState('error');
      return;
    }
    const now = Date.now();
    if (now - lastLocationRequestAtRef.current < 700) return;
    lastLocationRequestAtRef.current = now;

    const standalone = isStandalonePwa();
    // In an installed PWA, Android often never shows a web prompt once Location was
    // denied (or never granted) at the app-permission level. Surface help if already denied.
    if (standalone) {
      void queryGeolocationPermission().then((permission) => {
        if (permission === 'denied') {
          setLocationState('denied');
          setIsLocationHelpOpen(true);
        }
      });
    }

    // Invoke geolocation BEFORE any React state update so Samsung Internet still
    // associates the request with the active user gesture.
    requestCurrentPosition(
      (position) => {
        applyPosition(position.coords);
        startLocationWatch();
      },
      (code) => {
        setLocationState(code === 'denied' ? 'denied' : 'error');
        if (code === 'denied') setIsLocationHelpOpen(true);
      },
    );
    setLocationState('locating');
  }, [applyPosition, startLocationWatch]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('alipo-fuel-preference-v1');
      if (saved === 'all' || saved === 'petrol' || saved === 'diesel') setSelectedFuel(saved);
    } catch { /* Storage may be unavailable in private browsing. */ }
    setFuelPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!fuelPreferenceLoaded) return;
    try { localStorage.setItem('alipo-fuel-preference-v1', selectedFuel); } catch { /* Keep filtering usable without storage. */ }
  }, [selectedFuel, fuelPreferenceLoaded]);

  useEffect(() => {
    const refreshAge = () => setFilterTime(Date.now());
    const timer = window.setInterval(refreshAge, 60_000);
    document.addEventListener('visibilitychange', refreshAge);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshAge);
    };
  }, []);

  useEffect(() => () => {
    if (locationWatchRef.current !== null) navigator.geolocation.clearWatch(locationWatchRef.current);
  }, []);

  // Only auto-start when permission is already granted. Samsung Internet (and others)
  // suppress the permission prompt unless location is requested from a user tap.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const permission = await queryGeolocationPermission();
      if (cancelled || permission !== 'granted') return;
      activateLocation();
    })();
    return () => {
      cancelled = true;
    };
  }, [activateLocation]);

  // If the user enables Location in Android settings and returns, retry automatically.
  useEffect(() => {
    const maybeRetry = () => {
      if (document.visibilityState !== 'visible') return;
      if (locationState !== 'denied' && locationState !== 'error') return;
      void queryGeolocationPermission().then((permission) => {
        if (permission === 'granted') activateLocation();
      });
    };
    const unsubscribe = subscribeGeolocationPermissionChange((state) => {
      if (state === 'granted') activateLocation();
    });
    document.addEventListener('visibilitychange', maybeRetry);
    window.addEventListener('focus', maybeRetry);
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', maybeRetry);
      window.removeEventListener('focus', maybeRetry);
    };
  }, [activateLocation, locationState]);

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

  useEffect(() => {
    let watchedIds: string[] = [];
    try { watchedIds = JSON.parse(localStorage.getItem('alipo-watched-stations') || '[]') as string[]; } catch { watchedIds = []; }
    const next: Record<string, string> = {};
    for (const station of stations) {
      if (!watchedIds.includes(station.id)) continue;
      const status = `${station.petrol_status || 'unknown'}:${station.diesel_status || 'unknown'}`;
      next[station.id] = status;
      const previous = watchedStatusRef.current[station.id];
      if (previous && previous !== status && status.includes('available') && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
        void navigator.serviceWorker.ready.then((registration) => registration.showNotification(t('Fuel update at {station}', { station: station.name }), { body: t('Fuel is now reported available. Open Alipo to check the latest queue.'), icon: '/icon-192.png', badge: '/favicon.png', tag: `fuel-available-${station.id}`, data: { stationId: station.id } }));
      }
    }
    watchedStatusRef.current = next;
  }, [stations, t]);

  useEffect(() => {
    try {
      const onboarded = localStorage.getItem('alipo-onboarded');
      if (!onboarded) {
        setIsOnboardingOpen(true);
      }
    } catch {
      // Ignore storage restrictions
    }
  }, []);

  const filteredStations = useMemo(() => stations.filter((station) =>
    matchesStationFilters(station, selectedFuel, reportFilters, searchQuery, Math.max(filterTime, Date.now())),
  ).sort((a, b) => {
    const score = (station: Station) => {
      const status = selectedFuel === 'petrol' ? station.petrol_status : selectedFuel === 'diesel' ? station.diesel_status : station.latest_status;
      const confidence = selectedFuel === 'petrol' ? station.petrol_confidence : selectedFuel === 'diesel' ? station.diesel_confidence : Math.max(station.petrol_confidence || 0, station.diesel_confidence || 0);
      const queuePenalty = { none: 0, short: 5, medium: 20, long: 45 }[station.latest_queue || 'medium'];
      const statusPenalty = status === 'available' ? 0 : status === 'low' ? 35 : 100;
      return (station.distance_km || 0) * 2 + queuePenalty + statusPenalty + (1 - (confidence || 0)) * 20;
    };
    return score(a) - score(b);
  }), [stations, selectedFuel, reportFilters, searchQuery, filterTime]);

  useEffect(() => {
    setSelectedStation((current) => current && filteredStations.some((station) => station.id === current.id) ? current : null);
  }, [filteredStations]);

  const resetFilters = useCallback(() => {
    setReportFilters({ status: 'all', freshness: 'all' });
    setSelectedFuel('all');
    setSearchQuery('');
    setSelectedStation(null);
  }, []);

  const nextRadius = [5, 10, 20, 50].find((radius) => radius > radiusKm);
  const recoveryContext = selectedCity === 'All Cities'
    ? t('Searching across Malawi.')
    : t('Searching within {radius} km of {area}.', { radius: radiusKm, area: selectedCity === 'My Location' ? t('your location') : selectedCity });
  const emptyMessage = reportFilters.status === 'has-fuel'
    ? t(selectedFuel === 'petrol' ? 'No recent petrol availability reports match.' : selectedFuel === 'diesel' ? 'No recent diesel availability reports match.' : 'No recent fuel availability reports match.')
    : t('No matching stations');

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
  return (
    <div className="min-h-screen overflow-x-clip bg-ivory text-ink">
      <Header
        onOpenReport={() => setIsReportModalOpen(true)}
        onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
      />
      <main>
        <section className="overflow-hidden bg-forest text-white">
          <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-12 lg:py-8">
            <p className="eyebrow relative z-10 max-w-full whitespace-normal leading-5 text-[#f5aa54]">
              {t("Malawi's live fuel network. Keep Malawi moving.")}
            </p>
            <h1 className="mt-2 max-w-3xl font-display text-3xl leading-[1.05] tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              {t("Fuel is there. You're not alone.")}
            </h1>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-white/70 sm:text-sm">
              {t('Find fuel, see queue times and share what you know. Built for every drive moving in Malawi.')}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setIsHowItWorksOpen(true)}
                className="inline-flex min-h-10 items-center gap-2 bg-orange px-4 text-xs font-black text-white transition hover:bg-[#d95a1c]"
              >
                <CircleHelp className="h-4 w-4" /> {t('How Alipo works')}
              </button>
              <Link
                href="/stations/candidates"
                className="inline-flex min-h-10 items-center gap-1.5 border border-white/30 px-3 text-xs font-bold text-white/85 transition hover:border-[#f5aa54] hover:text-[#f5aa54]"
              >
                <MapPinned className="h-3.5 w-3.5" /> {t('Review proposed station locations')}
              </Link>
            </div>
          </div>
        </section>

        <StationFilters
          fuel={selectedFuel}
          onFuelChange={setSelectedFuel}
          filters={reportFilters}
          onFiltersChange={setReportFilters}
          search={searchQuery}
          onSearchChange={setSearchQuery}
          city={selectedCity}
          radius={radiusKm}
          onAreaChange={(city, radius) => {
            followLocationRef.current = city === 'My Location';
            setSelectedCity(city);
            setRadiusKm(radius);
            setSelectedStation(null);
          }}
          locationState={locationState}
          onUseLocation={activateLocation}
          onLocationHelp={() => setIsLocationHelpOpen(true)}
          onReset={resetFilters}
        />

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
            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2"><Link href="/stations/add" className="flex min-h-11 items-center justify-between border-2 border-forest bg-forest px-3.5 text-left text-xs font-black text-white shadow-xs transition hover:bg-[#0b5940]"><span className="inline-flex items-center gap-2"><Plus className="h-4 w-4 text-[#f5aa54]" />{t('Add a missing filling station')}</span><ArrowRight className="h-4 w-4 text-[#f5aa54]" /></Link><button type="button" onClick={() => setIsNameSuggestionsOpen(true)} className="flex min-h-11 items-center justify-between border border-forest/20 bg-[#e5eddc] px-3.5 text-left text-xs font-black text-forest transition hover:border-forest"><span className="inline-flex items-center gap-2"><ThumbsUp className="h-4 w-4" />{t('Confirm suggested filling station names')}</span><ArrowRight className="h-4 w-4" /></button></div>
            {loading ? <div role="status" className="border border-line bg-white p-8 text-center"><RefreshCw className="mx-auto h-6 w-6 animate-spin text-orange" /><p className="mt-3 font-bold">{t('Loading fuel stations')}</p><p className="mt-1 text-sm text-muted">{t('Checking live Alipo coverage…')}</p></div> : filteredStations.length ? <div className="min-w-0 space-y-3 lg:max-h-[650px] lg:overflow-y-auto lg:pr-2">{filteredStations.map((station, index) => <Fragment key={station.id}><StationCard station={station} stationNumber={index + 1} isSelected={selectedStation?.id === station.id} onSelectStation={setSelectedStation} onViewMap={viewStationOnMap} onReportClick={(item) => { setSelectedStation(item); setIsReportModalOpen(true); }} />{(index === 2 || (index > 2 && (index - 2) % 6 === 0) || (filteredStations.length < 3 && index === filteredStations.length - 1)) ? <SponsorBanner key={`sponsor-${index}`} placement="in_feed" city={selectedCity} /> : null}</Fragment>)}<div className="mt-2 border border-dashed border-forest/30 bg-[#f0f5ec] p-4 text-center"><p className="text-xs font-black text-forest">{t("Don't see your local filling station?")}</p><p className="mt-1 text-[11px] text-muted">{t('Add it while at the pumps to help other drivers.')}</p><Link href="/stations/add" className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 bg-forest px-4 text-xs font-black text-white transition hover:bg-[#0b5940]"><Plus className="h-4 w-4 text-[#f5aa54]" />{t('Add missing filling station')}</Link></div></div> : <div role="status" className="border border-line bg-white p-5 text-center">
              <Info className="mx-auto h-6 w-6 text-muted" />
              <p className="mt-3 font-bold">{emptyMessage}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{recoveryContext} {t('Missing reports do not mean there is no fuel.')}</p>
              <div className="mt-4 flex flex-col gap-2">
                {selectedCity !== 'All Cities' && nextRadius ? <button type="button" onClick={() => setRadiusKm(nextRadius)} className="min-h-11 bg-forest px-3 py-2 text-sm font-bold text-white">{t('Expand to {radius} km', { radius: nextRadius })}</button> : null}
                {reportFilters.status !== 'all' || reportFilters.freshness !== 'all' ? <button type="button" onClick={() => setReportFilters({ status: 'all', freshness: 'all' })} className="min-h-11 border border-forest px-3 py-2 text-sm font-bold text-forest">{t('Show all statuses')}</button> : null}
                {searchQuery ? <button type="button" onClick={() => setSearchQuery('')} className="min-h-11 text-sm font-bold text-forest underline">{t('Clear search')}</button> : null}
                {selectedFuel !== 'all' ? <button type="button" onClick={() => setSelectedFuel('all')} className="min-h-11 text-sm font-bold text-forest underline">{t('All fuel')}</button> : null}
                <Link href="/stations/add" className="inline-flex min-h-11 items-center justify-center gap-2 text-xs font-bold text-forest underline">{t('Add missing filling station')}</Link>
              </div>
            </div>}
          </aside>

          <div ref={mapSectionRef} className={`${activeTab === 'list' ? 'hidden lg:block' : 'block'} relative min-h-[610px] scroll-mt-[190px] bg-[#dce2d6] lg:min-h-[720px]`}>
            <StationMap stations={filteredStations} selectedStation={selectedStation} onSelectStation={setSelectedStation} onClearSelection={clearMapSelection} center={mapCenter} zoom={selectedCity === 'All Cities' ? 7 : selectedCity === 'My Location' ? 14.5 : 12} radiusKm={selectedCity === 'All Cities' ? undefined : radiusKm} userLocation={userLocation} focusUserLocation={selectedCity === 'My Location'} />
            {loading ? <div role="status" className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2 border border-forest/15 bg-ivory px-4 py-3 text-xs font-black text-forest shadow-lg"><span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin text-orange" /> {t('Loading fuel stations…')}</span></div> : null}
            {selectedStation && <div className="absolute bottom-5 left-4 right-4 z-[400] border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(5,48,33,.22)] sm:left-6 sm:right-auto sm:w-[410px]">
              <div className="flex items-start justify-between gap-4"><div><div className="text-[11px] font-black uppercase tracking-[.14em] text-forest">{classifyStationBrand(selectedStation.name, selectedStation.brand)}</div><h3 className="mt-2 text-xl font-black tracking-[-.03em]">{selectedStation.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5" /> {selectedStation.district}, {selectedStation.city}</p></div><div className="flex flex-col items-end gap-1">{selectedStockConfig ? <span className={`whitespace-nowrap border px-3 py-1.5 text-xs font-black ${selectedStockConfig.color}`}>{t(selectedStockConfig.label)}</span> : null}{selectedStation.is_stale ? <span className="bg-[#f3ece8] px-2 py-1 text-[10px] font-black uppercase text-[#795548]">{t('Stale')}</span> : null}</div></div>
              <div className="mt-4 grid grid-cols-2 border-y border-line py-3 text-xs"><div><span className="block text-muted">{t('Fuel types')}</span><strong className="capitalize">{selectedStation.fuel_types.map((fuel) => t(fuel === 'petrol' ? 'Petrol' : 'Diesel')).join(' & ')}</strong></div><div><span className="block text-muted">{t('Updated')}</span><strong><TimeAgo date={selectedStation.last_reported_at || selectedStation.updated} /></strong></div></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedStation.latitude},${selectedStation.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 bg-forest px-3 text-xs font-black text-white transition hover:bg-[#0b5940] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                >
                  <Navigation className="h-4 w-4 text-[#f5aa54]" />
                  {t('Directions')}
                </a>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(true)}
                  className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-forest bg-white px-3 text-xs font-black text-forest transition hover:bg-[#e5eddc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
                >
                  <span>{t('Update fuel')}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>}
          </div>
        </section>

        {notificationState !== 'unsupported' ? <section aria-label={t('Station alerts')} className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-5 sm:px-8 lg:px-12">
          <div><h2 className="text-sm font-bold text-forest">{t('Station alerts')}</h2><p className="mt-1 text-xs leading-5 text-muted">{t('Get a reminder to share an update when you reach a station.')}</p></div>
          <button type="button" aria-pressed={stationAlertsEnabled} onClick={() => { void toggleStationAlerts(); }} className="inline-flex min-h-11 items-center gap-2 border border-forest px-4 py-2 text-sm font-bold text-forest"><Bell className="h-4 w-4" />{t(stationAlertsEnabled ? 'Alerts on' : 'Enable alerts')}</button>
          {notificationState === 'denied' ? <p role="status" className="w-full text-xs text-muted">{t('Notifications are blocked. Enable them in your browser settings to use station alerts.')}</p> : null}
        </section> : null}

        {/* Floating Mobile Map/List Toggle Pill */}
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 lg:hidden">
          <button
            type="button"
            onClick={() => {
              if (activeTab === 'list') {
                showMap();
              } else {
                setActiveTab('list');
              }
            }}
            className="inline-flex items-center gap-2 rounded-full border-2 border-white/25 bg-forest px-5 py-3 text-xs font-black text-white shadow-[0_12px_36px_rgba(3,46,32,0.45)] transition hover:bg-[#0b5940] active:scale-95"
          >
            {activeTab === 'list' ? (
              <>
                <MapIcon className="h-4 w-4 text-[#f5aa54]" />
                <span>{t('Map view')}</span>
              </>
            ) : (
              <>
                <List className="h-4 w-4 text-[#f5aa54]" />
                <span>{t('List view')}</span>
              </>
            )}
          </button>
        </div>

        <SponsorBanner placement="banner" city={selectedCity} className="border-x-0 border-b-0" />

        <section className="border-t border-line bg-[#eee9dd]"><div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 sm:grid-cols-2 sm:px-8 lg:px-12"><div><p className="eyebrow text-orange">{t('No data? No problem.')}</p><h2 className="mt-2 text-xl font-black">{t('Alipo works wherever you drive.')}</h2></div><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center border border-forest/20 text-forest"><MapPin className="h-5 w-5" /></div><div><p className="text-xs text-muted">{t('Community reports')}</p><p className="font-bold">{t('Built around Malawi')}</p></div></div></div></section>
      </main>
      <footer className="bg-[#032e20] px-5 py-6 text-xs text-white/55"><div className="mx-auto flex max-w-[1440px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p><strong className="text-white">Alipo</strong> — {t('Find fuel. Share updates. Keep Malawi moving.')}</p><p><Link href="/privacy" className="underline decoration-white/30 underline-offset-4 transition hover:text-white">{t('Privacy Policy')}</Link> · <a href="mailto:info@wekode.dev" className="transition hover:text-white">info@wekode.dev</a> · WhatsApp +27 68 602 1556 · {t('Created by')} <a href="https://wekode.dev" target="_blank" rel="noopener noreferrer" className="font-bold text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white">WeKode</a></p></div></footer>
      


      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} stations={stations} selectedStation={selectedStation} onReportSubmitted={fetchStations} />
      <HowItWorks isOpen={isHowItWorksOpen} onClose={closeHowItWorks} />
      <NameSuggestions isOpen={isNameSuggestionsOpen} onClose={() => setIsNameSuggestionsOpen(false)} onConfirmed={fetchStations} />
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onAllowLocation={activateLocation}
        isLocationActive={locationState === 'active'}
        onEnableAlerts={async () => {
          if (stationAlertsEnabled) return;
          await toggleStationAlerts();
        }}
        alertsEnabled={stationAlertsEnabled}
        notificationState={notificationState}
      />
      <LocationHelpSheet
        isOpen={isLocationHelpOpen}
        onClose={() => setIsLocationHelpOpen(false)}
        onRetry={activateLocation}
      />
    </div>
  );
}
