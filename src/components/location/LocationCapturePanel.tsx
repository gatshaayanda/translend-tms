"use client";

import { useRef, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { truckLocationEventsRepo } from "@/lib/firebase/modules";
import { startBrowserGpsWatch } from "@/lib/location/browserGps";

export function LocationCapturePanel({ orgId, truckId, tripId }: { orgId: string; truckId: string; tripId?: string | null }) {
  const { user } = useAuth();
  const stopRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<"idle" | "tracking">("idle");
  const [message, setMessage] = useState("Location is off.");

  const start = () => {
    if (!user) return;
    setMessage("Requesting device location permission…");
    stopRef.current = startBrowserGpsWatch(async (point) => {
      try {
        await truckLocationEventsRepo.create(orgId, user.uid, {
          truckId,
          tripId: tripId ?? null,
          latitude: point.latitude,
          longitude: point.longitude,
          accuracyMeters: point.accuracyMeters,
          speedKph: point.speedKph,
          headingDegrees: point.headingDegrees,
          capturedAt: Timestamp.fromDate(point.capturedAt),
          source: "driver_gps",
          status: point.speedKph != null && point.speedKph > 3 ? "moving" : "idle",
        }, "LIVE");
        setMessage(`Tracking active · last point saved ${point.capturedAt.toLocaleTimeString()}`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Location could not be saved.");
      }
    }, (error) => setMessage(error));
    setState("tracking");
  };

  const stop = () => {
    stopRef.current?.();
    stopRef.current = null;
    setState("idle");
    setMessage("Location tracking stopped.");
  };

  return <div className="panel">
    <div className="section-header"><div><h2 className="section-title">Driver location capture</h2><p className="section-sub">Uses this device only after permission. Points are throttled to reduce unnecessary Firestore writes.</p></div><span className={state === "tracking" ? "badge green" : "badge"}>{state === "tracking" ? "TRACKING" : "OFF"}</span></div>
    <div className="form-row-actions">
      {state === "tracking" ? <button className="btn-secondary" onClick={stop}>Stop location</button> : <button className="btn-primary" onClick={start}>Start location</button>}
      <span className="muted">{message}</span>
    </div>
  </div>;
}
