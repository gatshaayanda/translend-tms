"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { TruckLocationEvent } from "@/types/location";

declare global {
  interface Window {
    google?: any;
  }
}

const DEFAULT_CENTER = { lat: -24.6282, lng: 25.9231 };
const STALE_AFTER_MS = 10 * 60 * 1000;

type MapFilter = "all" | "moving" | "idle" | "alert";

function latestByTruck(events: TruckLocationEvent[]) {
  const latest = new Map<string, TruckLocationEvent>();
  for (const event of events) {
    const previous = latest.get(event.truckId);
    const currentMs = event.capturedAt?.toMillis?.() ?? 0;
    const previousMs = previous?.capturedAt?.toMillis?.() ?? 0;
    if (!previous || currentMs >= previousMs) latest.set(event.truckId, event);
  }
  return [...latest.values()];
}

function eventIsStale(event: TruckLocationEvent) {
  const captured = event.capturedAt?.toMillis?.() ?? 0;
  return !captured || Date.now() - captured > STALE_AFTER_MS;
}

function statusFor(event: TruckLocationEvent) {
  if (eventIsStale(event)) return "stale" as const;
  if (event.status === "moving") return "moving" as const;
  return "idle" as const;
}

export function FleetLiveMap({
  events,
  trucks,
}: {
  events: TruckLocationEvent[];
  trucks: Array<{ id: string; registration?: string; make?: string; model?: string }>;
}) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [filter, setFilter] = useState<MapFilter>("all");
  const [selectedTruckId, setSelectedTruckId] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const latest = useMemo(() => latestByTruck(events), [events]);
  const truckById = useMemo(() => new Map(trucks.map((truck) => [truck.id, truck])), [trucks]);
  const rows = useMemo(() => {
    return latest
      .map((event) => ({ event, truck: truckById.get(event.truckId) }))
      .filter(({ event }) => {
        const status = statusFor(event);
        return filter === "all" || filter === status || (filter === "alert" && status === "stale");
      })
      .sort((a, b) => (b.event.capturedAt?.toMillis?.() ?? 0) - (a.event.capturedAt?.toMillis?.() ?? 0));
  }, [latest, truckById, filter]);

  useEffect(() => {
    if (!apiKey || !mapElement.current) return;
    let cancelled = false;

    const initialise = () => {
      if (cancelled || !window.google?.maps || !mapElement.current) return;
      mapRef.current = new window.google.maps.Map(mapElement.current, {
        center: DEFAULT_CENTER,
        zoom: 10,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        clickableIcons: false,
      });
      setMapReady(true);
    };

    if (window.google?.maps) {
      initialise();
      return () => { cancelled = true; };
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-translend-google-maps]");
    if (existing) {
      existing.addEventListener("load", initialise);
      existing.addEventListener("error", () => setMapError("The map provider could not be loaded."));
      return () => {
        cancelled = true;
        existing.removeEventListener("load", initialise);
      };
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async`;
    script.async = true;
    script.defer = true;
    script.dataset.translendGoogleMaps = "true";
    script.addEventListener("load", initialise);
    script.addEventListener("error", () => setMapError("The map provider could not be loaded. Check the Google Maps API key and configuration."));
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener("load", initialise);
    };
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady || !mapRef.current || !window.google?.maps) return;
    const map = mapRef.current;
    const activeIds = new Set(rows.map(({ event }) => event.truckId));

    for (const [truckId, marker] of markersRef.current) {
      if (!activeIds.has(truckId)) {
        marker.setMap(null);
        markersRef.current.delete(truckId);
      }
    }

    for (const { event, truck } of rows) {
      const status = statusFor(event);
      const position = { lat: event.latitude, lng: event.longitude };
      const label = truck?.registration ?? event.truckId;
      const existing = markersRef.current.get(event.truckId);
      const marker = existing ?? new window.google.maps.Marker({ map, title: label });
      marker.setPosition(position);
      marker.setTitle(`${label} · ${status.toUpperCase()}`);
      marker.setIcon({
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: status === "stale" ? 7 : 8,
        fillColor: status === "moving" ? "#15803d" : status === "stale" ? "#dc2626" : "#d97706",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      });
      marker.addListener("click", () => setSelectedTruckId(event.truckId));
      markersRef.current.set(event.truckId, marker);
    }

    if (rows.length && !selectedTruckId) {
      const bounds = new window.google.maps.LatLngBounds();
      rows.forEach(({ event }) => bounds.extend({ lat: event.latitude, lng: event.longitude }));
      map.fitBounds(bounds, 72);
    }
  }, [mapReady, rows, selectedTruckId]);

  useEffect(() => {
    return () => {
      for (const marker of markersRef.current.values()) marker.setMap(null);
      markersRef.current.clear();
    };
  }, []);

  const focus = (event: TruckLocationEvent) => {
    setSelectedTruckId(event.truckId);
    if (mapRef.current) {
      mapRef.current.panTo({ lat: event.latitude, lng: event.longitude });
      mapRef.current.setZoom(14);
    }
  };

  return (
    <section className="panel">
      <div className="section-header">
        <div>
          <h2 className="section-title">Live fleet map</h2>
          <p className="section-sub">Real driver GPS or telematics positions only. Stale positions are flagged instead of being presented as live.</p>
        </div>
        <div className="form-row-actions">
          {(["all", "moving", "idle", "alert"] as MapFilter[]).map((value) => (
            <button key={value} className={filter === value ? "btn-primary" : "btn-secondary"} onClick={() => setFilter(value)}>
              {value === "all" ? "All" : value === "alert" ? "Alerts" : value[0].toUpperCase() + value.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {!apiKey && <div className="notice blue">Map provider configuration is still required. Location events are being collected and remain available below; no truck position is fabricated.</div>}
      {mapError && <div className="notice red">{mapError}</div>}

      {apiKey ? <div ref={mapElement} style={{ minHeight: 430, borderRadius: 14, overflow: "hidden", background: "#e5e7eb" }} /> : null}

      <div className="section-header" style={{ marginTop: 18 }}>
        <div>
          <h3 className="section-title">Latest truck positions</h3>
          <p className="section-sub">{rows.length} truck position{rows.length === 1 ? "" : "s"} match the current filter.</p>
        </div>
      </div>

      {!rows.length ? (
        <div className="notice blue">No location events match this filter yet. Start driver location capture or connect the company's telematics provider.</div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Truck</th><th>Status</th><th>Last position</th><th>Accuracy</th><th>Source</th><th /></tr></thead>
            <tbody>
              {rows.map(({ event, truck }) => {
                const status = statusFor(event);
                const captured = event.capturedAt?.toDate?.();
                return (
                  <tr key={event.truckId}>
                    <td><strong>{truck?.registration ?? event.truckId}</strong><div className="muted">{truck?.make ?? "Truck"} {truck?.model ?? ""}</div></td>
                    <td><span className={`badge ${status === "moving" ? "green" : status === "stale" ? "red" : "orange"}`}>{status.toUpperCase()}</span></td>
                    <td>{event.latitude.toFixed(5)}, {event.longitude.toFixed(5)}<div className="muted">{captured ? captured.toLocaleString() : "Unknown time"}</div></td>
                    <td>{event.accuracyMeters == null ? "—" : `${Math.round(event.accuracyMeters)} m`}</td>
                    <td>{event.source === "driver_gps" ? "Driver GPS" : "Telematics"}</td>
                    <td><button className="btn-secondary" onClick={() => focus(event)}>Focus</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedTruckId && <div className="notice blue" style={{ marginTop: 14 }}>Selected truck: {truckById.get(selectedTruckId)?.registration ?? selectedTruckId}</div>}
    </section>
  );
}
