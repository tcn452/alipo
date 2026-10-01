'use client';
import { useEffect, useRef } from 'react';
import { loadMapLibre } from '@/lib/maplibre-client';
import { MAP_STYLE } from '@/components/map/StationMap';

export function StationPinPicker({ onPick, position }: { onPick: (latitude: number, longitude: number) => void; position?: { latitude: number; longitude: number } | null }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const positionRef = useRef(position);
  positionRef.current = position;
  const callback = useRef(onPick);
  callback.current = onPick;
  useEffect(() => {
    let active = true;
    let map: any;
    void loadMapLibre().then((lib: any) => {
      if (!active || !container.current) return;
      map = new lib.Map({ container: container.current, style: MAP_STYLE, center: [33.78,-13.96], zoom: 7 });
      mapRef.current = map;
      map.addControl(new lib.NavigationControl());
      const marker = new lib.Marker({ color: '#e96a24', draggable: true });
      markerRef.current = marker;
      if (positionRef.current) {
        const { latitude, longitude } = positionRef.current;
        marker.setLngLat([longitude, latitude]).addTo(map);
        map.jumpTo({ center: [longitude, latitude], zoom: 16 });
      }
      marker.on('dragend', () => {
        const point = marker.getLngLat();
        callback.current(point.lat, point.lng);
      });
      map.on('click', (event: any) => {
        marker.setLngLat(event.lngLat).addTo(map);
        callback.current(event.lngLat.lat,event.lngLat.lng);
      });
    }).catch(() => { /* Coordinate fields remain available if the map fails. */ });
    return () => { active = false; map?.remove(); mapRef.current = null; markerRef.current = null; };
  }, []);
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (!position) { markerRef.current.remove(); return; }
    markerRef.current.setLngLat([position.longitude, position.latitude]).addTo(mapRef.current);
    mapRef.current.flyTo({ center: [position.longitude, position.latitude], zoom: Math.max(16, mapRef.current.getZoom()) });
  }, [position?.latitude, position?.longitude]);
  return <div ref={container} style={{ height: 288, minHeight: 288 }} aria-label="Choose the station location on the map" className="w-full overflow-hidden rounded-xl border border-gray-300" />;
}
