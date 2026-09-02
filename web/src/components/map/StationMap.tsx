'use client';

import React, { useEffect, useRef } from 'react';
import { Station } from '@/types/alipo';
import { STATUS_CONFIG } from '@/lib/constants';

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
        const color = status === 'available' ? '#16a34a' : status === 'low' ? '#ca8a04' : status === 'out' ? '#dc2626' : '#6b7280';
        const isSelected = selectedStation?.id === st.id;

        // Custom HTML Pin icon
        const iconHtml = `
          <div style="
            background-color: ${color};
            width: ${isSelected ? '32px' : '26px'};
            height: ${isSelected ? '32px' : '26px'};
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: bold;
            transform: translate(-50%, -50%);
          ">
            ⛽
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-pin',
          html: iconHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 14]
        });

        const marker = L.marker([st.latitude, st.longitude], { icon: customIcon }).addTo(map);

        const popupContent = `
          <div style="font-family: sans-serif; min-width: 160px;">
            <strong style="font-size: 13px; color: #111827;">${st.name}</strong>
            <div style="font-size: 11px; color: #4b5563; margin-top: 2px;">${st.district}</div>
            <div style="margin-top: 6px; display: inline-block; padding: 2px 6px; border-radius: 9999px; font-size: 10px; font-weight: bold; color: white; background-color: ${color};">
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
    <div className="relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden border border-gray-200 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
}
