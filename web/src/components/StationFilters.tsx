'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, LocateFixed, MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import { CITIES } from '@/lib/constants';
import { useLanguage } from '@/lib/i18n';
import type { FuelFilter, FreshnessFilter, ReportFilters, StatusFilter } from '@/lib/station-filters';
import { FilterSheet } from './FilterSheet';

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'has-fuel', label: 'Has fuel' },
  { value: 'available', label: 'Available' },
  { value: 'low', label: 'Low supply' },
  { value: 'out', label: 'No fuel' },
];
const AGE_OPTIONS: { value: FreshnessFilter; label: string }[] = [
  { value: 'all', label: 'Any report age' },
  { value: 'recent', label: 'Recent reports' },
  { value: 'older', label: 'Older reports' },
];
const control = 'min-h-11 border px-3 py-2 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest';

interface Props {
  fuel: FuelFilter;
  onFuelChange: (fuel: FuelFilter) => void;
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  search: string;
  onSearchChange: (search: string) => void;
  city: string;
  radius: number;
  onAreaChange: (city: string, radius: number) => void;
  locationState: 'idle' | 'locating' | 'active' | 'outside' | 'error' | 'denied';
  onUseLocation: () => void;
  onLocationHelp: () => void;
  onReset: () => void;
}

export function StationFilters(props: Props) {
  const { t } = useLanguage();
  const [panel, setPanel] = useState<'area' | 'filters' | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [draftArea, setDraftArea] = useState({ city: props.city, radius: props.radius });
  const [draftFilters, setDraftFilters] = useState(props.filters);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const dismissOnBack = () => setPanel(null);
    window.addEventListener('popstate', dismissOnBack);
    return () => window.removeEventListener('popstate', dismissOnBack);
  }, []);
  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  function openPanel(next: 'area' | 'filters') {
    setDraftArea({ city: props.city, radius: props.radius });
    setDraftFilters(props.filters);
    window.history.pushState({ ...window.history.state, alipoFilterSheet: true }, '', window.location.href);
    setPanel(next);
  }
  function closePanel() {
    setPanel(null);
    if (window.history.state?.alipoFilterSheet) window.history.back();
  }

  const areaLabel = props.city === 'My Location' ? t('Near me') : props.city === 'All Cities' ? t('All Malawi') : props.city;
  const hasFuel = props.filters.status === 'has-fuel';
  const extraStatus = props.filters.status !== 'all' && !hasFuel;
  const extraAge = props.filters.freshness !== 'all' && !hasFuel;
  const active = props.fuel !== 'all' || props.filters.status !== 'all' || props.filters.freshness !== 'all' || Boolean(props.search);
  const locationProblem = props.locationState === 'denied' || props.locationState === 'error';

  return <>
    <section id="find-fuel" aria-label={t('Find fuel')} className="sticky top-[72px] z-20 scroll-mt-[72px] border-b border-line bg-ivory">
      <div className="mx-auto max-w-[1440px] space-y-2 px-4 py-2 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => openPanel('area')} aria-haspopup="dialog" className={`${control} inline-flex min-w-0 items-center gap-2 border-line bg-white text-forest`}>
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{areaLabel}{props.city !== 'All Cities' ? ` · ${props.radius} km` : ''}</span>
            <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
          </button>
          <button type="button" aria-expanded={searchOpen} aria-controls="station-search" onClick={() => setSearchOpen(!searchOpen)} className={`${control} inline-flex shrink-0 items-center gap-2 border-transparent text-forest`}>
            <Search className="h-4 w-4" aria-hidden="true" />{t('Search')}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1" role="group" aria-label={t('Fuel type filter')}>
          {(['all', 'petrol', 'diesel'] as const).map((fuel) => <button key={fuel} type="button" aria-pressed={props.fuel === fuel} onClick={() => props.onFuelChange(fuel)} className={`${control} flex items-center justify-center gap-1 ${props.fuel === fuel ? 'border-forest bg-forest text-white' : 'border-line bg-white text-forest'}`}>
            {props.fuel === fuel ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
            {t(fuel === 'all' ? 'All fuel' : fuel === 'petrol' ? 'Petrol' : 'Diesel')}
          </button>)}
        </div>
        {searchOpen ? <div id="station-search" className="flex items-center gap-1">
          <label className="min-w-0 flex-1"><span className="sr-only">{t('Search station, area or brand')}</span><input ref={searchRef} value={props.search} onChange={(event) => props.onSearchChange(event.target.value)} placeholder={t('Search station, area or brand')} className="h-11 w-full border border-line bg-white px-3 text-base focus:outline-forest" /></label>
          <button type="button" aria-label={t('Clear search')} onClick={() => { props.onSearchChange(''); setSearchOpen(false); }} className="grid h-11 w-11 shrink-0 place-items-center text-forest"><X className="h-5 w-5" /></button>
        </div> : null}
      </div>
    </section>

    <div className="mx-auto max-w-[1440px] space-y-2 px-4 py-3 sm:px-8 lg:px-12">
      <div className="flex items-center justify-between gap-2">
        <button type="button" aria-pressed={hasFuel} onClick={() => props.onFiltersChange({ status: hasFuel ? 'all' : 'has-fuel', freshness: 'all' })} className={`${control} inline-flex items-center gap-2 ${hasFuel ? 'border-forest bg-forest text-white' : 'border-forest/30 bg-white text-forest'}`}>
          {hasFuel ? <Check className="h-4 w-4" aria-hidden="true" /> : null}{t('Has fuel')}
        </button>
        <button type="button" onClick={() => openPanel('filters')} aria-haspopup="dialog" className={`${control} inline-flex items-center gap-2 border-line bg-white text-forest`}><SlidersHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />{t('More filters')}</button>
      </div>
      {hasFuel ? <p className="text-xs leading-5 text-muted">{t('Available or low supply, reported in the last 4 hours.')}</p> : null}
      {active ? <div className="flex flex-wrap items-center gap-2" aria-label={t('Active filters')}>
        {extraStatus ? <button type="button" onClick={() => props.onFiltersChange({ ...props.filters, status: 'all' })} className={`${control} inline-flex items-center gap-2 border-line text-forest`} aria-label={t('Remove filter: {filter}', { filter: t(STATUS_OPTIONS.find((item) => item.value === props.filters.status)!.label) })}>{t(STATUS_OPTIONS.find((item) => item.value === props.filters.status)!.label)}<X className="h-4 w-4" /></button> : null}
        {extraAge ? <button type="button" onClick={() => props.onFiltersChange({ ...props.filters, freshness: 'all' })} className={`${control} inline-flex items-center gap-2 border-line text-forest`} aria-label={t('Remove filter: {filter}', { filter: t(AGE_OPTIONS.find((item) => item.value === props.filters.freshness)!.label) })}>{t(AGE_OPTIONS.find((item) => item.value === props.filters.freshness)!.label)}<X className="h-4 w-4" /></button> : null}
        {props.search ? <button type="button" onClick={() => props.onSearchChange('')} className={`${control} inline-flex max-w-full items-center gap-2 border-line text-forest`} aria-label={t('Clear search')}><span className="truncate">“{props.search}”</span><X className="h-4 w-4 shrink-0" /></button> : null}
        <button type="button" onClick={props.onReset} className="min-h-11 px-2 text-xs font-bold text-forest underline underline-offset-4">{t('Clear filters')}</button>
      </div> : null}
      {locationProblem ? <p role="status" className="text-xs leading-5 text-muted">{t('Choose an area or enable location to find nearby stations.')} <button type="button" onClick={props.onLocationHelp} className="min-h-11 font-bold text-forest underline">{t('Show how to enable')}</button></p> : null}
      {props.locationState === 'outside' ? <p role="status" className="text-xs leading-5 text-muted">{t('Your location is outside Malawi, so the national map is shown.')}</p> : null}
      {props.locationState === 'locating' ? <p role="status" className="text-xs text-muted">{t('Finding you…')}</p> : null}
    </div>

    {panel === 'area' ? <FilterSheet title={t('Choose area')} onDismiss={closePanel}>
      <form onSubmit={(event) => { event.preventDefault(); props.onAreaChange(draftArea.city, draftArea.radius); closePanel(); }}>
        <div className="space-y-5 p-5">
          <button type="button" disabled={props.locationState === 'locating'} onPointerUp={(event) => { if (event.pointerType === 'mouse' && event.button !== 0) return; closePanel(); props.onUseLocation(); }} onClick={(event) => { if (event.detail === 0) { closePanel(); props.onUseLocation(); } }} className={`${control} inline-flex w-full items-center justify-center gap-2 border-forest bg-forest text-white disabled:opacity-60`}><LocateFixed className="h-4 w-4" />{t('Use my location')}</button>
          <label className="block text-sm font-bold text-forest">{t('Area')}<select value={draftArea.city} onChange={(event) => setDraftArea({ ...draftArea, city: event.target.value })} className="mt-2 min-h-11 w-full border border-line bg-white px-3 text-base focus:outline-forest">
            {props.city === 'My Location' ? <option value="My Location">{t('Near me')}</option> : null}
            {CITIES.map((city) => <option key={city} value={city}>{city === 'All Cities' ? t('All Malawi') : city}</option>)}
          </select></label>
          {draftArea.city !== 'All Cities' ? <fieldset><legend className="text-sm font-bold text-forest">{t('Search radius')}</legend><div className="mt-2 grid grid-cols-4 gap-2">{[5, 10, 20, 50].map((radius) => <label key={radius} className={`${control} flex cursor-pointer items-center justify-center gap-1 ${draftArea.radius === radius ? 'border-forest bg-forest text-white' : 'border-line bg-white text-forest'}`}><input type="radio" name="radius" value={radius} checked={draftArea.radius === radius} onChange={() => setDraftArea({ ...draftArea, radius })} className="h-3 w-3 accent-forest" />{radius} km</label>)}</div><p className="mt-2 text-xs leading-5 text-muted">{t(draftArea.city === 'My Location' ? 'Distance from your current location.' : 'Distance from the city centre.')}</p></fieldset> : null}
        </div>
        <div className="sticky bottom-0 border-t border-line bg-ivory px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"><button type="submit" className={`${control} w-full border-forest bg-forest text-white`}>{t('Show stations')}</button></div>
      </form>
    </FilterSheet> : null}

    {panel === 'filters' ? <FilterSheet title={t('More filters')} onDismiss={closePanel}>
      <form onSubmit={(event) => { event.preventDefault(); props.onFiltersChange(draftFilters); closePanel(); }}>
        <div className="space-y-5 p-5">
          <fieldset><legend className="mb-2 text-sm font-bold text-forest">{t('Fuel availability')}</legend><div className="grid grid-cols-2 gap-2">{STATUS_OPTIONS.map(({ value, label }) => <label key={value} className={`${control} flex cursor-pointer items-center gap-2 ${draftFilters.status === value ? 'border-forest bg-forest text-white' : 'border-line bg-white text-forest'}`}><input type="radio" name="status" checked={draftFilters.status === value} onChange={() => setDraftFilters({ ...draftFilters, status: value, freshness: value === 'has-fuel' ? 'all' : draftFilters.freshness })} className="accent-forest" />{t(label)}</label>)}</div></fieldset>
          {draftFilters.status === 'has-fuel' ? <p className="text-sm leading-6 text-muted">{t('Available or low supply, reported in the last 4 hours.')}</p> : <fieldset><legend className="mb-2 text-sm font-bold text-forest">{t('Report age')}</legend><div className="space-y-2">{AGE_OPTIONS.map(({ value, label }) => <label key={value} className={`${control} flex cursor-pointer items-center gap-2 ${draftFilters.freshness === value ? 'border-forest bg-forest text-white' : 'border-line bg-white text-forest'}`}><input type="radio" name="freshness" checked={draftFilters.freshness === value} onChange={() => setDraftFilters({ ...draftFilters, freshness: value })} className="accent-forest" />{t(label)}</label>)}</div><p className="mt-2 text-xs leading-5 text-muted">{t('Recent reports are less than 4 hours old. Older reports may no longer be accurate.')}</p></fieldset>}
        </div>
        <div className="sticky bottom-0 flex items-center gap-3 border-t border-line bg-ivory px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]"><button type="button" onClick={() => setDraftFilters({ status: 'all', freshness: 'all' })} className={`${control} border-transparent text-forest`}>{t('Reset')}</button><button type="submit" className={`${control} flex-1 border-forest bg-forest text-white`}>{t('Show stations')}</button></div>
      </form>
    </FilterSheet> : null}
  </>;
}
