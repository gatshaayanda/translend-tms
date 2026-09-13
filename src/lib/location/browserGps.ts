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

export function startBrowserGpsWatch(
  onPoint: (point: BrowserGpsPoint) => void,
  onError: (message: string) => void,
  options: BrowserGpsOptions = {},
) {
  if (!("geolocation" in navigator)) {
    onError("This device/browser does not support location capture.");
    return () => undefined;
  }

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

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      const point: BrowserGpsPoint = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
        speedKph: position.coords.speed == null ? null : position.coords.speed * 3.6,
        headingDegrees: position.coords.heading == null ? null : position.coords.heading,
        capturedAt: new Date(position.timestamp),
      };
      const now = point.capturedAt.getTime();
      const movedEnough = !lastPoint || distanceMeters(lastPoint, point) >= minDistanceMeters;
      const waitedEnough = now - lastSavedAt >= minIntervalMs;
      if (movedEnough || waitedEnough) {
        lastPoint = point;
        lastSavedAt = now;
        onPoint(point);
      }
    },
    (error) => onError(error.message || "Location permission or signal is unavailable."),
    {
      enableHighAccuracy: options.enableHighAccuracy ?? true,
      timeout: 20_000,
      maximumAge: 30_000,
    },
  );

  return () => navigator.geolocation.clearWatch(watchId);
}
