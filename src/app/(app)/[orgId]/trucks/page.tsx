"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { deliveryNotesRepo, trucksRepo, tripsRepo } from "@/lib/firebase/modules";
import type { BaseRecord, DeliveryNote, Trip, Truck, TruckStatus } from "@/types/core";

const STATUS_STYLE: Record<TruckStatus, string> = {
  available: "green",
  on_trip: "blue",
  in_maintenance: "yellow",
  out_of_service: "red",
};

const tripLabel = (status: Trip["status"]) => {
  switch (status) {
    case "completed": return "Completed";
    case "exception": return "Alert";
    case "in_transit": return "In progress";
    case "en_route_pickup": return "En route";
    case "loading": return "Loading";
    case "unloading": return "Unloading";
    default: return "Scheduled";
  }
};

const dateText = (value: Trip["plannedStart"]) => value.toDate().toLocaleDateString("en-BW", { day: "2-digit", month: "short", year: "numeric" });

export default function TrucksPage() {
  const router = useRouter();
  const { activeOrg } = useWorkspace();
  const [trucks, setTrucks] = useState<Truck[] | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTruckId, setSelectedTruckId] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    if (!activeOrg) return;
    const orgId = activeOrg.id;
    const unsubTrucks = trucksRepo.subscribe(orgId, { environment: "LIVE", orderByField: "registrationNumber" }, setTrucks, (err) => setError(err.message));
    const unsubTrips = tripsRepo.subscribe(orgId, { environment: "LIVE" }, setTrips, (err) => setError(err.message));
    const unsubNotes = deliveryNotesRepo.subscribe(orgId, { environment: "LIVE" }, setDeliveryNotes, (err) => setError(err.message));
    return () => { unsubTrucks(); unsubTrips(); unsubNotes(); };
  }, [activeOrg]);

  const visibleTrips = useMemo(() => trips.filter((trip) => {
    const truckMatch = selectedTruckId === "all" || trip.truckId === selectedTruckId;
    const dateMatch = !selectedDate || trip.plannedStart.toDate().toISOString().slice(0, 10) === selectedDate;
    return truckMatch && dateMatch;
  }), [trips, selectedTruckId, selectedDate]);

  const activeTrips = trips.filter((trip) => trip.status !== "completed");
  const exceptionTrips = trips.filter((trip) => trip.status === "exception");
  const podComplete = deliveryNotes.filter((note) => note.podState === "complete").length;
  const podPending = Math.max(deliveryNotes.length - podComplete, 0);
  const currentMonthTrips = trips.filter((trip) => {
    const now = new Date();
    const d = trip.plannedStart.toDate();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });

  if (!activeOrg) return null;

  return (
    <div className="space-y-6">
      <header className="page-header">
        <div>
          <h1 className="page-title">Fleet &amp; Live Map</h1>
          <p className="page-subtitle">Truck Division · Live movement, route progress, service alerts and trip history</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge green">LIVE DATA</span>
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ New truck</button>
        </div>
      </header>

      {error && <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}>{error}</div>}

      <section className="kpi-grid">
        <Metric label="Active Trucks" value={activeTrips.length || trucks?.filter(t => t.status === "on_trip").length || 0} note={`${trucks?.filter(t => t.status === "on_trip").length || 0} currently assigned · ${trucks?.filter(t => t.status === "available").length || 0} available`} tone="teal" />
        <Metric label="Loaded KM Today" value="—" note="Database still being configured" tone="blue" />
        <Metric label="Empty KM Today" value="—" note="Database still being configured" tone="orange" />
        <Metric label="PODs Captured" value={`${podComplete}/${deliveryNotes.length}`} note={`${podPending} awaiting completion`} tone="green" />
        <Metric label="Route Alerts" value={exceptionTrips.length} note={exceptionTrips.length ? "Trip exceptions requiring review" : "No live trip exceptions"} tone={exceptionTrips.length ? "red" : "green"} />
      </section>

      <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
        <div className="section-header" style={{ padding: "20px 22px 14px", marginBottom: 0 }}>
          <div><h2 className="section-title">Live Fleet Map</h2><p className="section-sub">Live position of active trucks, pickup dwell time and delivery ETA.</p></div>
          <span className="badge green">Live operational feed</span>
        </div>
        <div style={{ position: "relative", minHeight: 310, background: "linear-gradient(135deg, var(--teal-50), var(--cream), var(--surface-3))", borderTop: "1px solid var(--divider)", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, opacity: .55, backgroundImage: "linear-gradient(rgba(12,108,125,.10) 1px, transparent 1px), linear-gradient(90deg, rgba(12,108,125,.10) 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
          <div style={{ position: "relative", padding: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            {(trucks || []).slice(0, 6).map((truck, index) => {
              const trip = activeTrips.find(t => t.truckId === truck.id);
              const left = [10, 28, 46, 63, 77, 86][index] || 50;
              const top = [58, 30, 70, 43, 23, 67][index] || 50;
              return <div key={truck.id} style={{ position: "absolute", left: `${left}%`, top: `${top}%`, transform: "translate(-50%,-50%)", minWidth: 150 }}>
                <div className="panel" style={{ padding: 12, boxShadow: "var(--shadow-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><strong style={{ fontSize: 12 }}>{truck.registrationNumber}</strong><span className={`badge ${STATUS_STYLE[truck.status]}`}>{truck.status.replaceAll("_", " ")}</span></div>
                  <div style={{ color: "var(--ink-3)", fontSize: 10.5, marginTop: 7 }}>{trip?.currentLocation || (trip ? "Trip in progress" : "No active trip")}</div>
                  {trip && <div style={{ color: "var(--teal)", fontSize: 10.5, fontWeight: 700, marginTop: 5 }}>{tripLabel(trip.status)}</div>}
                </div>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: truck.status === "out_of_service" ? "var(--red)" : truck.status === "in_maintenance" ? "var(--orange)" : "var(--teal)", border: "3px solid white", boxShadow: "0 2px 8px rgba(14,42,48,.18)", margin: "-4px auto 0" }} />
              </div>;
            })}
            {!trucks?.length && <DatabaseNotice title="Live map data is not configured yet" body="The map surface is ready, but live GPS coordinates are not part of the current Firestore truck/trip schema." />}
          </div>
          <div style={{ position: "absolute", left: 20, bottom: 18, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["Depot · Gaborone West", "Kgale Quarry", "A1 Corridor", "Lobatse Site", "Mogoditshane Site"] as const).map(label => <span key={label} className="badge" style={{ background: "rgba(255,255,255,.92)", border: "1px solid var(--border)", color: "var(--ink-2)" }}>{label}</span>)}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-header">
          <div><h2 className="section-title">Trip Lookup</h2><p className="section-sub">Pick a truck and date to see trip logs and push data into fuel, delivery note or cost-per-km workflows.</p></div>
          <div className="flex gap-2"><select className="form-input" value={selectedTruckId} onChange={e => setSelectedTruckId(e.target.value)} style={{ minWidth: 150 }}><option value="all">All trucks</option>{trucks?.map(t => <option key={t.id} value={t.id}>{t.registrationNumber}</option>)}</select><input className="form-input" type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
        </div>
        {visibleTrips.length ? <div className="list">{visibleTrips.slice(0, 12).map(trip => <div className="list-row" key={trip.id}>
          <div style={{ minWidth: 0 }}><div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><strong>{trip.jobNumber || trip.id.slice(0, 10)}</strong><span className={`badge ${trip.status === "exception" ? "red" : trip.status === "completed" ? "green" : "blue"}`}>{tripLabel(trip.status)}</span></div><div className="muted">{trip.truckRegistration} · {trip.currentLocation || "Location not recorded"} · planned {dateText(trip.plannedStart)}</div></div><div className="flex gap-2"><button className="btn-secondary" type="button" onClick={() => router.push(`/fuel-workshop?truckId=${encodeURIComponent(trip.truckId)}&tripId=${encodeURIComponent(trip.id)}`)}>Pre-fill Fuel Log</button><button className="btn-secondary" type="button" onClick={() => router.push(`/deliveries?tripId=${encodeURIComponent(trip.id)}`)}>Pre-fill Delivery Note</button><button className="btn-ghost" type="button" onClick={() => router.push(`/trips?tripId=${encodeURIComponent(trip.id)}`)}>Open Trip Sheet</button></div>
        </div>)}</div> : <DatabaseNotice title="No matching trip records" body="Try another truck/date, or add trips through the existing Trips workflow." />}
      </section>

      <section className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
        <div className="panel">
          <div className="section-header"><div><h2 className="section-title">Revenue KM vs Empty KM</h2><p className="section-sub">Monthly distance split used for utilisation and deadhead control.</p></div><span className="badge blue">{currentMonthTrips.length} live trips this month</span></div>
          <DatabaseNotice title="Distance ledger still being configured" body="The current Trip schema records route, status and timing, but does not persist loaded/empty kilometre values. No fixture chart is presented as live data." />
          <div className="flex gap-2 flex-wrap" style={{ marginTop: 16 }}>{["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"].map(month => <span key={month} className="badge" style={{ background: "var(--surface-3)", border: "1px solid var(--divider)" }}>{month}</span>)}</div>
        </div>
        <div className="panel">
          <div className="section-header"><div><h2 className="section-title">Route Profitability</h2><p className="section-sub">Gross margin, BWP/km and evidence status by route.</p></div></div>
          <DatabaseNotice title="Finance data still being configured" body="Revenue, cost/km and gross-margin fields are not persisted in the current Firestore engine. This surface will use real finance records when that domain exists." />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-[14px] lg:grid-cols-2">
        <div className="panel"><h2 className="section-title">Fleet Status</h2><p className="section-sub">Current live vehicle distribution.</p><div className="list" style={{ marginTop: 14 }}>{(["available", "on_trip", "in_maintenance", "out_of_service"] as TruckStatus[]).map(status => { const count = trucks?.filter(t => t.status === status).length || 0; const pct = trucks?.length ? Math.round(count / trucks.length * 100) : 0; return <div className="list-row" key={status}><div><strong>{status.replaceAll("_", " ")}</strong><div className="muted">{count} vehicles · {pct}% of fleet</div></div><span className={`badge ${STATUS_STYLE[status]}`}>{count}</span></div>; })}</div></div>
        <div className="panel"><h2 className="section-title">Dispatch Review</h2><p className="section-sub">Live exceptions and operational attention points.</p><div className="list" style={{ marginTop: 14 }}>
          {exceptionTrips.length ? exceptionTrips.slice(0, 5).map(trip => <div className="list-row" key={trip.id}><div><strong>Route Variance · {trip.truckRegistration}</strong><div className="muted">{trip.currentLocation || "Trip exception recorded"} · review dispatch before close-out</div></div><span className="badge red">Alert</span></div>) : <div className="list-row"><div><strong>No route exceptions</strong><div className="muted">The live trip feed currently reports no exception status.</div></div><span className="badge green">Clear</span></div>}
          <div className="list-row"><div><strong>POD Review</strong><div className="muted">{podPending} delivery notes currently need POD completion.</div></div><span className={`badge ${podPending ? "yellow" : "green"}`}>{podPending ? "Review" : "Clear"}</span></div>
        </div></div>
      </section>

      {showCreate && <TruckFormDialog orgId={activeOrg.id} onClose={() => setShowCreate(false)} onCreated={() => setShowCreate(false)} />}
    </div>
  );
}

function Metric({ label, value, note, tone }: { label: string; value: number | string; note: string; tone: "teal" | "green" | "blue" | "orange" | "red" }) {
  return <div className={`kpi-card ${tone}`}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-sub">{note}</div></div>;
}

function DatabaseNotice({ title, body }: { title: string; body: string }) {
  return <div className="notice blue" style={{ marginTop: 12 }}><strong>{title}</strong><div style={{ marginTop: 4 }}>{body}</div></div>;
}

function TruckFormDialog({ orgId, onClose, onCreated }: { orgId: string; onClose: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ registrationNumber: "", make: "", model: "", year: new Date().getFullYear(), vinNumber: "", capacityTons: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); if (!user) return;
    if (!form.registrationNumber.trim()) { setError("Registration number is required."); return; }
    setSubmitting(true); setError(null);
    try {
      const payload: Omit<Truck, keyof BaseRecord> = { registrationNumber: form.registrationNumber.trim().toUpperCase(), make: form.make.trim(), model: form.model.trim(), year: Number(form.year), vinNumber: form.vinNumber.trim(), capacityTons: Number(form.capacityTons), fuelType: "diesel", status: "available", odometerKm: 0, assignedDriverId: null, complianceExpiryDates: { licenseDisc: null, roadworthy: null, insurance: null }, notes: "" };
      await trucksRepo.create(orgId, user.uid, payload, "LIVE"); onCreated();
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to create truck."); } finally { setSubmitting(false); }
  };
  return <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-4"><div className="form-card" style={{ width: "100%", maxWidth: 560, boxShadow: "var(--shadow-lg)" }}><div className="section-header"><div><h2 className="section-title">New truck</h2><p className="section-sub">Add a vehicle to the live fleet register.</p></div><button onClick={onClose} className="btn-ghost">✕</button></div><form onSubmit={handleSubmit}><Field label="Registration number" required><input value={form.registrationNumber} onChange={e => setForm(f => ({ ...f, registrationNumber: e.target.value }))} className="form-input" /></Field><div className="form-grid"><Field label="Make"><input value={form.make} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} className="form-input" /></Field><Field label="Model"><input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} className="form-input" /></Field></div><div className="form-grid"><Field label="Year"><input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))} className="form-input" /></Field><Field label="Capacity (tons)"><input type="number" value={form.capacityTons} onChange={e => setForm(f => ({ ...f, capacityTons: Number(e.target.value) }))} className="form-input" /></Field></div><Field label="VIN number"><input value={form.vinNumber} onChange={e => setForm(f => ({ ...f, vinNumber: e.target.value }))} className="form-input" /></Field>{error && <div className="notice" style={{ borderColor: "#F3C3C3", background: "var(--red-100)", color: "#902323" }}>{error}</div>}<div className="form-actions" style={{ justifyContent: "flex-end" }}><button type="button" onClick={onClose} className="btn-ghost">Cancel</button><button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Creating…" : "Create truck"}</button></div></form></div></div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) { return <label className="form-group"><span className="field-label">{label}{required && <span style={{ color: "var(--red)" }}> *</span>}</span>{children}</label>; }
