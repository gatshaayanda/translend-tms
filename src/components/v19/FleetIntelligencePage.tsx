"use client";

import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { tripsRepo, tripMetricsRepo, trucksRepo } from "@/lib/firebase/modules";
import type { Trip, Truck } from "@/types/core";
import type { TripMetrics } from "@/types/fleet";

export default function FleetIntelligencePage() {
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [metrics, setMetrics] = useState<TripMetrics[]>([]);
  const [selectedTripId, setSelectedTripId] = useState("");
  const [form, setForm] = useState({ loadedKm: "", emptyKm: "", plannedKm: "", progress: "", fuelLitres: "", fuelCost: "", revenue: "", notes: "" });
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!activeOrg) return;
    const orgId = activeOrg.id;
    const a = tripsRepo.subscribe(orgId, { environment: "LIVE" }, setTrips, (e) => setMessage(e.message));
    const b = trucksRepo.subscribe(orgId, { environment: "LIVE", orderByField: "registrationNumber" }, setTrucks);
    const c = tripMetricsRepo.subscribe(orgId, { environment: "LIVE", orderByField: "measuredAt", orderDirection: "desc" }, setMetrics, (e) => setMessage(e.message));
    return () => { a(); b(); c(); };
  }, [activeOrg]);

  const selectedTrip = trips.find((t) => t.id === selectedTripId) ?? trips[0];
  const selectedMetric = metrics.find((m) => m.tripId === selectedTrip?.id);
  const effectiveMetrics = useMemo(() => metrics, [metrics]);
  const loadedKm = effectiveMetrics.reduce((s, m) => s + m.loadedKm, 0);
  const emptyKm = effectiveMetrics.reduce((s, m) => s + m.emptyKm, 0);
  const fuelLitres = effectiveMetrics.reduce((s, m) => s + m.fuelLitres, 0);
  const fuelCost = effectiveMetrics.reduce((s, m) => s + m.fuelCost, 0);
  const revenue = effectiveMetrics.reduce((s, m) => s + m.revenueAmount, 0);
  const totalKm = loadedKm + emptyKm;
  const fuelPer100Km = totalKm > 0 ? (fuelLitres / totalKm) * 100 : null;
  const costPerKm = totalKm > 0 ? fuelCost / totalKm : null;
  const utilisation = totalKm > 0 ? (loadedKm / totalKm) * 100 : null;

  useEffect(() => {
    if (!selectedTrip && trips.length) setSelectedTripId(trips[0].id);
    if (selectedMetric) setForm({ loadedKm: String(selectedMetric.loadedKm), emptyKm: String(selectedMetric.emptyKm), plannedKm: String(selectedMetric.plannedKm), progress: String(selectedMetric.routeProgressPct), fuelLitres: String(selectedMetric.fuelLitres), fuelCost: String(selectedMetric.fuelCost), revenue: String(selectedMetric.revenueAmount), notes: selectedMetric.notes });
  }, [selectedTrip, selectedMetric, trips]);

  if (!activeOrg) return null;

  const save = async () => {
    if (!user || !selectedTrip) return;
    const n = (v: string) => Number(v || 0);
    const loaded = n(form.loadedKm); const empty = n(form.emptyKm); const planned = n(form.plannedKm);
    const payload = { tripId: selectedTrip.id, truckId: selectedTrip.truckId, truckRegistration: selectedTrip.truckRegistration, loadedKm: loaded, emptyKm: empty, plannedKm: planned, routeVarianceKm: loaded + empty - planned, routeProgressPct: Math.max(0, Math.min(100, n(form.progress))), fuelLitres: n(form.fuelLitres), fuelCost: n(form.fuelCost), revenueAmount: n(form.revenue), measuredAt: Timestamp.now(), source: "manual" as const, notes: form.notes.trim() };
    try {
      if (selectedMetric) await tripMetricsRepo.update(activeOrg.id, user.uid, selectedMetric.id, payload);
      else await tripMetricsRepo.create(activeOrg.id, user.uid, payload, "LIVE");
      setMessage("Trip intelligence saved to the live operational ledger.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed to save trip intelligence."); }
  };

  return <div className="space-y-6">
    <header className="page-header"><div><h1 className="page-title">Fleet Intelligence</h1><p className="page-subtitle">Distance, route progress, fuel efficiency, utilisation and trip profitability from persisted operational measurements.</p></div><span className="badge green">LIVE DATA</span></header>
    {message && <div className="notice blue">{message}</div>}
    <div className="kpi-grid">
      <Kpi label="Loaded KM" value={loadedKm.toLocaleString()} note="Persisted trip measurements" />
      <Kpi label="Empty KM" value={emptyKm.toLocaleString()} note="Deadhead distance" tone="orange" />
      <Kpi label="Utilisation" value={utilisation == null ? "—" : `${utilisation.toFixed(1)}%`} note="Loaded ÷ total measured KM" tone="green" />
      <Kpi label="Fuel / 100 KM" value={fuelPer100Km == null ? "—" : fuelPer100Km.toFixed(1)} note="Measured fuel efficiency" tone="blue" />
      <Kpi label="Fuel Cost / KM" value={costPerKm == null ? "—" : `${activeOrg.currency} ${costPerKm.toFixed(2)}`} note="Fuel cost ÷ measured KM" tone="orange" />
      <Kpi label="Route Revenue" value={revenue.toLocaleString()} note="Revenue linked to measured trips" tone="green" />
    </div>
    <section className="panel"><div className="section-header"><div><h2 className="section-title">Record trip intelligence</h2><p className="section-sub">Manual measurements are the honest bridge until GPS/telematics is connected. No location or distance is fabricated.</p></div></div>
      {!trips.length ? <div className="notice blue">No live trips exist yet. Dispatch a trip first.</div> : <>
        <div className="form-grid"><label className="form-group"><span className="field-label">Trip</span><select className="form-select" value={selectedTripId || selectedTrip?.id || ""} onChange={e => setSelectedTripId(e.target.value)}>{trips.map(t => <option key={t.id} value={t.id}>{t.jobNumber} · {t.truckRegistration}</option>)}</select></label>
          <Field label="Loaded KM" value={form.loadedKm} set={v => setForm({ ...form, loadedKm: v })} /><Field label="Empty KM" value={form.emptyKm} set={v => setForm({ ...form, emptyKm: v })} /><Field label="Planned KM" value={form.plannedKm} set={v => setForm({ ...form, plannedKm: v })} /><Field label="Route progress %" value={form.progress} set={v => setForm({ ...form, progress: v })} /><Field label="Fuel litres" value={form.fuelLitres} set={v => setForm({ ...form, fuelLitres: v })} /><Field label={`Fuel cost (${activeOrg.currency})`} value={form.fuelCost} set={v => setForm({ ...form, fuelCost: v })} /><Field label={`Trip revenue (${activeOrg.currency})`} value={form.revenue} set={v => setForm({ ...form, revenue: v })} /><Field label="Notes" value={form.notes} set={v => setForm({ ...form, notes: v })} /></div>
        <div className="form-row-actions"><button className="btn-primary" onClick={save}>Save trip intelligence</button></div>
      </>}
    </section>
    <section className="panel"><div className="section-header"><div><h2 className="section-title">Trip intelligence register</h2><p className="section-sub">Persisted measurements only.</p></div><span className="badge blue">{metrics.length} measured trips</span></div>
      {metrics.length ? <div className="list">{metrics.slice(0, 25).map(m => <div className="list-row" key={m.id}><div><strong>{m.truckRegistration} · {m.tripId.slice(0, 8)}</strong><div className="muted">{m.loadedKm + m.emptyKm} km total · {m.routeProgressPct}% progress · variance {m.routeVarianceKm.toFixed(1)} km</div></div><div className="text-right"><strong>{m.revenueAmount.toLocaleString()}</strong><div className="muted">{m.fuelCost.toLocaleString()} fuel</div></div></div>)}</div> : <div className="notice blue">No trip measurements have been recorded yet.</div>}
    </section>
    <section className="panel"><h2 className="section-title">Fleet coverage</h2><p className="section-sub">{trucks.length} live trucks are available for measurement. GPS/live positioning remains a separate integration and is not represented as live until a provider is connected.</p></section>
  </div>;
}

function Field({ label, value, set }: { label: string; value: string; set: (v: string) => void }) { return <label className="form-group"><span className="field-label">{label}</span><input className="form-input" value={value} onChange={e => set(e.target.value)} /></label>; }
function Kpi({ label, value, note, tone = "" }: { label: string; value: string; note: string; tone?: string }) { return <div className={`kpi-card ${tone}`}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-sub">{note}</div></div>; }
