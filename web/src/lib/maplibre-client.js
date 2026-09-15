// @ts-nocheck
const MAPLIBRE_SCRIPT = 'https://unpkg.com/maplibre-gl@5.12.0/dist/maplibre-gl.js';
let mapLibrePromise;

export function loadMapLibre() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (mapLibrePromise) return mapLibrePromise;

  mapLibrePromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MAPLIBRE_SCRIPT}"]`);
    const script = existing || document.createElement('script');
    const finish = () => window.maplibregl ? resolve(window.maplibregl) : reject(new Error('MapLibre failed to initialise'));
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', () => reject(new Error('MapLibre failed to load')), { once: true });
    if (!existing) {
      script.src = MAPLIBRE_SCRIPT;
      script.crossOrigin = 'anonymous';
      document.head.append(script);
    }
  });
  return mapLibrePromise;
}
