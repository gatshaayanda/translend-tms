"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
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
    const orgId = activeOrg.id;
    let cancelled = false;

    async function load() {
      try {
        const [jobs, trips, trucks, drivers, deliveries] = await Promise.all([
          jobsRepo.list(orgId, { environment: "LIVE" }),
          tripsRepo.list(orgId, { environment: "LIVE" }),
          trucksRepo.list(orgId, { environment: "LIVE" }),
          driversRepo.list(orgId, { environment: "LIVE" }),
          deliveriesRepo.list(orgId, { environment: "LIVE" }),
        ]);
        if (!cancelled) setData({ jobs, trips, trucks, drivers, deliveries });
      } catch (err) {
        console.error("[ControlTowerPage] load failed:", err);
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load Control Tower data.");
      }
    }

    load();
    return () => { cancelled = true; };
  }, [activeOrg]);

  if (!activeOrg) return null;
  if (error) return <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}>{error}</div>;
  if (!data) return <PageSkeleton />;

  const now = Date.now();
  const activeTrips = data.trips.filter((t) => !["completed", "exception"].includes(t.status));
  const inTransit = data.trips.filter((t) => t.status === "in_transit");
  const jobsAwaitingDispatch = data.jobs.filter((j) => j.status === "confirmed");
  const delayedJobs = data.jobs.filter((j) => j.status !== "completed" && j.status !== "cancelled" && j.requestedDeliveryDate?.toMillis?.() < now);
  const trucksAvailable = data.trucks.filter((t) => t.status === "available");
  const trucksInMaintenance = data.trucks.filter((t) => t.status === "in_maintenance");
  const driversAvailable = data.drivers.filter((d) => d.status === "available");
  const exceptions = data.deliveries.filter((d) => d.status === "exception");
  const isEmptyWorkspace = data.jobs.length === 0 && data.trucks.length === 0 && data.drivers.length === 0 && data.trips.length === 0;

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div>
          <h1 className="page-title">Operations Hub</h1>
          <p className="page-subtitle">Live operational status for {activeOrg.name}.</p>
        </div>
        <span className="badge teal">Live data</span>
      </header>

      {isEmptyWorkspace ? (
        <EmptyWorkspaceState orgId={activeOrg.id} />
      ) : (
        <>
          <section className="kpi-grid">
            <StatCard label="Active trips" value={activeTrips.length} accent="teal" />
            <StatCard label="In transit" value={inTransit.length} accent="green" />
            <StatCard label="Awaiting dispatch" value={jobsAwaitingDispatch.length} accent="yellow" />
            <StatCard label="Delayed" value={delayedJobs.length} accent="red" />
            <StatCard label="Trucks available" value={trucksAvailable.length} accent="blue" />
            <StatCard label="In maintenance" value={trucksInMaintenance.length} accent="yellow" />
            <StatCard label="Drivers available" value={driversAvailable.length} accent="teal" />
            <StatCard label="POD exceptions" value={exceptions.length} accent="red" />
          </section>

          <section className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
            <Panel title="Needs attention" subtitle="Delayed jobs and delivery exceptions">
              {delayedJobs.length === 0 && exceptions.length === 0 ? (
                <EmptyRow text="Nothing needs attention right now." />
              ) : (
                <div className="list">
                  {delayedJobs.map((j) => (
                    <div key={j.id} className="list-row">
                      <div><strong>{j.jobNumber} — {j.customerName}</strong><span className="muted">Requested delivery date has passed.</span></div>
                      <span className="badge red">Delayed</span>
                    </div>
                  ))}
                  {exceptions.map((d) => (
                    <div key={d.id} className="list-row">
                      <div><strong>Delivery {d.id.slice(0, 6)}</strong><span className="muted">{d.exceptionReason ?? "Delivery exception requires review."}</span></div>
                      <span className="badge red">Exception</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="What's moving" subtitle="Trips currently in transit">
              {inTransit.length === 0 ? (
                <EmptyRow text="No trips are in transit right now." />
              ) : (
                <div className="list">
                  {inTransit.map((t) => (
                    <div key={t.id} className="list-row">
                      <div><strong>{t.truckRegistration} · {t.driverName}</strong><span className="muted">{t.jobNumber}</span></div>
                      <span className="badge green">{t.currentLocation ?? "Location pending"}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: "teal" | "green" | "yellow" | "red" | "blue" }) {
  return (
    <div className={`kpi-card ${accent === "yellow" ? "orange" : accent}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-sub">Live workspace count</div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <div className="panel"><h3>{title}</h3><p className="panel-sub">{subtitle}</p>{children}</div>;
}

function EmptyRow({ text }: { text: string }) {
  return <div className="empty-state" style={{ padding: 18 }}>{text}</div>;
}

function EmptyWorkspaceState({ orgId }: { orgId: string }) {
  return (
    <div className="empty-state">
      <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>Your workspace is empty.</p>
      <p style={{ marginTop: 5, color: "var(--ink-3)", fontSize: 12 }}>Add your first customer, truck, and driver to start seeing operational data here.</p>
      <Link href={`/${orgId}/customers`} className="btn-primary" style={{ marginTop: 16 }}>Add your first customer</Link>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div style={{ height: 24, width: 180, borderRadius: 8, background: "var(--surface-3)" }} />
      <div className="kpi-grid">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="kpi-card" style={{ minHeight: 92 }} />)}
      </div>
    </div>
  );
}
