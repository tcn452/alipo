'use client';

import { Bell, LocateFixed, RotateCcw, Search, X } from 'lucide-react';
import { CITIES } from '@/lib/constants';
import { useLanguage } from '@/lib/i18n';

const STATUS_FILTERS = [
  { id: 'all', label: 'All reports' },
  { id: 'available', label: 'Available' },
  { id: 'low', label: 'Low supply' },
  { id: 'out', label: 'No fuel' },
  { id: 'stale', label: 'Stale' },
] as const;

const STATUS_DOT: Record<string, string> = {
  available: 'bg-[#398151]',
  low: 'bg-[#df972f]',
  out: 'bg-[#c9583c]',
  stale: 'bg-[#795548]',
};

type LocationState = 'idle' | 'locating' | 'active' | 'outside' | 'error' | 'denied';

interface StationFiltersProps {
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedFuel: 'all' | 'petrol' | 'diesel';
  onFuelChange: (fuel: 'all' | 'petrol' | 'diesel') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCity: string;
  onCityChange: (city: string) => void;
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  hasActiveFilters: boolean;
  onReset: () => void;
  locationState: LocationState;
  onUseLocation: () => void;
  notificationState: 'ready' | 'unsupported' | 'denied';
  stationAlertsEnabled: boolean;
  onToggleAlerts: () => void;
  isPwaMode: boolean;
  isSamsungBrowser: boolean;
  onShowLocationHelp: () => void;
}

