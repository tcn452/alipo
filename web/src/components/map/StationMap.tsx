'use client';

import React, { useEffect, useRef } from 'react';
import { Station } from '@/types/alipo';

interface StationMapProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  center?: [number, number];
  zoom?: number;
}

export default function StationMap({
  stations,
  selectedStation,
  onSelectStation,
  center = [-13.9626, 33.7741], // Default: Lilongwe, Malawi
  zoom = 12
}: StationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ [id: string]: any }>({});

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let L: any;
    const initMap = async () => {
      L = (await import('leaflet')).default;

      // Avoid re-initialization
      if (mapInstanceRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: zoom,
        zoomControl: true
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers whenever stations or selection changes
  useEffect(() => {
    if (typeof window === 'undefined' || !mapInstanceRef.current) return;

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;

      // Clear existing markers
      Object.values(markersRef.current).forEach((marker: any) => marker.remove());
      markersRef.current = {};

      stations.forEach((st) => {
        if (!st.latitude || !st.longitude) return;

        const status = st.latest_status || 'unknown';
        const color = status === 'available' ? '#398151' : status === 'low' ? '#df972f' : status === 'out' ? '#c9583c' : '#66736d';
        const isSelected = selectedStation?.id === st.id;

        const iconHtml = `
          <div class="alipo-map-pin" style="width:${isSelected ? '38px' : '30px'};height:${isSelected ? '38px' : '30px'};outline:3px solid ${color};transform:translate(-50%,-50%)">
            <img src="/alipo-mark.jpg" alt="" />
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-pin',
          html: iconHtml,
          iconSize: [isSelected ? 38 : 30, isSelected ? 38 : 30],
          iconAnchor: [isSelected ? 19 : 15, isSelected ? 19 : 15]
        });

        const marker = L.marker([st.latitude, st.longitude], { icon: customIcon }).addTo(map);

        const popupContent = `
          <div style="font-family: sans-serif; min-width: 170px;">
            <strong style="font-size: 13px; color: #11231c;">${st.name}</strong>
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
    if (selectedStation && mapInstanceRef.current && selectedStation.latitude && selectedStation.longitude) {
      mapInstanceRef.current.flyTo([selectedStation.latitude, selectedStation.longitude], 14, {
        duration: 0.8
      });
    }
  }, [selectedStation]);

  return (
    <div className="relative h-full min-h-[610px] w-full overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
