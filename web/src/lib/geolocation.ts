'use client';

export type GeolocationPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown';

export type LocationRequestErrorCode = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export const HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 0,
};

export const LOW_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 20_000,
  maximumAge: 60_000,
};

export async function queryGeolocationPermission(): Promise<GeolocationPermissionState> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'unknown';
  try {
    if (!navigator.permissions?.query) return 'unknown';
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    if (result.state === 'granted' || result.state === 'prompt' || result.state === 'denied') {
      return result.state;
    }
  } catch {
    // Samsung Internet and some WebViews omit or reject geolocation permission queries.
  }
  return 'unknown';
}

export function mapPositionError(error: GeolocationPositionError | null | undefined): LocationRequestErrorCode {
  if (!error) return 'unavailable';
  if (error.code === error.PERMISSION_DENIED) return 'denied';
  if (error.code === error.TIMEOUT) return 'timeout';
  return 'unavailable';
}

/**
 * Request a one-shot position. Must be called directly from a user gesture
 * (tap/click) so Samsung Internet and similar browsers will show the prompt.
 */
export function requestCurrentPosition(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (code: LocationRequestErrorCode) => void,
): void {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    onError('unsupported');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    onSuccess,
    (firstError) => {
      const firstCode = mapPositionError(firstError);
      if (firstCode === 'denied' || firstCode === 'unsupported') {
        onError(firstCode);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        onSuccess,
        (secondError) => onError(mapPositionError(secondError)),
        LOW_ACCURACY_OPTIONS,
      );
    },
    HIGH_ACCURACY_OPTIONS,
  );
}

export function watchUserPosition(
  onPosition: (position: GeolocationPosition) => void,
  onError: (code: LocationRequestErrorCode) => void,
): number {
  return navigator.geolocation.watchPosition(
    onPosition,
    (error) => onError(mapPositionError(error)),
    { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 },
  );
}
