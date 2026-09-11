"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { tripsRepo, jobsRepo, trucksRepo, driversRepo } from "@/lib/firebase/modules";
import type { Trip, TripStatus, Job, Truck, Driver, BaseRecord } from "@/types/core";
import { Timestamp } from "firebase/firestore";

const STATUS_STYLE: Record<TripStatus, string> = {
  planned: "bg-slate-800 text-slate-400",
  en_route_pickup: "bg-sky-950/50 text-sky-300",
  loading: "bg-sky-950/50 text-sky-300",
  in_transit: "bg-emerald-950/50 text-emerald-300",
  unloading: "bg-sky-950/50 text-sky-300",
  completed: "bg-emerald-950/50 text-emerald-300",
  exception: "bg-red-950/50 text-red-300",
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
    const unsub = tripsRepo.subscribe(
      activeOrg.id,
      { environment: "LIVE", orderByField: "createdAt", orderDirection: "desc" },
      setTrips,
      (err) => setError(err.message)
    );
    return () => unsub();
  }, [activeOrg]);

  useEffect(() => {
    if (!activeOrg) return;
    Promise.all([
      jobsRepo.list(activeOrg.id, { environment: "LIVE" }),
      trucksRepo.list(activeOrg.id, { environment: "LIVE" }),
      driversRepo.list(activeOrg.id, { environment: "LIVE" }),
    ]).then(([jobs, trucksList, driversList]) => {
      setDispatchableJobs(jobs.filter((j) => j.status === "confirmed" || j.status === "dispatched"));
      setTrucks(trucksList.filter((t) => t.status === "available"));
      setDrivers(driversList.filter((d) => d.status === "available"));
    }).catch(() => {});
  }, [activeOrg, trips]);

  const advance = async (trip: Trip) => {
    if (!activeOrg || !user) return;
    const idx = STATUS_FLOW.indexOf(trip.status);
    const next = STATUS_FLOW[idx + 1];
    if (!next) return;
    const patch: Partial<Trip> = { status: next };
    if (next === "in_transit" && !trip.actualStart) patch.actualStart = Timestamp.now();
    if (next === "completed") patch.actualEnd = Timestamp.now();
    await tripsRepo.update(activeOrg.id, user.uid, trip.id, patch);
  };

  if (!activeOrg) return null;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-50">Trips</h1>
          <p className="mt-1 text-sm text-slate-400">Dispatch jobs to a truck and driver, then track progress.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          disabled={dispatchableJobs.length === 0 || trucks.length === 0 || drivers.length === 0}
          title={dispatchableJobs.length === 0 ? "No confirmed jobs to dispatch" : trucks.length === 0 ? "No available trucks" : drivers.length === 0 ? "No available drivers" : undefined}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          + Dispatch trip
        </button>
      </header>

      {error && <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}

      {trips === null ? (
        <Skeleton />
      ) : trips.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
          <p className="text-sm font-medium text-slate-200">No trips yet.</p>
          <p className="mt-1 text-sm text-slate-500">Dispatch a confirmed job to a truck and driver to create one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((t) => {
            const idx = STATUS_FLOW.indexOf(t.status);
            const canAdvance = t.status !== "exception" && idx >= 0 && idx < STATUS_FLOW.length - 1;
            return (
              <div key={t.id} className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-slate-100">
                    {t.jobNumber} · {t.truckRegistration} · {t.driverName}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{t.currentLocation ?? "No location update yet"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[t.status]}`}>
                    {t.status.replace(/_/g, " ")}
                  </span>
                  {canAdvance && (
                    <button
                      onClick={() => advance(t)}
                      className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      Advance →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <DispatchDialog
          orgId={activeOrg.id}
          jobs={dispatchableJobs}
          trucks={trucks}
          drivers={drivers}
          onClose={() => setShowCreate(false)}
          onCreated={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function DispatchDialog({
  orgId,
  jobs,
  trucks,
  drivers,
  onClose,
  onCreated,
}: {
  orgId: string;
  jobs: Job[];
  trucks: Truck[];
  drivers: Driver[];
  onClose: () => void;
  onCreated: () => void;
}) {
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
    if (!job || !truck || !driver) {
      setError("Select a job, truck, and driver.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Omit<Trip, keyof BaseRecord> = {
        jobId: job.id,
        jobNumber: job.jobNumber,
        truckId: truck.id,
        truckRegistration: truck.registrationNumber,
        driverId: driver.id,
        driverName: driver.fullName,
        status: "planned",
        plannedStart: job.requestedPickupDate,
        plannedEnd: job.requestedDeliveryDate,
        actualStart: null,
        actualEnd: null,
        currentLocation: job.origin,
        lastCheckpointAt: Timestamp.now(),
      };
      await tripsRepo.create(orgId, user.uid, payload, "LIVE");
      await jobsRepo.update(orgId, user.uid, job.id, { status: "dispatched" });
      await trucksRepo.update(orgId, user.uid, truck.id, { status: "on_trip", assignedDriverId: driver.id });
      await driversRepo.update(orgId, user.uid, driver.id, { status: "on_trip", assignedTruckId: truck.id });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dispatch trip.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-50">Dispatch trip</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <SelectField label="Job" value={jobId} onChange={setJobId} options={jobs.map((j) => ({ value: j.id, label: `${j.jobNumber} — ${j.customerName}` }))} />
          <SelectField label="Truck" value={truckId} onChange={setTruckId} options={trucks.map((t) => ({ value: t.id, label: t.registrationNumber }))} />
          <SelectField label="Driver" value={driverId} onChange={setDriverId} options={drivers.map((d) => ({ value: d.id, label: d.fullName }))} />

          {error && <div className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-60">
              {submitting ? "Dispatching…" : "Dispatch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-400">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-900" />
      ))}
    </div>
  );
}
