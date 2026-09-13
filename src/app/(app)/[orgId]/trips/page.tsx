"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { tripsRepo, jobsRepo, trucksRepo, driversRepo } from "@/lib/firebase/modules";
import type { Trip, TripStatus, Job, Truck, Driver } from "@/types/core";
import { Timestamp } from "firebase/firestore";

const STATUS_STYLE: Record<TripStatus, string> = { planned: "gray", en_route_pickup: "blue", loading: "blue", in_transit: "green", unloading: "blue", completed: "green", exception: "red" };
const STATUS_FLOW: TripStatus[] = ["planned", "en_route_pickup", "loading", "in_transit", "unloading", "completed"];

export default function TripsPage() {
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [dispatchableJobs, setDispatchableJobs] = useState<Job[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<"all" | TripStatus>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!activeOrg) return;
    const unsub = tripsRepo.subscribe(activeOrg.id, { environment: "LIVE", orderByField: "createdAt", orderDirection: "desc" }, setTrips, (err) => setError(err.message));
    return () => unsub();
  }, [activeOrg]);

  useEffect(() => {
    if (!activeOrg) return;
    const orgId = activeOrg.id;
    Promise.all([
      jobsRepo.list(orgId, { environment: "LIVE" }),
      trucksRepo.list(orgId, { environment: "LIVE" }),
      driversRepo.list(orgId, { environment: "LIVE" }),
    ]).then(([jobs, trucksList, driversList]) => {
      setDispatchableJobs(jobs.filter((j) => j.status === "confirmed"));
      setTrucks(trucksList.filter((t) => t.status === "available"));
      setDrivers(driversList.filter((d) => d.status === "available"));
    }).catch((err) => setError(err instanceof Error ? err.message : "Dispatch resources could not be loaded."));
  }, [activeOrg, trips]);

  const visibleTrips = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (trips ?? []).filter((trip) => {
      const matchesStatus = filter === "all" || trip.status === filter;
      const haystack = `${trip.jobNumber} ${trip.truckRegistration} ${trip.driverName} ${trip.currentLocation ?? ""}`.toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    });
  }, [trips, filter, search]);

  const advance = async (trip: Trip) => {
    if (!activeOrg || !user) return;
    const idx = STATUS_FLOW.indexOf(trip.status);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return;
    const patch: Partial<Trip> = { status: next };
    if (next === "in_transit" && !trip.actualStart) patch.actualStart = Timestamp.now();
    if (next === "completed") patch.actualEnd = Timestamp.now();
    try {
      await tripsRepo.update(activeOrg.id, user.uid, trip.id, patch);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trip status could not be updated.");
    }
  };

  if (!activeOrg) return null;

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div><h1 className="page-title">Trips & Dispatch</h1><p className="page-subtitle">Assign confirmed jobs safely, then track every live movement through completion.</p></div>
        <button onClick={() => setShowCreate(true)} disabled={dispatchableJobs.length === 0 || trucks.length === 0 || drivers.length === 0} className="btn-primary">+ Dispatch trip</button>
      </header>

      {error && <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}><strong>Dispatch update needs attention.</strong><br />{error}</div>}

      <section className="panel">
        <div className="section-header"><div><h2 className="section-title">Dispatch readiness</h2><p className="section-sub">Only confirmed jobs, available trucks and available drivers can enter a new trip.</p></div></div>
        <div className="kpi-grid">
          <div className="kpi-card"><div className="kpi-label">Jobs ready</div><div className="kpi-value">{dispatchableJobs.length}</div><div className="kpi-sub">Confirmed and not yet dispatched</div></div>
          <div className="kpi-card"><div className="kpi-label">Trucks ready</div><div className="kpi-value">{trucks.length}</div><div className="kpi-sub">Currently available</div></div>
          <div className="kpi-card"><div className="kpi-label">Drivers ready</div><div className="kpi-value">{drivers.length}</div><div className="kpi-sub">Currently available</div></div>
        </div>
      </section>

      {trips === null ? <Skeleton /> : (
        <section className="panel">
          <div className="section-header"><div><h2 className="section-title">Trip register</h2><p className="section-sub">Live dispatch and movement state.</p></div><span className="badge teal">{visibleTrips.length} of {trips.length}</span></div>
          <div className="form-actions" style={{ justifyContent: "flex-start", alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <input className="form-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search job, truck, driver or location" style={{ minWidth: 260, flex: 1 }} />
            <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value as "all" | TripStatus)} style={{ width: 180 }}>
              <option value="all">All statuses</option>
              {STATUS_FLOW.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
              <option value="exception">Exception</option>
            </select>
          </div>
          {visibleTrips.length === 0 ? <div className="empty-state"><p style={{ fontSize: 14, fontWeight: 700 }}>No matching trips.</p><p style={{ marginTop: 5, color: "var(--ink-3)", fontSize: 12 }}>Clear the filters or dispatch a confirmed job.</p></div> : (
            <div className="list">
              {visibleTrips.map((t) => {
                const idx = STATUS_FLOW.indexOf(t.status);
                const canAdvance = t.status !== "exception" && idx >= 0 && idx < STATUS_FLOW.length - 1;
                return <div key={t.id} className="list-row" style={{ alignItems: "center" }}>
                  <div><strong>{t.jobNumber} · {t.truckRegistration} · {t.driverName}</strong><span className="muted">{t.currentLocation ?? "No location update yet"} · {t.plannedStart?.toDate?.().toLocaleDateString?.() ?? "Schedule not set"}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span className={`badge ${STATUS_STYLE[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                    {canAdvance && <button onClick={() => advance(t)} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 11 }}>Advance →</button>}
                  </div>
                </div>;
              })}
            </div>
          )}
        </section>
      )}

      {showCreate && <DispatchDialog orgId={activeOrg.id} jobs={dispatchableJobs} trucks={trucks} drivers={drivers} onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />}
    </div>
  );
}

function DispatchDialog({ orgId, jobs, trucks, drivers, onClose, onCreated }: { orgId: string; jobs: Job[]; trucks: Truck[]; drivers: Driver[]; onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [truckId, setTruckId] = useState(trucks[0]?.id ?? "");
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) { setError("You must be signed in to dispatch a trip."); return; }
    if (!jobId || !truckId || !driverId) { setError("Select a job, truck, and driver."); return; }
    setSubmitting(true); setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/dispatch/trip", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ orgId, jobId, truckId, driverId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Dispatch failed.");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dispatch failed. Try again.");
    } finally { setSubmitting(false); }
  };

  return <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
    <div className="form-card" style={{ width: "100%", maxWidth: 560, boxShadow: "var(--shadow-lg)" }}>
      <div className="section-header"><div><h2 className="section-title">Dispatch trip</h2><p className="section-sub">The server checks all three records together before committing the assignment.</p></div><button onClick={onClose} className="btn-ghost">✕</button></div>
      <form onSubmit={handleSubmit}>
        <SelectField label="Job" value={jobId} onChange={setJobId} options={jobs.map(j => ({ value: j.id, label: `${j.jobNumber} — ${j.customerName}` }))} />
        <SelectField label="Truck" value={truckId} onChange={setTruckId} options={trucks.map(t => ({ value: t.id, label: t.registrationNumber }))} />
        <SelectField label="Driver" value={driverId} onChange={setDriverId} options={drivers.map(d => ({ value: d.id, label: d.fullName }))} />
        {error && <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}>{error}</div>}
        <div className="form-actions" style={{ justifyContent: "flex-end" }}><button type="button" onClick={onClose} className="btn-ghost">Cancel</button><button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Dispatching…" : "Dispatch trip"}</button></div>
      </form>
    </div>
  </div>;
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <label className="form-group"><span className="field-label">{label}</span><select className="form-select" value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

function Skeleton() {
  return <div className="panel"><div className="list">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="list-row" style={{ minHeight: 62 }} />)}</div></div>;
}
