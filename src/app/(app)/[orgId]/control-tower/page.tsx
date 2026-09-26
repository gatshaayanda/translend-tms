"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { jobsRepo, tripsRepo, trucksRepo, driversRepo, deliveriesRepo, deliveryNotesRepo, invoicesRepo } from "@/lib/firebase/modules";
import type { Job, Trip, Truck, Driver, Delivery, DeliveryNote } from "@/types/core";
import type { Invoice } from "@/types/finance";

interface SnapshotData {
  jobs: Job[];
  trips: Trip[];
  trucks: Truck[];
  drivers: Driver[];
  deliveries: Delivery[];
  deliveryNotes: DeliveryNote[];
  invoices: Invoice[];
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
          deliveryNotesRepo.list(orgId, { environment: "LIVE" }),
          invoicesRepo.list(orgId, { environment: "LIVE" }),
        ]);
        if (!cancelled) setData({ jobs, trips, trucks, drivers, deliveries, deliveryNotes, invoices });
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
  const podWaiting = data.deliveryNotes.filter((n) => n.podState !== "complete" && data.deliveries.some((d) => d.id === n.deliveryId && (d.status === "delivered" || d.status === "partial" || d.status === "exception")));
  const billingReady = data.deliveryNotes.filter((n) => n.podState === "complete" && !data.invoices.some((i) => i.deliveryNoteId === n.id));
  const overdueInvoices = data.invoices.filter((i) => i.status === "issued" && i.dueAt && i.dueAt.toMillis() < now);
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

          <section className="panel">
            <div className="section-header"><div><h3>Next actions</h3><p className="panel-sub">Work that can move the operation forward now.</p></div></div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <ActionCard href={`/${activeOrg.id}/jobs`} label="Dispatch confirmed jobs" count={jobsAwaitingDispatch.length} detail="Confirmed jobs without a completed dispatch." tone="yellow" />
              <ActionCard href={`/${activeOrg.id}/pod-queue`} label="Complete POD" count={podWaiting.length} detail="Delivered work still missing completed evidence." tone="red" />
              <ActionCard href={`/${activeOrg.id}/invoicing`} label="Raise invoices" count={billingReady.length} detail="Completed PODs that are ready for billing." tone="green" />
            </div>
            {overdueInvoices.length > 0 && <div className="notice" style={{ marginTop: 14, borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}><strong>{overdueInvoices.length} invoice{overdueInvoices.length === 1 ? "" : "s"} overdue.</strong> Review receivables in <Link href={`/${activeOrg.id}/business-controls`} style={{ textDecoration: "underline" }}>Business Controls</Link>.</div>}
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

function ActionCard({ href, label, count, detail, tone }: { href: string; label: string; count: number; detail: string; tone: "yellow" | "red" | "green" }) {
  return <Link href={href} className="list-row" style={{ display: "block", textDecoration: "none", border: "1px solid var(--border)", borderRadius: 10 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}><div><strong>{label}</strong><span className="muted">{detail}</span></div><span className={`badge ${tone}`}>{count}</span></div>
  </Link>;
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
