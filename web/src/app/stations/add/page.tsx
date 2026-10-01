'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { CheckCircle2, LocateFixed, MapPin } from 'lucide-react';
import { Header } from '@/components/Header';
import { requestCurrentPosition } from '@/lib/geolocation';
import { useLanguage } from '@/lib/i18n';
import { LAUNCH_DATE, LAUNCH_BYPASS_STORAGE_KEY } from '@/lib/constants';
import type { AddressMatch } from '@/lib/address-search';

type CapturedLocation = { latitude: number; longitude: number; accuracy: number };
const StationPinPicker = dynamic(() => import('@/components/map/StationPinPicker').then((module) => module.StationPinPicker), { ssr: false });

export default function AddStationPage() {
  const { t } = useLanguage();
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locationMode, setLocationMode] = useState<'address' | 'gps'>('address');
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<AddressMatch[]>([]);
  const [searchMessage, setSearchMessage] = useState('');
  const searchRequest = useRef<AbortController | null>(null);

  useEffect(() => () => searchRequest.current?.abort(), []);

  const resetAddressSearch = () => {
    searchRequest.current?.abort();
    searchRequest.current = null;
    setSearching(false);
    setMatches([]);
    setSearchMessage('');
    setPin(null);
  };

  const findAddress = async () => {
    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    setSearching(true);
    setMatches([]);
    setSearchMessage('');
    try {
      const response = await fetch('/api/address-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, city }), signal: controller.signal,
      });
      const result = await response.json() as { matches?: AddressMatch[]; error?: string };
      if (!response.ok) throw new Error(result.error);
      if (controller.signal.aborted) return;
      setMatches(result.matches || []);
      if (!result.matches?.length) setSearchMessage('No matching address found. Try a road or landmark with the town, or place the pin manually.');
    } catch {
      if (!controller.signal.aborted) setSearchMessage('Address search is unavailable. Please place the pin on the map instead.');
    } finally {
      if (searchRequest.current === controller) setSearching(false);
    }
  };

  const captureLocation = () => {
    setError('');
    // Start geolocation before UI state updates so Samsung Internet keeps the user gesture.
    requestCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
        setLocating(false);
      },
      (code) => {
        setLocating(false);
        setError(
          t(
            code === 'denied'
              ? 'Location is blocked for this site. In Samsung Internet or Chrome, tap the lock/site icon in the address bar, allow Location, then tap Use my location again.'
              : 'Allow location access and try again while standing at the station.',
          ),
        );
      },
    );
    setLocating(true);
  };

  useEffect(() => {
    if (Date.now() < LAUNCH_DATE.getTime() && localStorage.getItem(LAUNCH_BYPASS_STORAGE_KEY) !== 'true') {
      window.location.replace('/');
      return;
    }
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chosenLocation = locationMode === 'address' ? pin : location;
    if (!chosenLocation) return setError(t('Choose the station location first.'));
    setSubmitting(true);
    setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
    const response = await fetch('/api/stations/community', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, ...chosenLocation, location_mode: locationMode }),
    });
    const result = (await response.json()) as { error?: string };
    setSubmitting(false);
    if (!response.ok) return setError(t(result.error || 'Unable to add this station.'));
    setDone(true);
    } catch {
      setError(t('Unable to add this station. Please try again.'));
    } finally { setSubmitting(false); }
  };

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl space-y-5 p-4 py-8 sm:p-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
            <MapPin className="h-3.5 w-3.5" /> {t('Community map')}
          </span>
          <h1 className="mt-3 text-3xl font-black text-gray-950">{t('Add a filling station')}</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            {t(
              'Add a missing station from home using its address and a map pin, or use your phone location while at the station. The location stays unconfirmed until other visitors confirm it.',
            )}
          </p>
        </div>
        {done ? (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" />
            <h2 className="mt-3 text-xl font-black">{t('Station added')}</h2>
            <p className="mt-2 text-sm text-gray-600">{t('Thank you for helping improve Malawi’s community fuel map.')}</p>
            <p className="mt-2 text-sm font-bold text-amber-800">{t('Unconfirmed location — other visitors can confirm it when they arrive.')}</p>
            <Link href="/" className="mt-5 inline-flex h-11 items-center bg-emerald-800 px-5 text-sm font-black text-white">
              {t('Return to map')}
            </Link>
          </section>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <label className="block text-sm font-bold">
              {t('Station name')}
              <input
                required
                name="name"
                maxLength={200}
                className="mt-2 h-12 w-full rounded-xl border border-gray-300 px-3 outline-none focus:border-emerald-700"
                placeholder={t('e.g. Puma Area 18')}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold">
                {t('Brand')}
                <input name="brand" className="mt-2 h-12 w-full rounded-xl border border-gray-300 px-3" placeholder="Puma, TotalEnergies…" />
              </label>
              <label className="block text-sm font-bold">
                {t('Town or city')}
                <input name="city" maxLength={100} value={city} onChange={(event) => { setCity(event.target.value); resetAddressSearch(); }} className="mt-2 h-12 w-full rounded-xl border border-gray-300 px-3" placeholder="Lilongwe" />
              </label>
            </div>
            <label className="block text-sm font-bold">
              {t('Your phone number')}
              <input required name="phone" inputMode="tel" autoComplete="tel" className="mt-2 h-12 w-full rounded-xl border border-gray-300 px-3" placeholder="+265…" />
              <span className="mt-1 block text-xs font-normal text-gray-500">{t('Converted to a private fingerprint before storage.')}</span>
            </label>
            <fieldset className="space-y-3">
              <legend className="text-sm font-bold">{t('Station location')}</legend>
              <div className="flex flex-wrap gap-4 text-sm">
                <label><input type="radio" checked={locationMode === 'address'} onChange={() => setLocationMode('address')} /> {t('Enter address from home')}</label>
                <label><input type="radio" checked={locationMode === 'gps'} onChange={() => setLocationMode('gps')} /> {t('I am at the station')}</label>
              </div>
              {locationMode === 'address' ? <div className="space-y-3">
                <label className="block text-sm font-bold">{t('Address or nearby landmarks')}<textarea required name="address" minLength={5} maxLength={500} value={address} onChange={(event) => { setAddress(event.target.value); resetAddressSearch(); }} className="mt-2 w-full rounded-xl border border-gray-300 p-3" placeholder={t('Road, area, town and a nearby landmark')} /></label>
                <button type="button" onClick={() => void findAddress()} disabled={searching || address.trim().length < 3} className="min-h-12 w-full rounded-xl border-2 border-emerald-700 px-4 text-sm font-black text-emerald-800 disabled:opacity-40">{t(searching ? 'Searching addresses…' : 'Find address on map')}</button>
                <p className="text-xs text-gray-600">{t('Search uses your address and town to find places in Malawi. Choose a match, then check the pin marks the actual station.')}</p>
                <div aria-live="polite">
                  {searchMessage ? <p className="text-sm font-bold text-amber-800">{t(searchMessage)}</p> : null}
                  {matches.length > 0 ? <div className="space-y-2"><p className="text-sm font-bold">{t('Choose a matching place')}</p>{matches.map((match) => <button type="button" key={match.id} onClick={() => { setPin({ latitude: match.latitude, longitude: match.longitude }); setMatches([]); setSearchMessage('Address located. Check and adjust the pin to the actual station before adding it.'); }} className="min-h-12 w-full rounded-xl border border-gray-200 p-3 text-left text-sm hover:border-emerald-700">{match.label}</button>)}</div> : null}
                </div>
                <p className="text-xs text-gray-500">{t('Address search by Photon · OpenStreetMap contributors')}</p>
                <p className="text-sm text-gray-600">{t('Zoom in and tap the station’s location on the map. Do not select your home location.')} {t('You can also drag the pin to adjust it.')}</p>
                <StationPinPicker position={pin} onPick={(latitude, longitude) => setPin({ latitude, longitude })} />
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold">{t('Latitude')}<input type="number" step="any" min={-17.2} max={-9.2} required value={pin?.latitude ?? ''} onChange={(event) => setPin({ latitude: Number(event.target.value), longitude: pin?.longitude ?? 33.78 })} className="mt-1 w-full rounded-lg border p-2" /></label>
                  <label className="text-xs font-bold">{t('Longitude')}<input type="number" step="any" min={32.6} max={35.95} required value={pin?.longitude ?? ''} onChange={(event) => setPin({ latitude: pin?.latitude ?? -13.96, longitude: Number(event.target.value) })} className="mt-1 w-full rounded-lg border p-2" /></label>
                </div>
                <p className="text-xs font-bold text-amber-800">{t('Unconfirmed location — other visitors can confirm it when they arrive.')}</p>
              </div> : <>
            <button
              type="button"
              onPointerUp={(event) => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                captureLocation();
              }}
              onClick={(event) => {
                if (event.detail === 0) captureLocation();
              }}
              disabled={locating}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-700 px-4 text-sm font-black text-emerald-800 disabled:opacity-50"
            >
              <LocateFixed className="h-5 w-5" />{' '}
              {t(locating ? 'Finding your exact location…' : location ? 'Recapture location' : 'Use my location at this station')}
            </button>
            {location ? (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">
                {t('Location captured · accuracy about {metres} metres', { metres: Math.round(location.accuracy) })}
              </p>
            ) : (
              <p className="text-xs font-bold text-gray-500">
                {t('Tap Use my location to see the closest stations. Your browser will ask for permission.')}
              </p>
            )}
              </>}
            </fieldset>
            {error ? (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                {error}
              </p>
            ) : null}
            <button disabled={!(locationMode === 'address' ? pin : location) || submitting} className="h-12 w-full rounded-xl bg-gray-950 text-sm font-black text-white disabled:opacity-40">
              {t(submitting ? 'Adding station…' : 'Add this station')}
            </button>
          </form>
        )}
      </main>
    </>
  );
}
