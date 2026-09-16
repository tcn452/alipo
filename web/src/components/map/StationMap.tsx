'use client';

import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Station } from '@/types/alipo';
import { classifyStationBrand, DEFAULT_LOCATION, getBrandColor } from '@/lib/constants';
import { loadMapLibre } from '@/lib/maplibre-client';
import { useLanguage } from '@/lib/i18n';

type MapLibreMap = any;
type MapLibreMarker = any;

export const MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
const MALAWI_OVERVIEW: [number, number] = [34.3015, -13.2543];
const MALAWI_OVERVIEW_ZOOM = 6.4;

function hasRenderableSize(map: MapLibreMap) {
  const container = map.getContainer();
  return container.clientWidth > 0 && container.clientHeight > 0;
}

function circleCoordinates(latitude: number, longitude: number, radiusMetres: number) {
  const points: [number, number][] = [];
  const latitudeScale = radiusMetres / 111_320;
  const longitudeScale = radiusMetres / (111_320 * Math.cos(latitude * Math.PI / 180));
  for (let index = 0; index <= 72; index += 1) {
    const angle = index / 72 * Math.PI * 2;
    points.push([longitude + Math.cos(angle) * longitudeScale, latitude + Math.sin(angle) * latitudeScale]);
  }
  return points;
}

function radiusGeoJson(center: [number, number], radiusKm: number) {
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: { type: 'Polygon' as const, coordinates: [circleCoordinates(center[0], center[1], radiusKm * 1000)] },
  };
}

export function applyAlipoStyle(map: MapLibreMap) {
  for (const layer of map.getStyle().layers || []) {
    const id = layer.id.toLowerCase();
    try {
      if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', '#e7eadf');
      if (layer.type === 'fill' && id.includes('water')) map.setPaintProperty(layer.id, 'fill-color', '#b8d8d1');
      if (layer.type === 'fill' && /(park|landcover|landuse|wood)/.test(id)) map.setPaintProperty(layer.id, 'fill-color', '#dce7d5');
      if (layer.type === 'fill' && id.includes('building')) map.setPaintProperty(layer.id, 'fill-color', '#ddd6c6');
      if (layer.type === 'line' && /(motorway|trunk|primary)/.test(id)) map.setPaintProperty(layer.id, 'line-color', '#e6a05e');
      if (layer.type === 'line' && id.includes('road') && !/(motorway|trunk|primary)/.test(id)) map.setPaintProperty(layer.id, 'line-color', '#d2cab8');
      if (layer.type === 'symbol') {
        map.setPaintProperty(layer.id, 'text-color', '#31463d');
        map.setPaintProperty(layer.id, 'text-halo-color', '#f7f3e9');
      }
    } catch {
      // The upstream style can contain layers without these optional properties.
    }
  }
}

function setRadius(map: MapLibreMap, center: [number, number], radiusKm?: number) {
  const source = map.getSource('alipo-radius') as { setData: (data: unknown) => void } | undefined;
  const data = radiusKm ? radiusGeoJson(center, radiusKm) : { type: 'FeatureCollection' as const, features: [] };
  if (source) return source.setData(data);
  map.addSource('alipo-radius', { type: 'geojson', data });
  map.addLayer({ id: 'alipo-radius-fill', type: 'fill', source: 'alipo-radius', paint: { 'fill-color': '#e96a24', 'fill-opacity': 0.055 } });
  map.addLayer({ id: 'alipo-radius-line', type: 'line', source: 'alipo-radius', paint: { 'line-color': '#e96a24', 'line-width': 2, 'line-opacity': 0.8, 'line-dasharray': [3, 3] } });
}

function fitRadius(map: MapLibreMap, center: [number, number], radiusKm: number) {
  const coordinates = circleCoordinates(center[0], center[1], radiusKm * 1000);
  const longitudes = coordinates.map(([longitude]) => longitude);
  const latitudes = coordinates.map(([, latitude]) => latitude);
  map.fitBounds([[Math.min(...longitudes), Math.min(...latitudes)], [Math.max(...longitudes), Math.max(...latitudes)]], { padding: 36, duration: 650 });
}

interface StationMapProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  onClearSelection?: () => void;
  center?: [number, number];
  zoom?: number;
  radiusKm?: number;
  userLocation?: [number, number] | null;
  focusUserLocation?: boolean;
}

