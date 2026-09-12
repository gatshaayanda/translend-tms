"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { tripsRepo, jobsRepo, trucksRepo, driversRepo } from "@/lib/firebase/modules";
import type { Trip, TripStatus, Job, Truck, Driver, BaseRecord } from "@/types/core";
import { Timestamp } from "firebase/firestore";

const STATUS_STYLE: Record<TripStatus, string> = {
  planned: "gray",
  en_route_pickup: "blue",
  loading: "blue",
  in_transit: "green",
  unloading: "blue",
  completed: "green",
  exception: "red",
};
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

  useEffect(() => {
    if (!activeOrg) return;
    const orgId = activeOrg.id;
    const unsub = tripsRepo.subscribe(orgId, { environment: "LIVE", orderByField: "createdAt", orderDirection: "desc" }, setTrips, (err) => setError(err.message));
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
      setDispatchableJobs(jobs.filter((j) => j.status === "confirmed" || j.status === "dispatched"));
      setTrucks(trucksList.filter((t) => t.status === "available"));
      setDrivers(driversList.filter((d) => d.status === "available"));
    }).catch(() => {});
  }, [activeOrg, trips]);

  const advance = async (trip: Trip) => {
    if (!activeOrg || !user) return;
    const orgId = activeOrg.id;
    const idx = STATUS_FLOW.indexOf(trip.status);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return;
    const patch: Partial<Trip> = { status: next };
    if (next === "in_transit" && !trip.actualStart) patch.actualStart = Timestamp.now();
    if (next === "completed") patch.actualEnd = Timestamp.now();
    await tripsRepo.update(orgId, user.uid, trip.id, patch);
  };

  if (!activeOrg) return null;

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div><h1 className="page-title">Trips</h1><p className="page-subtitle">Dispatch jobs to a truck and driver, then track progress.</p></div>
        <button onClick={() => setShowCreate(true)} disabled={dispatchableJobs.length === 0 || trucks.length === 0 || drivers.length === 0} className="btn-primary">+ Dispatch trip</button>
      </header>

      {error && <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}>{error}</div>}

      {trips === null ? <Skeleton /> : trips.length === 0 ? (
        <div className="empty-state"><p style={{ fontSize: 14, fontWeight: 700 }}>No trips yet.</p><p style={{ marginTop: 5, color: "var(--ink-3)", fontSize: 12 }}>Dispatch a confirmed job to a truck and driver to create one.</p></div>
      ) : (
        <section className="panel">
          <div className="section-header"><div><h2 className="section-title">Trip register</h2><p className="section-sub">Live dispatch and movement state.</p></div><span className="badge teal">{trips.length} records</span></div>
          <div className="list">
            {trips.map((t) => {
              const idx = STATUS_FLOW.indexOf(t.status);
              const canAdvance = t.status !== "exception" && idx >= 0 && idx < STATUS_FLOW.length - 1;
              return (
                <div key={t.id} className="list-row" style={{ alignItems: "center" }}>
                  <div><strong>{t.jobNumber} · {t.truckRegistration} · {t.driverName}</strong><span className="muted">{t.currentLocation ?? "No location update yet"}</span></div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span className={`badge ${STATUS_STYLE[t.status]}`}>{t.status.replace(/_/g, " ")}</span>
                    {canAdvance && <button onClick={() => advance(t)} className="btn-ghost" style={{ padding: "6px 10px", fontSize: 11 }}>Advance →</button>}
                  </div>
                </div>
              );
            })}
          </div>
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
    if (!user) return;
    const job = jobs.find((j) => j.id === jobId);
    const truck = trucks.find((t) => t.id === truckId);
    const driver = drivers.find((d) => d.id === driverId);
    if (!job || !truck || !driver) { setError("Select a job, truck, and driver."); return; }
    setSubmitting(true); setError(null);
    try {
      const payload: Omit<Trip, keyof BaseRecord> = {
        jobId: job.id, jobNumber: job.jobNumber, truckId: truck.id, truckRegistration: truck.registrationNumber, driverId: driver.id, driverName: driver.fullName, status: "planned", plannedStart: job.requestedPickupDate, plannedEnd: job.requestedDeliveryDate, actualStart: null, actualEnd: null, currentLocation: job.origin, lastCheckpointAt: Timestamp.now(),
      };
      await tripsRepo.create(orgId, user.uid, payload, "LIVE");
      await jobsRepo.update(orgId, user.uid, job.id, { status: "dispatched" });
      await trucksRepo.update(orgId, user.uid, truck.id, { status: "on_trip", assignedDriverId: driver.id });
      await driversRepo.update(orgId, user.uid, driver.id, { status: "on_trip", assignedTruckId: truck.id });
      onCreated();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to dispatch trip."); } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="form-card" style={{ width: "100%", maxWidth: 560, boxShadow: "var(--shadow-lg)" }}>
        <div className="section-header"><div><h2 className="section-title">Dispatch trip</h2><p className="section-sub">Assign a confirmed job to a truck and driver.</p></div><button onClick={onClose} className="btn-ghost">✕</button></div>
        <form onSubmit={handleSubmit}>
          <SelectField label="Job" value={jobId} onChange={setJobId} options={jobs.map(j => ({ value: j.id, label: `${j.jobNumber} — ${j.customerName}` }))} />
          <SelectField label="Truck" value={truckId} onChange={setTruckId} options={trucks.map(t => ({ value: t.id, label: t.registrationNumber }))} />
          <SelectField label="Driver" value={driverId} onChange={setDriverId} options={drivers.map(d => ({ value: d.id, label: d.fullName }))} />
          {error && <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}>{error}</div>}
          <div className="form-actions" style={{ justifyContent: "flex-end" }}><button type="button" onClick={onClose} className="btn-ghost">Cancel</button><button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Dispatching…" : "Dispatch trip"}</button></div>
        </form>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return <label className="form-group"><span className="field-label">{label}</span><select className="form-select" value={value} onChange={e => onChange(e.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

function Skeleton() {
  return <div className="panel"><div className="list">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="list-row" style={{ minHeight: 62 }} />)}</div></div>;
}
