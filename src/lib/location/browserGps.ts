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

type PermissionState = "granted" | "denied" | "prompt";

function permissionErrorMessage(state?: PermissionState) {
  if (state === "denied") {
    return "Location permission is blocked for this site. Open the browser site permissions, allow Location for Translend, then press Start location again.";
  }
  return "Location permission was not granted. Allow Location for Translend when the browser asks, then press Start location again.";
}

async function getGeolocationPermission(): Promise<PermissionState | null> {
  if (!("permissions" in navigator) || !navigator.permissions?.query) return null;
  try {
    const result = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return result.state as PermissionState;
  } catch {
    return null;
  }
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

  const beginWatch = () => {
    if (stopped || watchId !== null) return;
    watchId = navigator.geolocation.watchPosition(
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
      (error) => onError(permissionErrorMessage(error.code === 1 ? "denied" : undefined)),
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: 20_000,
        maximumAge: 30_000,
      },
    );
  };

  void (async () => {
    const permission = await getGeolocationPermission();
    if (stopped) return;
    if (permission === "denied") {
      onError(permissionErrorMessage("denied"));
      return;
    }

    // Explicitly request one position first. This gives Chrome/Android/iOS a
    // real user gesture initiated permission request before the long-lived watch.
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (stopped) return;
        const point: BrowserGpsPoint = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
          speedKph: position.coords.speed == null ? null : position.coords.speed * 3.6,
          headingDegrees: position.coords.heading == null ? null : position.coords.heading,
          capturedAt: new Date(position.timestamp),
        };
        lastPoint = point;
        lastSavedAt = point.capturedAt.getTime();
        onPoint(point);
        beginWatch();
      },
      (error) => {
        if (stopped) return;
        onError(permissionErrorMessage(error.code === 1 ? "denied" : undefined));
      },
      {
        enableHighAccuracy: options.enableHighAccuracy ?? true,
        timeout: 20_000,
        maximumAge: 30_000,
      },
    );
  })();

  return () => {
    stopped = true;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
  };
}
