"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { driversRepo, tripsRepo } from "@/lib/firebase/modules";
import type { Driver, Trip, TripStatus } from "@/types/core";
import { LocationCapturePanel } from "@/components/location/LocationCapturePanel";

const FLOW: TripStatus[] = ["planned", "en_route_pickup", "loading", "in_transit", "unloading", "completed"];
const LABELS: Record<TripStatus, string> = {
  planned: "Planned",
  en_route_pickup: "En route to pickup",
  loading: "Loading",
  in_transit: "In transit",
  unloading: "Unloading",
  completed: "Completed",
  exception: "Exception",
};

const ACTIONS: Record<TripStatus, string> = {
  planned: "Start trip",
  en_route_pickup: "Mark pickup arrived",
  loading: "Mark loading complete",
  in_transit: "Mark delivery arrived",
  unloading: "Confirm delivery",
  completed: "Trip complete",
  exception: "Resolve exception",
};

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}>
      <strong>Driver data could not be loaded.</strong>
      <br />
      {message}
      <br />
      <button className="btn-secondary" style={{ marginTop: 10 }} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export default function MyTripPage() {
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!activeOrg || !user) return;
    const orgId = activeOrg.id;
    let alive = true;
    setLoading(true);
    setMessage(null);

    Promise.all([
      driversRepo.list(orgId, { environment: "LIVE" }),
      tripsRepo.list(orgId, { environment: "LIVE" }),
    ])
      .then(([driverList, tripList]) => {
        if (!alive) return;
        const linked = driverList.find((item) => item.linkedUid === user.uid) ?? null;
        const assigned = linked
          ? tripList.filter((trip) => trip.driverId === linked.id && trip.status !== "completed")
          : [];
        setDriver(linked);
        setTrips(assigned);
        setSelectedTripId((current) =>
          current && assigned.some((trip) => trip.id === current) ? current : assigned[0]?.id ?? null,
        );
      })
      .catch((error) => {
        if (alive) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load your trip. Try again or report the issue to the Translend developer/workspace administrator.",
          );
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [activeOrg, user]);

  const trip = useMemo(
    () => trips.find((item) => item.id === selectedTripId) ?? trips.find((item) => item.status !== "exception") ?? trips[0] ?? null,
    [selectedTripId, trips],
  );

  const next = trip ? FLOW[FLOW.indexOf(trip.status) + 1] : undefined;
  const nextAction = trip ? ACTIONS[trip.status] : null;

  const advance = async () => {
    if (!activeOrg || !user || !trip || !next || actionBusy) return;
    if (!navigator.onLine) {
      setOnline(false);
      setMessage("You are offline. The trip status was not marked complete because this action requires a live server connection.");
      return;
    }

    setMessage(null);
    setActionBusy(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/driver/trip-status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId: activeOrg.id, tripId: trip.id, status: next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Trip update failed.");

      if (data.status === "completed") {
        setTrips((current) => current.filter((item) => item.id !== trip.id));
        setSelectedTripId((current) => (current === trip.id ? null : current));
        setMessage("Trip completed successfully. Any remaining assigned trip is now selected.");
      } else {
        setTrips((current) => current.map((item) => (item.id === trip.id ? { ...item, status: data.status } : item)));
        setMessage(`Trip updated to ${LABELS[data.status as TripStatus]}.`);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Trip update failed. If it persists, report it to the Translend developer/workspace administrator.",
      );
    } finally {
      setActionBusy(false);
    }
  };

  if (!activeOrg) return null;

  if (!driver) {
    return (
      <div className="space-y-6">
        <header className="page-header">
          <div>
            <h1 className="page-title">My Trip</h1>
            <p className="page-subtitle">Your driver workspace on Translend.</p>
          </div>
          <span className="badge">DRIVER APP</span>
        </header>
        {!online && <div className="notice" style={{ borderColor: "#E6B94A", background: "#FFF8E1" }}>Offline — showing only data already available on this device. New trip actions require a connection.</div>}
        {loading && <div className="notice blue">Loading your driver profile…</div>}
        {message && <ErrorNotice message={message} onRetry={() => window.location.reload()} />}
        {!loading && !message && (
          <div className="notice blue">
            Your Google account is signed in, but it is not linked to a Translend driver record yet. Ask the fleet manager to link your driver profile.
          </div>
        )}
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="space-y-6">
        <header className="page-header">
          <div>
            <h1 className="page-title">My Trip</h1>
            <p className="page-subtitle">Your assigned movements and next action.</p>
          </div>
          <span className="badge green">READY</span>
        </header>
        {!online && <div className="notice" style={{ borderColor: "#E6B94A", background: "#FFF8E1" }}>Offline — reconnect before using trip actions.</div>}
        {message && <ErrorNotice message={message} onRetry={() => window.location.reload()} />}
        {!message && (
          <div className="panel">
            <h2 className="section-title">No active trip</h2>
            <p className="section-sub">You are linked as {driver.fullName}. When dispatch assigns you a live trip, it will appear here.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div>
          <h1 className="page-title">My Trip</h1>
          <p className="page-subtitle">Your next action, trip status, delivery handoff and vehicle tools in one driver-first view.</p>
        </div>
        <span className="badge green">{LABELS[trip.status]}</span>
      </header>

      {!online && (
        <div className="notice" style={{ borderColor: "#E6B94A", background: "#FFF8E1" }}>
          <strong>Offline.</strong> Your trip information may remain available from the device cache, but trip status changes cannot be confirmed until the connection returns.
        </div>
      )}
      {message && <div className="notice blue">{message}</div>}

      {trips.length > 1 && (
        <section className="panel">
          <div className="section-header">
            <div>
              <h2 className="section-title">Today&apos;s assigned trips</h2>
              <p className="section-sub">Select a trip to work on it. Completed trips leave this list.</p>
            </div>
          </div>
          <div className="space-y-2">
            {trips.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left rounded-xl border p-3"
                style={{ borderColor: item.id === trip.id ? "var(--blue-500)" : "var(--border)", background: item.id === trip.id ? "var(--blue-50)" : "var(--surface)" }}
                onClick={() => setSelectedTripId(item.id)}
              >
                <div className="flex items-center justify-between gap-3">
                  <strong>{item.jobNumber}</strong>
                  <span className="badge">{LABELS[item.status]}</span>
                </div>
                <div className="text-sm opacity-70">{item.truckRegistration} · {item.currentLocation ?? "Assigned route"}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="section-header">
          <div>
            <h2 className="section-title">{trip.jobNumber}</h2>
            <p className="section-sub">Truck {trip.truckRegistration} · {trip.driverName}</p>
          </div>
          <span className="badge">{nextAction ?? LABELS[trip.status]}</span>
        </div>

        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Next action</div>
            <div className="kpi-value" style={{ fontSize: 18 }}>{nextAction ?? "Trip complete"}</div>
            <div className="kpi-sub">Use the action button only when the real milestone has occurred.</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Current location</div>
            <div className="kpi-value" style={{ fontSize: 18 }}>{trip.currentLocation ?? "Assigned route"}</div>
            <div className="kpi-sub">Live trip location field</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Trip status</div>
            <div className="kpi-value" style={{ fontSize: 18 }}>{LABELS[trip.status]}</div>
            <div className="kpi-sub">Operational state from the live trip record</div>
          </div>
        </div>

        {next && (
          <button className="btn-primary" onClick={advance} disabled={actionBusy || !online}>
            {actionBusy ? "Updating…" : `${nextAction} →`}
          </button>
        )}
        {!online && next && <div className="text-sm opacity-70" style={{ marginTop: 10 }}>Reconnect before marking the next trip milestone.</div>}
      </section>

      <LocationCapturePanel orgId={activeOrg.id} truckId={trip.truckId} tripId={trip.id} />

      <section className="panel">
        <div className="section-header">
          <div>
            <h2 className="section-title">Delivery & POD</h2>
            <p className="section-sub">Use the existing delivery workflow for arrival, departure, acknowledgement, evidence and exceptions.</p>
          </div>
          <Link className="btn-primary" href={`/${activeOrg.id}/deliveries?tripId=${encodeURIComponent(trip.id)}`}>Open delivery workflow</Link>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div>
            <h2 className="section-title">Vehicle tools</h2>
            <p className="section-sub">Open the existing fuel/workshop workflow with this truck and trip pre-filled.</p>
          </div>
          <Link className="btn-secondary" href={`/${activeOrg.id}/fuel-workshop?truckId=${encodeURIComponent(trip.truckId)}&tripId=${encodeURIComponent(trip.id)}`}>Fuel & workshop</Link>
        </div>
      </section>

      <div className="notice blue">Install Translend on this phone for the best driver workflow. Location capture requires explicit permission and the app must remain active for browser GPS capture. Background location tracking is not claimed.</div>
    </div>
  );
}
