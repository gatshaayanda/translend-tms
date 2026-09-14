"use client";

export interface BrowserGpsOptions {
  minDistanceMeters?: number;
  minIntervalMs?: number;
  enableHighAccuracy?: boolean;
}

export interface BrowserGpsPoint {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  speedKph: number | null;
  headingDegrees: number | null;
  capturedAt: Date;
}

function permissionErrorMessage() {
  return "Location permission could not be granted. If Chrome says this site cannot ask for permission, close any browser bubbles or overlays, then allow Location for Translend in the site settings and press Start location again.";
}

export function startBrowserGpsWatch(
  onPoint: (point: BrowserGpsPoint) => void,
  onError: (message: string) => void,
  options: BrowserGpsOptions = {},
) {
  if (!("geolocation" in navigator)) {
    onError("This device/browser does not support location capture.");
    return () => undefined;
  }
  if (!window.isSecureContext) {
    onError("Location capture requires a secure HTTPS connection. Reopen Translend over HTTPS and try again.");
    return () => undefined;
  }

  let stopped = false;
  let watchId: number | null = null;
  let lastSavedAt = 0;
  let lastPoint: BrowserGpsPoint | null = null;
  const minIntervalMs = options.minIntervalMs ?? 60_000;
  const minDistanceMeters = options.minDistanceMeters ?? 100;

  const distanceMeters = (a: BrowserGpsPoint, b: BrowserGpsPoint) => {
    const r = 6371000;
    const dLat = (b.latitude - a.latitude) * Math.PI / 180;
    const dLon = (b.longitude - a.longitude) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return 2 * r * Math.asin(Math.sqrt(x));
  };

  const toPoint = (position: GeolocationPosition): BrowserGpsPoint => ({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
    speedKph: position.coords.speed == null ? null : position.coords.speed * 3.6,
    headingDegrees: position.coords.heading == null ? null : position.coords.heading,
    capturedAt: new Date(position.timestamp),
  });

  const beginWatch = () => {
    if (stopped || watchId !== null) return;
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const point = toPoint(position);
        const now = point.capturedAt.getTime();
        const movedEnough = !lastPoint || distanceMeters(lastPoint, point) >= minDistanceMeters;
        const waitedEnough = now - lastSavedAt >= minIntervalMs;
        if (movedEnough || waitedEnough) {
          lastPoint = point;
          lastSavedAt = now;
          onPoint(point);
        }
      },
      () => onError(permissionErrorMessage()),
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: 20_000,
        maximumAge: 30_000,
      },
    );
  };

  // Do not await a Permissions API preflight here. The browser permission
  // request must stay directly on the call path initiated by the Start button.
  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (stopped) return;
      const point = toPoint(position);
      lastPoint = point;
      lastSavedAt = point.capturedAt.getTime();
      onPoint(point);
      beginWatch();
    },
    () => {
      if (stopped) return;
      onError(permissionErrorMessage());
    },
    {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: 20_000,
      maximumAge: 30_000,
    },
  );

  return () => {
    stopped = true;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
  };
}
