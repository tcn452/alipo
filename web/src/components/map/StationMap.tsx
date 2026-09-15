'use client';

import React, { useEffect, useRef, useState } from 'react';
import { LocateFixed, RefreshCw } from 'lucide-react';
import { Station } from '@/types/alipo';
import { DEFAULT_LOCATION, getBrandColor } from '@/lib/constants';

const MALAWI_OVERVIEW: [number, number] = [-13.2543, 34.3015];
const MALAWI_OVERVIEW_ZOOM = 7;

function hasRenderableSize(map: any) {
  const size = map.getSize();
  return size.x > 0 && size.y > 0;
}

interface StationMapProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  center?: [number, number];
  zoom?: number;
  radiusKm?: number;
}

export default function StationMap({
  stations,
  selectedStation,
  onSelectStation,
  center = DEFAULT_LOCATION,
  zoom = 12,
  radiusKm,
}: StationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [id: string]: any }>({});
  const radiusCircleRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const [tilesLoading, setTilesLoading] = useState(true);
  const [locationState, setLocationState] = useState<'idle' | 'locating' | 'found' | 'error'>('idle');

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let L: any;
    const initMap = async () => {
      L = (await import('leaflet')).default;

      // Avoid re-initialization
      if (mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: MALAWI_OVERVIEW,
        zoom: MALAWI_OVERVIEW_ZOOM,
        zoomControl: true,
        fadeAnimation: true,
        zoomAnimation: true,
      });

      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        keepBuffer: 4,
        updateWhenIdle: true,
        updateWhenZooming: false,
        detectRetina: false,
      }).addTo(map);
      tiles.on('loading', () => setTilesLoading(true));
      tiles.on('load', () => setTilesLoading(false));

      if (radiusKm) {
        radiusCircleRef.current = L.circle(center, {
          radius: radiusKm * 1000,
          color: '#e96a24',
          weight: 2,
          opacity: 0.75,
          fillColor: '#e96a24',
          fillOpacity: 0.045,
          dashArray: '7 8',
          interactive: false,
        }).addTo(map);
      }

      mapInstanceRef.current = map;
      tiles.once('load', () => {
        if (!hasRenderableSize(map)) return;
        if (radiusCircleRef.current) {
          map.flyToBounds(radiusCircleRef.current.getBounds(), { padding: [24, 24], duration: 0.65 });
        } else {
          map.flyTo(center, zoom, { duration: 0.65 });
        }
      });
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      const map = mapInstanceRef.current;
      if (!map || !hasRenderableSize(map)) return;
      map.invalidateSize({ pan: false });
      if (radiusCircleRef.current) map.fitBounds(radiusCircleRef.current.getBounds(), { padding: [24, 24] });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || selectedStation) return;
    const updateRadius = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;
      if (radiusCircleRef.current) {
        radiusCircleRef.current.remove();
        radiusCircleRef.current = null;
      }
      if (radiusKm) {
        radiusCircleRef.current = L.circle(center, {
          radius: radiusKm * 1000,
          color: '#e96a24',
          weight: 2,
          opacity: 0.75,
          fillColor: '#e96a24',
          fillOpacity: 0.045,
          dashArray: '7 8',
          interactive: false,
        }).addTo(map);
        if (hasRenderableSize(map)) map.flyToBounds(radiusCircleRef.current.getBounds(), { padding: [24, 24], duration: 0.45 });
      } else {
        if (hasRenderableSize(map)) map.setView(center, zoom);
      }
    };
    void updateRadius();
  }, [center, radiusKm, selectedStation, zoom]);

  // Update Markers whenever stations or selection changes
  useEffect(() => {
    if (typeof window === 'undefined' || !mapInstanceRef.current) return;

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      // Clear existing markers
      Object.values(markersRef.current).forEach((marker: any) => marker.remove());
      markersRef.current = {};

      stations.forEach((st, index) => {
        if (!st.latitude || !st.longitude) return;

        const status = st.latest_status || 'unknown';
        const color = status === 'available' ? '#398151' : status === 'low' ? '#df972f' : status === 'out' ? '#c9583c' : '#66736d';
        const brandColor = getBrandColor(st.brand);
        const isSelected = selectedStation?.id === st.id;
        const stationNumber = index + 1;

        const iconHtml = `
          <div class="alipo-numbered-pin" title="${stationNumber}. ${st.name}" style="width:${isSelected ? '30px' : '24px'};height:${isSelected ? '30px' : '24px'};background:${brandColor};border-color:${isSelected ? color : '#fff'};transform:translate(-50%,-50%)">
            ${stationNumber}
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-pin',
          html: iconHtml,
          iconSize: [isSelected ? 30 : 24, isSelected ? 30 : 24],
          iconAnchor: [isSelected ? 15 : 12, isSelected ? 15 : 12]
        });

        const marker = L.marker([st.latitude, st.longitude], { icon: customIcon }).addTo(map);

        const popupContent = `
          <div style="font-family: sans-serif; min-width: 170px;">
            <strong style="font-size: 13px; color: #11231c;">${stationNumber}. ${st.name}</strong>
            <div style="font-size: 11px; color: #66736d; margin-top: 2px;">${st.district}</div>
            <div style="margin-top: 8px; display: inline-block; padding: 4px 7px; font-size: 9px; letter-spacing:.08em; font-weight: 800; color: white; background-color: ${color};">
              ${status.toUpperCase()}
            </div>
          </div>
        `;
        marker.bindPopup(popupContent);

        marker.on('click', () => {
          onSelectStation(st);
        });

        markersRef.current[st.id] = marker;
      });
    };

    updateMarkers();
  }, [stations, selectedStation]);

  // Center on selected station
  useEffect(() => {
    if (selectedStation && mapInstanceRef.current && Number.isFinite(selectedStation.latitude) && Number.isFinite(selectedStation.longitude) && hasRenderableSize(mapInstanceRef.current)) {
      mapInstanceRef.current.flyTo([selectedStation.latitude, selectedStation.longitude], 14, {
        duration: 0.8
      });
    }
  }, [selectedStation]);

  const showUserLocation = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) {
      setLocationState('error');
      return;
    }

    setLocationState('locating');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      const L = (await import('leaflet')).default;
      const position: [number, number] = [coords.latitude, coords.longitude];

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(position, {
          zIndexOffset: 1000,
          icon: L.divIcon({
            className: 'alipo-user-location-icon',
            html: '<span class="alipo-user-location-dot"><span></span></span>',
            iconSize: [24, 24],
            iconAnchor: [12, 12],
          }),
        }).bindPopup('<strong>Your location</strong>').addTo(map);
      } else {
        userMarkerRef.current.setLatLng(position);
      }

      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle(position, {
          radius: Math.max(coords.accuracy, 20),
          color: '#1769aa',
          weight: 1,
          fillColor: '#4b9ad1',
          fillOpacity: 0.12,
          interactive: false,
        }).addTo(map);
      } else {
        accuracyCircleRef.current.setLatLng(position).setRadius(Math.max(coords.accuracy, 20));
      }

      if (hasRenderableSize(map)) map.flyTo(position, Math.max(map.getZoom(), 14), { duration: 0.6 });
      setLocationState('found');
    }, () => setLocationState('error'), {
      enableHighAccuracy: true,
      timeout: 12_000,
      maximumAge: 60_000,
    });
  };

  return (
    <div className="relative h-full min-h-[610px] w-full overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute right-3 top-3 z-[600] flex flex-col items-end gap-2">
        <button type="button" onClick={showUserLocation} disabled={locationState === 'locating'} className="inline-flex h-10 items-center gap-2 border border-forest/15 bg-white px-3 text-xs font-black text-forest shadow-lg transition hover:bg-ivory disabled:opacity-70" aria-label="Show my location">
          {locationState === 'locating' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
          {locationState === 'locating' ? 'Locating…' : locationState === 'found' ? 'Located' : 'My location'}
        </button>
        {locationState === 'error' ? <p role="status" className="max-w-52 border border-[#c9583c]/25 bg-ivory px-3 py-2 text-[10px] font-bold leading-4 text-[#9d321d] shadow">Location unavailable. Check browser permission and try again.</p> : null}
      </div>
      <div className={`pointer-events-none absolute inset-0 z-[500] grid place-items-center bg-[#dce2d6]/90 transition-opacity duration-200 ${tilesLoading ? 'opacity-100' : 'opacity-0'}`} aria-hidden={!tilesLoading}>
        <div className="border border-forest/15 bg-ivory px-5 py-4 text-center shadow-lg">
          <RefreshCw className="mx-auto h-5 w-5 animate-spin text-orange" />
          <p className="mt-2 text-xs font-black uppercase tracking-[.12em] text-forest">Loading map</p>
        </div>
      </div>
    </div>
  );
}