export function StationFilters({
  selectedStatus,
  onStatusChange,
  selectedFuel,
  onFuelChange,
  searchQuery,
  onSearchChange,
  selectedCity,
  onCityChange,
  radiusKm,
  onRadiusChange,
  hasActiveFilters,
  onReset,
  locationState,
  onUseLocation,
  notificationState,
  stationAlertsEnabled,
  onToggleAlerts,
  isPwaMode,
  isSamsungBrowser,
  onShowLocationHelp,
}: StationFiltersProps) {
  const { t } = useLanguage();
  const distanceApplies = selectedCity !== 'All Cities';

  return (
    <section id="find-fuel" className="sticky top-[72px] z-20 scroll-mt-[72px] border-b border-line bg-ivory/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-2.5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <span className="sr-only">{t('Search station, area or brand')}</span>
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={t('Search station, area or brand')}
              className="h-11 w-full border border-line bg-white pl-10 pr-10 text-sm font-medium outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label={t('Clear search')}
                className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center text-muted hover:text-forest"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          {distanceApplies ? (
            <select
              aria-label={t('Search radius')}
              value={radiusKm}
              onChange={(event) => onRadiusChange(Number(event.target.value))}
              className="h-11 shrink-0 border border-line bg-white px-2 text-xs font-black text-forest outline-none focus:border-forest"
            >
              {[5, 10, 20, 50].map((radius) => (
                <option key={radius} value={radius}>{radius} km</option>
              ))}
            </select>
          ) : null}

          <button
            type="button"
            onPointerUp={(event) => {
              if (event.pointerType === 'mouse' && event.button !== 0) return;
              onUseLocation();
            }}
            onClick={(event) => {
              if (event.detail === 0) onUseLocation();
            }}
            disabled={locationState === 'locating'}
            className={`inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-xs font-black transition ${
              selectedCity === 'My Location'
                ? 'bg-orange text-white'
                : 'border border-orange/40 bg-white text-forest hover:border-orange'
            } disabled:opacity-60`}
          >
            <LocateFixed className={`h-4 w-4 ${locationState === 'locating' ? 'animate-pulse' : ''}`} />
            {t(locationState === 'locating' ? 'Finding you…' : locationState === 'active' ? 'Near me' : 'Use my location')}
          </button>
        </div>

        <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto" role="group" aria-label={t('Malawi coverage')}>
          {CITIES.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => onCityChange(city)}
              className={`h-10 shrink-0 whitespace-nowrap px-3 text-xs font-bold transition ${
                selectedCity === city ? 'bg-forest text-white' : 'border border-line bg-white text-ink hover:border-forest'
              }`}
            >
              {city === 'All Cities' ? t('All Malawi') : city}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto" role="group" aria-label={t('Fuel availability')}>
            {STATUS_FILTERS.map((filter) => {
              const selected = selectedStatus === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => onStatusChange(filter.id)}
                  aria-pressed={selected}
                  className={`inline-flex h-11 shrink-0 items-center gap-2 border px-3 text-xs font-black transition ${
                    selected ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink hover:border-forest'
                  }`}
                >
                  {filter.id !== 'all' ? (
                    <span className={`h-2 w-2 rounded-full ${selected ? 'bg-white/90' : STATUS_DOT[filter.id]}`} />
                  ) : null}
                  {t(filter.label)}
                </button>
              );
            })}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex h-11 shrink-0 items-center gap-1.5 border border-forest/30 bg-[#e5eddc] px-3 text-xs font-black text-forest"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('Reset filters')}
              </button>
            ) : null}
          </div>

          <div className="flex h-11 shrink-0 border border-line bg-white" role="group" aria-label={t('Fuel type filter')}>
            {(['all', 'petrol', 'diesel'] as const).map((fuel) => (
              <button
                key={fuel}
                type="button"
                onClick={() => onFuelChange(fuel)}
                aria-pressed={selectedFuel === fuel}
                className={`h-full px-2.5 text-[11px] font-black transition sm:px-3 sm:text-xs ${
                  selectedFuel === fuel ? 'bg-orange text-white' : 'text-muted hover:text-forest'
                }`}
              >
                {t(fuel === 'all' ? 'All fuel' : fuel === 'petrol' ? 'Petrol' : 'Diesel')}
              </button>
            ))}
          </div>

          {notificationState !== 'unsupported' ? (
            <button
              type="button"
              onClick={onToggleAlerts}
              aria-pressed={stationAlertsEnabled}
              aria-label={t(stationAlertsEnabled ? 'Alerts on' : 'Station alerts')}
              className={`grid h-11 w-11 shrink-0 place-items-center border transition ${
                stationAlertsEnabled ? 'border-forest bg-forest text-white' : 'border-line bg-white text-muted hover:border-forest hover:text-forest'
              }`}
            >
              <Bell className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {locationState === 'outside' ? (
          <p role="status" className="border-l-2 border-orange pl-3 text-xs font-bold text-muted">
            {t('Your location is outside Malawi, so the national map is shown.')}
          </p>
        ) : locationState === 'denied' ? (
          <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-[#c9583c] pl-3 text-xs font-bold text-[#9d321d]">
            <span>
              {t(
                isPwaMode
                  ? 'Installed Alipo needs Location allowed in Android app settings (Apps → Alipo → Permissions).'
                  : isSamsungBrowser
                    ? 'Samsung Internet blocked location. Enable it in browser and phone settings, then try again.'
                    : 'Location is blocked for this site. In Samsung Internet or Chrome, tap the lock/site icon in the address bar, allow Location, then tap Use my location again.',
              )}
            </span>
            <button type="button" onClick={onShowLocationHelp} className="underline underline-offset-2">
              {t('Show how to enable')}
            </button>
          </div>
        ) : locationState === 'error' ? (
          <p role="status" className="border-l-2 border-[#c9583c] pl-3 text-xs font-bold text-[#9d321d]">
            {t('Location unavailable. Tap Use my location and allow access when your browser asks.')}
          </p>
        ) : locationState === 'idle' ? (
          <p role="status" className="border-l-2 border-forest/40 pl-3 text-xs font-bold text-muted">
            {isPwaMode
              ? t('In the installed app, tap Use my location. If nothing asks, allow Location under Android Apps → Alipo → Permissions.')
              : isSamsungBrowser
                ? t('On Samsung Internet, tap Use my location. If nothing asks, turn on Location in the browser Site permissions first.')
                : t('Tap Use my location to see the closest stations. Your browser will ask for permission.')}
          </p>
        ) : notificationState === 'denied' ? (
          <p role="status" className="border-l-2 border-[#c9583c] pl-3 text-xs font-bold text-[#9d321d]">
            {t('Notifications are blocked. Enable them in your browser settings to use station alerts.')}
          </p>
        ) : null}
      </div>
    </section>
  );
}
