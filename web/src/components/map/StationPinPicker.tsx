'use client';
import { useEffect, useRef } from 'react';
import { loadMapLibre } from '@/lib/maplibre-client';
import { MAP_STYLE } from '@/components/map/StationMap';

export function StationPinPicker({ onPick }: { onPick: (latitude: number, longitude: number) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onPick);
  callback.current = onPick;
  useEffect(() => {
    let active = true;
    let map: any;
    void loadMapLibre().then((lib: any) => {
      if (!active || !container.current) return;
      map = new lib.Map({ container: container.current, style: MAP_STYLE, center: [33.78,-13.96], zoom: 7 });
      map.addControl(new lib.NavigationControl());
      const marker = new lib.Marker({ color: '#e96a24' });
      map.on('click', (event: any) => {
        marker.setLngLat(event.lngLat).addTo(map);
        callback.current(event.lngLat.lat,event.lngLat.lng);
      });
    }).catch(() => { /* Coordinate fields remain available if the map fails. */ });
    return () => { active = false; map?.remove(); };
  }, []);
  return <div ref={container} style={{ height: 288, minHeight: 288 }} aria-label="Choose the station location on the map" className="w-full overflow-hidden rounded-xl border border-gray-300" />;
}
