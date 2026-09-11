"use client";

// =============================================================
// Control Tower — /(app)/[orgId]/control-tower
// =============================================================
// The operational home. Answers, from real workspace data:
//   - What is happening?    -> active trips feed
//   - What needs attention? -> exceptions + delayed jobs
//   - What is moving?       -> in-transit trip count/list
//   - What is delayed?      -> jobs past requested delivery date
//   - What requires action? -> jobs awaiting dispatch
//
// This queries live Firestore data (LIVE environment only, scoped
// to the active org) — there is no mock/sample data path here. An
// empty workspace renders honest empty states, not fixture rows.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { jobsRepo, tripsRepo, trucksRepo, driversRepo, deliveriesRepo } from "@/lib/firebase/modules";
import type { Job, Trip, Truck, Driver, Delivery } from "@/types/core";

interface SnapshotData {
  jobs: Job[];
  trips: Trip[];
  trucks: Truck[];
  drivers: Driver[];
  deliveries: Delivery[];
}

export default function ControlTowerPage() {
  const { activeOrg } = useWorkspace();
  const [data, setData] = useState<SnapshotData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrg) return;
    let cancelled = false;

    async function load() {
      try {
        const [jobs, trips, trucks, drivers, deliveries] = await Promise.all([
          jobsRepo.list(activeOrg!.id, { environment: "LIVE" }),
          tripsRepo.list(activeOrg!.id, { environment: "LIVE" }),
          trucksRepo.list(activeOrg!.id, { environment: "LIVE" }),
          driversRepo.list(activeOrg!.id, { environment: "LIVE" }),
          deliveriesRepo.list(activeOrg!.id, { environment: "LIVE" }),
        ]);
        if (!cancelled) setData({ jobs, trips, trucks, drivers, deliveries });
      } catch (err) {
        console.error("[ControlTowerPage] load failed:", err);
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load Control Tower data.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [activeOrg]);

  if (error) {
    return (
      <div className="rounded-md border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!data) {
    return <PageSkeleton />;
  }

  const now = Date.now();
  const activeTrips = data.trips.filter((t) => !["completed", "exception"].includes(t.status));
  const inTransit = data.trips.filter((t) => t.status === "in_transit");
  const jobsAwaitingDispatch = data.jobs.filter((j) => j.status === "confirmed");
  const delayedJobs = data.jobs.filter(
    (j) => j.status !== "completed" && j.status !== "cancelled" && j.requestedDeliveryDate?.toMillis?.() < now
  );
  const trucksAvailable = data.trucks.filter((t) => t.status === "available");
  const trucksInMaintenance = data.trucks.filter((t) => t.status === "in_maintenance");
  const driversAvailable = data.drivers.filter((d) => d.status === "available");
  const exceptions = data.deliveries.filter((d) => d.status === "exception");

  const isEmptyWorkspace =
    data.jobs.length === 0 && data.trucks.length === 0 && data.drivers.length === 0 && data.trips.length === 0;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold text-slate-50">Control Tower</h1>
        <p className="mt-1 text-sm text-slate-400">Live operational status for {activeOrg?.name}.</p>
      </header>

      {isEmptyWorkspace ? (
        <EmptyWorkspaceState orgId={activeOrg!.id} />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Active trips" value={activeTrips.length} accent="sky" />
            <StatCard label="In transit" value={inTransit.length} accent="emerald" />
            <StatCard label="Awaiting dispatch" value={jobsAwaitingDispatch.length} accent="amber" />
            <StatCard label="Delayed" value={delayedJobs.length} accent="red" />
            <StatCard label="Trucks available" value={trucksAvailable.length} accent="slate" />
            <StatCard label="In maintenance" value={trucksInMaintenance.length} accent="slate" />
            <StatCard label="Drivers available" value={driversAvailable.length} accent="slate" />
            <StatCard label="POD exceptions" value={exceptions.length} accent="red" />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Panel title="Needs attention" subtitle="Delayed jobs and delivery exceptions">
              {delayedJobs.length === 0 && exceptions.length === 0 ? (
                <EmptyRow text="Nothing needs attention right now." />
              ) : (
                <ul className="divide-y divide-slate-800">
                  {delayedJobs.map((j) => (
                    <li key={j.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-slate-200">
                        {j.jobNumber} — {j.customerName}
                      </span>
                      <span className="rounded-full bg-red-950/50 px-2 py-0.5 text-xs text-red-300">Delayed</span>
                    </li>
                  ))}
                  {exceptions.map((d) => (
                    <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-slate-200">Delivery {d.id.slice(0, 6)}</span>
                      <span className="rounded-full bg-red-950/50 px-2 py-0.5 text-xs text-red-300">
                        {d.exceptionReason ?? "Exception"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="What's moving" subtitle="Trips currently in transit">
              {inTransit.length === 0 ? (
                <EmptyRow text="No trips are in transit right now." />
              ) : (
                <ul className="divide-y divide-slate-800">
                  {inTransit.map((t) => (
                    <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="text-slate-200">
                        {t.truckRegistration} · {t.driverName}
                      </span>
                      <span className="text-xs text-slate-500">{t.currentLocation ?? "Location pending"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: "sky" | "emerald" | "amber" | "red" | "slate" }) {
  const accentClass = {
    sky: "text-sky-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    slate: "text-slate-300",
  }[accent];
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
      <p className="mb-2 text-xs text-slate-500">{subtitle}</p>
      {children}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="py-4 text-sm text-slate-500">{text}</p>;
}

function EmptyWorkspaceState({ orgId }: { orgId: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
      <p className="text-sm font-medium text-slate-200">Your workspace is empty.</p>
      <p className="mt-1 text-sm text-slate-500">
        Add your first customer, truck, and driver to start seeing operational data here.
      </p>
      <Link
        href={`/${orgId}/customers`}
        className="mt-4 inline-block rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        Add your first customer
      </Link>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-40 animate-pulse rounded bg-slate-900" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-900" />
        ))}
      </div>
    </div>
  );
}
