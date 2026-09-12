"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { trucksRepo } from "@/lib/firebase/modules";
import type { Truck, TruckStatus, BaseRecord } from "@/types/core";

const STATUS_STYLE: Record<TruckStatus, string> = {
  available: "green",
  on_trip: "blue",
  in_maintenance: "yellow",
  out_of_service: "red",
};

export default function TrucksPage() {
  const { activeOrg } = useWorkspace();
  const [trucks, setTrucks] = useState<Truck[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!activeOrg) return;
    const unsub = trucksRepo.subscribe(
      activeOrg.id,
      { environment: "LIVE", orderByField: "registrationNumber" },
      setTrucks,
      (err) => setError(err.message)
    );
    return () => unsub();
  }, [activeOrg]);

  if (!activeOrg) return null;

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div><h1 className="page-title">Fleet &amp; Live Map</h1><p className="page-subtitle">Your fleet, and where each vehicle stands.</p></div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ New truck</button>
      </header>

      {error && <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}>{error}</div>}

      {trucks === null ? (
        <Skeleton />
      ) : trucks.length === 0 ? (
        <EmptyState onCreate={() => setShowCreate(true)} />
      ) : (
        <>
          <section className="kpi-grid">
            <div className="kpi-card teal"><div className="kpi-label">Fleet size</div><div className="kpi-value">{trucks.length}</div><div className="kpi-sub">Vehicles in LIVE workspace</div></div>
            <div className="kpi-card green"><div className="kpi-label">Available</div><div className="kpi-value">{trucks.filter(t => t.status === "available").length}</div><div className="kpi-sub">Ready for dispatch</div></div>
            <div className="kpi-card blue"><div className="kpi-label">On trip</div><div className="kpi-value">{trucks.filter(t => t.status === "on_trip").length}</div><div className="kpi-sub">Currently assigned</div></div>
            <div className="kpi-card orange"><div className="kpi-label">Maintenance</div><div className="kpi-value">{trucks.filter(t => t.status === "in_maintenance").length}</div><div className="kpi-sub">Workshop attention</div></div>
          </section>
          <section className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">
            {trucks.map((t) => (
              <article key={t.id} className="vehicle-card">
                <div className="vehicle-card-top"><span className="vehicle-plate">{t.registrationNumber}</span><span className={`badge ${STATUS_STYLE[t.status]}`}>{t.status.replace(/_/g, " ")}</span></div>
                <div><div className="vehicle-name">{t.make} {t.model} · {t.year}</div><div className="vehicle-revenue">{t.capacityTons}t</div><div className="vehicle-month">capacity · {t.odometerKm.toLocaleString()} km odometer</div></div>
                <div className="vehicle-status-row"><div className="progress-bar"><div className={`progress-fill ${t.status === "available" ? "fill-green" : t.status === "in_maintenance" ? "fill-yellow" : t.status === "out_of_service" ? "fill-red" : "fill-blue"}`} style={{ width: t.status === "available" ? "100%" : t.status === "on_trip" ? "72%" : t.status === "in_maintenance" ? "42%" : "18%" }} /></div></div>
              </article>
            ))}
          </section>
        </>
      )}

      {showCreate && <TruckFormDialog orgId={activeOrg.id} onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />}
    </div>
  );
}

function TruckFormDialog({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ registrationNumber: "", make: "", model: "", year: new Date().getFullYear(), vinNumber: "", capacityTons: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.registrationNumber.trim()) { setError("Registration number is required."); return; }
    setSubmitting(true); setError(null);
    try {
      const payload: Omit<Truck, keyof BaseRecord> = {
        registrationNumber: form.registrationNumber.trim().toUpperCase(), make: form.make.trim(), model: form.model.trim(), year: Number(form.year), vinNumber: form.vinNumber.trim(), capacityTons: Number(form.capacityTons), fuelType: "diesel", status: "available", odometerKm: 0, assignedDriverId: null, complianceExpiryDates: { licenseDisc: null, roadworthy: null, insurance: null }, notes: "",
      };
      await trucksRepo.create(orgId, user.uid, payload, "LIVE"); onCreated();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to create truck."); } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4">
      <div className="form-card" style={{ width: "100%", maxWidth: 560, boxShadow: "var(--shadow-lg)" }}>
        <div className="section-header"><div><h2 className="section-title">New truck</h2><p className="section-sub">Add a vehicle to the live fleet register.</p></div><button onClick={onClose} className="btn-ghost">✕</button></div>
        <form onSubmit={handleSubmit}>
          <Field label="Registration number" required><input value={form.registrationNumber} onChange={(e) => setForm(f => ({ ...f, registrationNumber: e.target.value }))} className="form-input" /></Field>
          <div className="form-grid"><Field label="Make"><input value={form.make} onChange={(e) => setForm(f => ({ ...f, make: e.target.value }))} className="form-input" /></Field><Field label="Model"><input value={form.model} onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))} className="form-input" /></Field></div>
          <div className="form-grid"><Field label="Year"><input type="number" value={form.year} onChange={(e) => setForm(f => ({ ...f, year: Number(e.target.value) }))} className="form-input" /></Field><Field label="Capacity (tons)"><input type="number" value={form.capacityTons} onChange={(e) => setForm(f => ({ ...f, capacityTons: Number(e.target.value) }))} className="form-input" /></Field></div>
          <Field label="VIN number"><input value={form.vinNumber} onChange={(e) => setForm(f => ({ ...f, vinNumber: e.target.value }))} className="form-input" /></Field>
          {error && <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}>{error}</div>}
          <div className="form-actions" style={{ justifyContent: "flex-end" }}><button type="button" onClick={onClose} className="btn-ghost">Cancel</button><button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Creating…" : "Create truck"}</button></div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <label className="form-group"><span className="field-label">{label}{required && <span style={{ color: "var(--red)" }}> *</span>}</span>{children}</label>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return <div className="empty-state"><p style={{ fontSize: 14, fontWeight: 700 }}>No trucks yet.</p><p style={{ marginTop: 5, color: "var(--ink-3)", fontSize: 12 }}>Add your first vehicle to start assigning trips.</p><button onClick={onCreate} className="btn-primary" style={{ marginTop: 16 }}>+ New truck</button></div>;
}

function Skeleton() {
  return <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="vehicle-card" style={{ minHeight: 170 }} />)}</div>;
}