export default function StationMap({ stations, selectedStation, onSelectStation, onClearSelection, center = DEFAULT_LOCATION, zoom = 12, radiusKm, userLocation, focusUserLocation = false }: StationMapProps) {
  const { t } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<MapLibreMarker[]>([]);
  const userMarkerRef = useRef<MapLibreMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tilesLoading, setTilesLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;
    let active = true;
    void loadMapLibre().then((maplibre: any) => {
      if (!active || !mapContainerRef.current) return;
      const map = new maplibre.Map({ container: mapContainerRef.current, style: MAP_STYLE, center: MALAWI_OVERVIEW, zoom: MALAWI_OVERVIEW_ZOOM, attributionControl: true, fadeDuration: 180, maxZoom: 18 });
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-left');
      map.on('idle', () => setTilesLoading(false));
      map.on('error', () => setTilesLoading(false));
      map.on('load', () => {
        applyAlipoStyle(map);
        setRadius(map, center, radiusKm);
        setMapReady(true);
      });
      mapInstanceRef.current = map;
    }).catch(() => {
      if (!active) return;
      setMapError(true);
      setTilesLoading(false);
    });
    return () => {
      active = false;
      markersRef.current.forEach((marker) => marker.remove());
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const map = mapInstanceRef.current;
      if (!map || container.clientWidth <= 0 || container.clientHeight <= 0) return;
      map.resize();
      if (!mapReady || selectedStation) return;
      if (focusUserLocation) map.easeTo({ center: [center[1], center[0]], zoom: 14.5, duration: 0 });
      else if (radiusKm) fitRadius(map, center, radiusKm);
      else map.easeTo({ center: [center[1], center[0]], zoom, duration: 0 });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [center, focusUserLocation, mapReady, radiusKm, selectedStation, zoom]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || selectedStation) return;
    setRadius(map, center, radiusKm);
    if (!hasRenderableSize(map)) return;
    if (focusUserLocation) map.easeTo({ center: [center[1], center[0]], zoom: 14.5, duration: 650 });
    else if (radiusKm) fitRadius(map, center, radiusKm);
    else map.easeTo({ center: [center[1], center[0]], zoom, duration: 650 });
  }, [center, focusUserLocation, mapReady, radiusKm, selectedStation, zoom]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    let cancelled = false;
    void loadMapLibre().then((maplibre: any) => {
      if (cancelled) return;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = stations.flatMap((station, index) => {
        if (!Number.isFinite(station.latitude) || !Number.isFinite(station.longitude)) return [];
        const number = index + 1;
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'alipo-numbered-pin';
        element.textContent = String(number);
        element.title = `${number}. ${station.name}`;
        const selected = selectedStation?.id === station.id;
        element.style.width = selected ? '30px' : '24px';
        element.style.height = selected ? '30px' : '24px';
        element.style.backgroundColor = getBrandColor(classifyStationBrand(station.name, station.brand));
        const popup = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = `${number}. ${station.name}`;
        const district = document.createElement('div');
        district.className = 'mt-1 text-[11px] text-muted';
        district.textContent = station.district;
        popup.append(title, district);
        const marker = new maplibre.Marker({ element, anchor: 'center' }).setLngLat([station.longitude, station.latitude]).setPopup(new maplibre.Popup({ offset: 16, closeButton: false }).setDOMContent(popup)).addTo(map);
        element.addEventListener('click', (event) => { event.stopPropagation(); onSelectStation(station); });
        return [marker];
      });
    });
    return () => { cancelled = true; };
  }, [mapReady, onSelectStation, selectedStation, stations]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!selectedStation || !map || !hasRenderableSize(map)) return;
    if (!Number.isFinite(selectedStation.latitude) || !Number.isFinite(selectedStation.longitude)) return;
    map.easeTo({ center: [selectedStation.longitude, selectedStation.latitude], zoom: 14, duration: 650 });
  }, [selectedStation]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    let cancelled = false;
    void loadMapLibre().then((maplibre: any) => {
      if (cancelled) return;
      if (!userLocation) {
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
        return;
      }
      const position: [number, number] = [userLocation[1], userLocation[0]];
      if (!userMarkerRef.current) {
        const element = document.createElement('span');
        element.className = 'alipo-user-location-dot';
        element.append(document.createElement('span'));
        userMarkerRef.current = new maplibre.Marker({ element, anchor: 'center' }).setLngLat(position).setPopup(new maplibre.Popup({ offset: 14 }).setText(t('Your location'))).addTo(map);
      } else userMarkerRef.current.setLngLat(position);
    });
    return () => { cancelled = true; };
  }, [mapReady, t, userLocation]);

  return (
    <div onClickCapture={() => onClearSelection?.()} className="relative h-full min-h-[610px] w-full overflow-hidden">
      <div ref={mapContainerRef} className="h-full w-full" />
      {mapError ? <div role="alert" className="absolute inset-0 z-20 grid place-items-center bg-[#dce2d6] px-6 text-center"><div className="max-w-sm border border-forest/15 bg-ivory p-5 shadow-lg"><p className="text-sm font-black uppercase tracking-[.08em] text-forest">{t('Map temporarily unavailable')}</p><p className="mt-2 text-xs leading-5 text-muted">{t('Please check your connection and refresh to load the Malawi map.')}</p></div></div> : null}
      <div className={`pointer-events-none absolute inset-0 z-20 grid place-items-center bg-[#dce2d6]/90 transition-opacity duration-200 ${tilesLoading && !mapError ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!tilesLoading || mapError}>
        <div className="border border-forest/15 bg-ivory px-5 py-4 text-center shadow-lg"><RefreshCw className="mx-auto h-5 w-5 animate-spin text-orange" /><p className="mt-2 text-xs font-black uppercase tracking-[.12em] text-forest">{t('Loading Malawi map')}</p></div>
      </div>
    </div>
  );
}
