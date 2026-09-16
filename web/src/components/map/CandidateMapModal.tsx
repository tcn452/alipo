'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, MapPin, Plus, RefreshCw, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StationGeocodingCandidate } from '@/types/alipo';
import { loadMapLibre } from '@/lib/maplibre-client';
import { applyAlipoStyle, MAP_STYLE } from '@/components/map/StationMap';
import { classifyStationBrand, getBrandColor } from '@/lib/constants';

interface CandidateMapModalProps {
  candidate: StationGeocodingCandidate | null;
  onClose: () => void;
  onReview?: (action: 'accept' | 'create' | 'reject') => void;
  reviewDisabled?: boolean;
}

export function CandidateMapModal({
  candidate,
  onClose,
  onReview,
  reviewDisabled = false,
}: CandidateMapModalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Initialise map when candidate changes
  useEffect(() => {
    if (!candidate || !mapContainerRef.current) return;

    let active = true;
    setMapLoading(true);
    setMapError(false);

    // Clean up any previous map instance
    if (mapInstanceRef.current) {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const hasNearestCoords =
      typeof candidate.nearest_station_latitude === 'number' &&
      typeof candidate.nearest_station_longitude === 'number' &&
      Number.isFinite(candidate.nearest_station_latitude) &&
      Number.isFinite(candidate.nearest_station_longitude);

    void loadMapLibre()
      .then((maplibre: any) => {
        if (!active || !mapContainerRef.current) return;

        const initialCenter: [number, number] = [candidate.longitude, candidate.latitude];
        const map = new maplibre.Map({
          container: mapContainerRef.current,
          style: MAP_STYLE,
          center: initialCenter,
          zoom: 16,
          attributionControl: true,
          fadeDuration: 150,
          maxZoom: 19,
        });

        map.addControl(new maplibre.NavigationControl({ showCompass: false }), 'top-left');

        map.on('idle', () => setMapLoading(false));
        map.on('error', () => {
          setMapLoading(false);
        });

        map.on('load', () => {
          if (!active) return;
          applyAlipoStyle(map);

          // 1. Proposed pin marker (Orange)
          const proposedEl = document.createElement('div');
          proposedEl.className = 'candidate-map-marker-proposed';
          proposedEl.innerHTML = `
            <div style="background: #e96a24; color: white; padding: 5px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; display: flex; items-center; gap: 4px; border: 2px solid white; box-shadow: 0 4px 14px rgba(233,106,36,0.45); white-space: nowrap; cursor: pointer;">
              <span>📍 Proposed: ${candidate.result_name || candidate.source_name}</span>
            </div>
          `;

          const proposedPopup = new maplibre.Popup({ offset: 16, closeButton: false }).setHTML(`
            <div style="font-family: var(--font-body, sans-serif); padding: 4px;">
              <strong style="display:block; font-size: 12px; color: #111;">${candidate.source_name}</strong>
              <span style="display:block; font-size: 11px; color: #666; margin-top: 2px;">Proposed coordinates: ${candidate.latitude.toFixed(5)}, ${candidate.longitude.toFixed(5)}</span>
              <span style="display:block; font-size: 11px; color: #e96a24; font-weight: 700; margin-top: 4px;">Confidence: ${candidate.confidence_score}% (${candidate.provider})</span>
            </div>
          `);

          const proposedMarker = new maplibre.Marker({ element: proposedEl, anchor: 'center' })
            .setLngLat([candidate.longitude, candidate.latitude])
            .setPopup(proposedPopup)
            .addTo(map);

          markersRef.current.push(proposedMarker);

          // 2. Nearest existing station marker (Forest green) if available
          if (hasNearestCoords) {
            const nearestLat = candidate.nearest_station_latitude!;
            const nearestLon = candidate.nearest_station_longitude!;
            const brandColor = getBrandColor(classifyStationBrand(candidate.nearest_station_name, candidate.nearest_station_brand));

            const nearestEl = document.createElement('div');
            nearestEl.className = 'candidate-map-marker-nearest';
            nearestEl.innerHTML = `
              <div style="background: ${brandColor}; color: white; padding: 5px 10px; border-radius: 9999px; font-weight: 800; font-size: 11px; display: flex; items-center; gap: 4px; border: 2px solid white; box-shadow: 0 4px 14px rgba(6,69,47,0.45); white-space: nowrap; cursor: pointer;">
                <span>⛽ ${candidate.nearest_station_name}</span>
              </div>
            `;

            const nearestPopup = new maplibre.Popup({ offset: 16, closeButton: false }).setHTML(`
              <div style="font-family: var(--font-body, sans-serif); padding: 4px;">
                <strong style="display:block; font-size: 12px; color: #111;">${candidate.nearest_station_name}</strong>
                <span style="display:block; font-size: 11px; color: #666; margin-top: 2px;">Brand: ${candidate.nearest_station_brand}</span>
                <span style="display:block; font-size: 11px; color: #06452f; font-weight: 700; margin-top: 4px;">${Math.round(candidate.nearest_station_distance_m)}m away from proposed pin</span>
              </div>
            `);

            const nearestMarker = new maplibre.Marker({ element: nearestEl, anchor: 'center' })
              .setLngLat([nearestLon, nearestLat])
              .setPopup(nearestPopup)
              .addTo(map);

            markersRef.current.push(nearestMarker);

            // 3. Connector line between proposed and nearest
            map.addSource('candidate-connector', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [candidate.longitude, candidate.latitude],
                    [nearestLon, nearestLat],
                  ],
                },
              },
            });

            map.addLayer({
              id: 'candidate-connector-line',
              type: 'line',
              source: 'candidate-connector',
              paint: {
                'line-color': '#06452f',
                'line-width': 3,
                'line-dasharray': [2, 2],
                'line-opacity': 0.75,
              },
            });

            // 4. Fit bounds to include both pins
            const minLon = Math.min(candidate.longitude, nearestLon);
            const maxLon = Math.max(candidate.longitude, nearestLon);
            const minLat = Math.min(candidate.latitude, nearestLat);
            const maxLat = Math.max(candidate.latitude, nearestLat);

            map.fitBounds(
              [
                [minLon, minLat],
                [maxLon, maxLat],
              ],
              {
                padding: { top: 70, bottom: 70, left: 70, right: 70 },
                maxZoom: 17,
                duration: 400,
              }
            );
          } else {
            map.easeTo({ center: [candidate.longitude, candidate.latitude], zoom: 16, duration: 400 });
          }

          setMapLoading(false);
        });

        mapInstanceRef.current = map;
      })
      .catch(() => {
        if (!active) return;
        setMapError(true);
        setMapLoading(false);
      });

    return () => {
      active = false;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [candidate]);

  if (!candidate) return null;

  const tooCloseToCreate = candidate.nearest_station_distance_m <= 75;
  const hasNearest =
    typeof candidate.nearest_station_latitude === 'number' &&
    typeof candidate.nearest_station_longitude === 'number';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="candidate-map-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 bg-gray-50/80 px-5 py-4">
          <div className="min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Alipo Live Map Preview
              </span>
              <span className="text-[11px] font-black text-gray-500">
                {candidate.operator_name} · {candidate.source_city || 'Malawi'}
              </span>
            </div>
            <h2 id="candidate-map-modal-title" className="mt-1 truncate text-lg font-black text-gray-950 sm:text-xl">
              {candidate.result_name || candidate.source_name}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {candidate.latitude.toFixed(5)}, {candidate.longitude.toFixed(5)} · {candidate.provider} ({candidate.confidence_score}% confidence)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close map preview"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Map Container */}
        <div className="relative h-[380px] w-full bg-[#e7eadf] sm:h-[460px]">
          <div ref={mapContainerRef} className="h-full w-full" />

          {/* Loading overlay */}
          {mapLoading ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[#e7eadf]/80 backdrop-blur-[2px]">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-700/20 bg-white px-4 py-2.5 text-xs font-black text-emerald-950 shadow-md">
                <RefreshCw className="h-4 w-4 animate-spin text-orange" /> Loading Alipo map…
              </div>
            </div>
          ) : null}

          {/* Error overlay */}
          {mapError ? (
            <div className="absolute inset-0 z-10 grid place-items-center bg-[#e7eadf] p-4 text-center">
              <div className="max-w-xs rounded-xl border border-red-200 bg-white p-4 shadow-lg">
                <p className="text-xs font-bold text-red-700">Map tiles could not be loaded.</p>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${candidate.latitude}&mlon=${candidate.longitude}#map=18/${candidate.latitude}/${candidate.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 underline"
                >
                  Open in OpenStreetMap <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          ) : null}

          {/* Proximity / Distance HUD Overlay */}
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 sm:right-auto">
            <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-black/10 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur-md">
              <span className="flex h-2.5 w-2.5 rounded-full bg-[#e96a24]" />
              <span className="font-bold text-gray-700">Proposed pin</span>
              {hasNearest ? (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="flex h-2.5 w-2.5 rounded-full bg-[#06452f]" />
                  <span className="font-bold text-gray-700">Closest station</span>
                  <span className="text-gray-300">·</span>
                  <span
                    className={`font-black ${
                      tooCloseToCreate ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    {Math.round(candidate.nearest_station_distance_m)}m apart
                  </span>
                </>
              ) : (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-500">Closest station: {Math.round(candidate.nearest_station_distance_m)}m</span>
                </>
              )}
            </div>

            {tooCloseToCreate ? (
              <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] font-bold text-amber-900 shadow-lg backdrop-blur-md">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                Within 75m of existing station
              </div>
            ) : (
              <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50/95 px-3 py-2 text-[11px] font-bold text-emerald-900 shadow-lg backdrop-blur-md">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                &gt;75m away (potential new station)
              </div>
            )}
          </div>
        </div>

        {/* Footer with Details & Direct Review Actions */}
        <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-gray-500">
            <span>Closest: </span>
            <strong className="text-gray-900">{candidate.nearest_station_name}</strong>
            <span className="text-gray-400"> ({candidate.nearest_station_brand})</span>
            <span className="mx-1 text-gray-300">·</span>
            <a
              href={`https://www.openstreetmap.org/?mlat=${candidate.latitude}&mlon=${candidate.longitude}#map=18/${candidate.latitude}/${candidate.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 hover:underline"
            >
              External OSM <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          {onReview ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={reviewDisabled}
                onClick={() => onReview('accept')}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 text-xs font-black text-white transition hover:bg-emerald-800 disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" /> Match
              </button>
              <button
                type="button"
                disabled={reviewDisabled || tooCloseToCreate}
                onClick={() => onReview('create')}
                title={tooCloseToCreate ? 'Use Match when an existing pin is within 75 metres.' : undefined}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 text-xs font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> Create
              </button>
              <button
                type="button"
                disabled={reviewDisabled}
                onClick={() => onReview('reject')}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 text-xs font-black text-red-700 transition hover:bg-red-50 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" /> Reject
              </button>
              <button
                type="button"
                onClick={onClose}
                className="ml-auto inline-flex min-h-10 items-center rounded-xl border border-gray-300 bg-white px-3.5 text-xs font-bold text-gray-700 hover:bg-gray-100 sm:ml-0"
              >
                Close
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto inline-flex min-h-10 items-center rounded-xl bg-gray-900 px-4 text-xs font-black text-white hover:bg-black"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
