"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { driversRepo, tripsRepo } from "@/lib/firebase/modules";
import type { Driver, Trip, TripStatus } from "@/types/core";
import { LocationCapturePanel } from "@/components/location/LocationCapturePanel";

const FLOW: TripStatus[] = ["planned", "en_route_pickup", "loading", "in_transit", "unloading", "completed"];
const LABELS: Record<TripStatus, string> = { planned: "Planned", en_route_pickup: "En route to pickup", loading: "Loading", in_transit: "In transit", unloading: "Unloading", completed: "Completed", exception: "Exception" };

export default function MyTripPage() {
  const { activeOrg } = useWorkspace(); const { user } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null); const [trips, setTrips] = useState<Trip[]>([]); const [message, setMessage] = useState<string | null>(null); const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeOrg || !user) return;
    const orgId = activeOrg.id; let alive = true; setLoading(true); setMessage(null);
    Promise.all([driversRepo.list(orgId, { environment: "LIVE" }), tripsRepo.list(orgId, { environment: "LIVE" })]).then(([driverList, tripList]) => {
      if (!alive) return; const linked = driverList.find((item) => item.linkedUid === user.uid) ?? null; setDriver(linked); setTrips(linked ? tripList.filter((trip) => trip.driverId === linked.id && trip.status !== "completed") : []);
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load your trip. Try again or report the issue to the Translend developer/workspace administrator.")).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [activeOrg, user]);

  const trip = useMemo(() => trips.find((item) => item.status !== "exception") ?? trips[0] ?? null, [trips]);

  const advance = async () => {
    if (!activeOrg || !user || !trip) return; const next = FLOW[FLOW.indexOf(trip.status) + 1]; if (!next) return;
    setMessage(null);
    try {
      const token = await user.getIdToken(); const response = await fetch("/api/driver/trip-status", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ orgId: activeOrg.id, tripId: trip.id, status: next }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Trip update failed.");
      setTrips((current) => current.map((item) => item.id === trip.id ? { ...item, status: data.status } : item)); setMessage(`Trip updated to ${LABELS[data.status as TripStatus]}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Trip update failed. If it persists, report it to the Translend developer/workspace administrator."); }
  };

  if (!activeOrg) return null;
  if (!driver) return <div className="space-y-6"><header className="page-header"><div><h1 className="page-title">My Trip</h1><p className="page-subtitle">Your driver workspace on Translend.</p></div><span className="badge">DRIVER APP</span></header>{loading && <div className="notice blue">Loading your driver profile…</div>}{message && <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}><strong>Driver data could not be loaded.</strong><br />{message}<br /><button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => window.location.reload()}>Try again</button></div>}{!loading && !message && <div className="notice blue">Your Google account is signed in, but it is not linked to a Translend driver record yet. Ask the fleet manager to link your driver profile.</div>}</div>;
  if (!trip) return <div className="space-y-6"><header className="page-header"><div><h1 className="page-title">My Trip</h1><p className="page-subtitle">Your next assigned movement appears here.</p></div><span className="badge green">READY</span></header>{message && <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}>{message}<br /><button className="btn-secondary" style={{ marginTop: 10 }} onClick={() => window.location.reload()}>Try again</button></div>}<div className="panel"><h2 className="section-title">No active trip</h2><p className="section-sub">You are linked as {driver.fullName}. When dispatch assigns you a trip, it will appear here.</p></div></div>;

  const next = FLOW[FLOW.indexOf(trip.status) + 1];
  return <div className="space-y-6"><header className="page-header"><div><h1 className="page-title">My Trip</h1><p className="page-subtitle">A focused mobile workflow for drivers: trip state, location and delivery handoff.</p></div><span className="badge green">{LABELS[trip.status]}</span></header>{message && <div className="notice blue">{message}</div>}
    <section className="panel"><div className="section-header"><div><h2 className="section-title">{trip.jobNumber}</h2><p className="section-sub">Truck {trip.truckRegistration} · {trip.driverName}</p></div></div><div className="kpi-grid"><div className="kpi-card"><div className="kpi-label">Pickup / route</div><div className="kpi-value" style={{ fontSize: 18 }}>{trip.currentLocation ?? "Assigned route"}</div><div className="kpi-sub">Current trip location</div></div><div className="kpi-card"><div className="kpi-label">Trip status</div><div className="kpi-value" style={{ fontSize: 18 }}>{LABELS[trip.status]}</div><div className="kpi-sub">Live operational state</div></div></div>{next && <button className="btn-primary" onClick={advance}>Mark {LABELS[next]} →</button>}</section>
    <LocationCapturePanel orgId={activeOrg.id} truckId={trip.truckId} tripId={trip.id} />
    <section className="panel"><div className="section-header"><div><h2 className="section-title">Delivery workflow</h2><p className="section-sub">Open the existing delivery/POD workflow with this trip context.</p></div><Link className="btn-primary" href={`/${activeOrg.id}/deliveries?tripId=${encodeURIComponent(trip.id)}`}>Open delivery workflow</Link></div></section>
    <div className="notice blue">Install Translend on this phone for the best driver workflow. Location still requires explicit permission and the app must remain active for browser GPS capture.</div>
  </div>;
}
