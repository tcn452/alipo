'use client';

export type GeolocationPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown';

export type LocationRequestErrorCode = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export const HIGH_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20_000,
  maximumAge: 0,
};

export const LOW_ACCURACY_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 30_000,
  maximumAge: 60_000,
};

export function isSamsungInternet(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /SamsungBrowser/i.test(navigator.userAgent);
}

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
 * Request a one-shot position. Must be invoked directly from a user gesture
 * (pointerup/click), and ideally before any React setState, so Samsung Internet
 * still treats the call as user-activated.
 */
export function requestCurrentPosition(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (code: LocationRequestErrorCode) => void,
): void {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    onError('unsupported');
    return;
  }

  // Samsung Internet is more reliable with network location first; GPS-first often
  // returns denied/timeout without showing a prompt when Location services are restricted.
  const primary = isSamsungInternet() ? LOW_ACCURACY_OPTIONS : HIGH_ACCURACY_OPTIONS;
  const fallback = isSamsungInternet() ? HIGH_ACCURACY_OPTIONS : LOW_ACCURACY_OPTIONS;

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
        fallback,
      );
    },
    primary,
  );
}

export function watchUserPosition(
  onPosition: (position: GeolocationPosition) => void,
  onError: (code: LocationRequestErrorCode) => void,
): number {
  const options: PositionOptions = isSamsungInternet()
    ? { enableHighAccuracy: false, timeout: 30_000, maximumAge: 60_000 }
    : { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 };

  return navigator.geolocation.watchPosition(
    onPosition,
    (error) => onError(mapPositionError(error)),
    options,
  );
}
