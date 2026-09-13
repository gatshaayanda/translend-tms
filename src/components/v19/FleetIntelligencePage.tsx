"use client";
import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { tripsRepo, trucksRepo, tripMetricsRepo, fuelLogsRepo, truckLocationEventsRepo } from "@/lib/firebase/modules";
import type { Trip, Truck } from "@/types/core";
import type { TripMetrics } from "@/types/fleet";
import type { FuelLog } from "@/types/finance";
import type { TruckLocationEvent } from "@/types/location";
import { LocationCapturePanel } from "@/components/location/LocationCapturePanel";
import { FleetLiveMap } from "@/components/location/FleetLiveMap";

type Range = "today" | "month" | "last_month" | "quarter" | "year" | "all";
function start(range: Range) { const d = new Date(), x = new Date(d); if (range === "today") x.setHours(0, 0, 0, 0); else if (range === "month") x.setDate(1), x.setHours(0, 0, 0, 0); else if (range === "last_month") x.setMonth(x.getMonth() - 1, 1), x.setHours(0, 0, 0, 0); else if (range === "quarter") x.setMonth(Math.floor(x.getMonth() / 3) * 3, 1), x.setHours(0, 0, 0, 0); else if (range === "year") x.setMonth(0, 1), x.setHours(0, 0, 0, 0); else x.setFullYear(2000); return x.getTime(); }

export default function FleetIntelligencePage() {
  const { activeOrg } = useWorkspace();
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]), [trucks, setTrucks] = useState<Truck[]>([]), [metrics, setMetrics] = useState<TripMetrics[]>([]), [fuel, setFuel] = useState<FuelLog[]>([]), [locations, setLocations] = useState<TruckLocationEvent[]>([]), [range, setRange] = useState<Range>("month"), [selected, setSelected] = useState(""), [message, setMessage] = useState<string | null>(null), [locationError, setLocationError] = useState<string | null>(null);
  const [form, setForm] = useState({ loadedKm: "", emptyKm: "", plannedKm: "", progress: "", fuelLitres: "", fuelCost: "", revenue: "", notes: "" });

  useEffect(() => {
    if (!activeOrg) return;
    const id = activeOrg.id, q = { environment: "LIVE" as const };
    const unsubscribers = [tripsRepo.subscribe(id, q, setTrips), trucksRepo.subscribe(id, q, setTrucks), tripMetricsRepo.subscribe(id, q, setMetrics), fuelLogsRepo.subscribe(id, q, setFuel), truckLocationEventsRepo.subscribe(id, { ...q, limitTo: 500 }, setLocations, (error) => setLocationError(error.message))];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [activeOrg]);

  const filtered = useMemo(() => metrics.filter((m) => m.measuredAt?.toMillis?.() >= start(range)), [metrics, range]);
  const selectedTrip = trips.find((t) => t.id === selected) || trips[0];
  const existing = metrics.find((m) => m.tripId === selectedTrip?.id);
  useEffect(() => { if (selectedTrip && !selected) setSelected(selectedTrip.id); }, [selectedTrip, selected]);
  useEffect(() => { if (existing) setForm({ loadedKm: String(existing.loadedKm), emptyKm: String(existing.emptyKm), plannedKm: String(existing.plannedKm), progress: String(existing.routeProgressPct), fuelLitres: String(existing.fuelLitres), fuelCost: String(existing.fuelCost), revenue: String(existing.revenueAmount), notes: existing.notes }); }, [existing]);
  if (!activeOrg) return null;

  const totalLoaded = filtered.reduce((s, m) => s + m.loadedKm, 0), totalEmpty = filtered.reduce((s, m) => s + m.emptyKm, 0), totalKm = totalLoaded + totalEmpty, totalFuel = filtered.reduce((s, m) => s + m.fuelLitres, 0), totalFuelCost = filtered.reduce((s, m) => s + m.fuelCost, 0), totalRevenue = filtered.reduce((s, m) => s + m.revenueAmount, 0), util = totalKm ? totalLoaded / totalKm * 100 : 0, fuel100 = totalKm ? totalFuel / totalKm * 100 : 0, costKm = totalKm ? totalFuelCost / totalKm : 0, profit = totalRevenue - totalFuelCost;
  const alerts = filtered.filter((m) => Math.abs(m.routeVarianceKm) > Math.max(10, m.plannedKm * .15) || m.emptyKm > (m.loadedKm || 1) * .5);
  const save = async () => { if (!user || !selectedTrip) return; const n = (v: string) => Number(v || 0), loaded = n(form.loadedKm), empty = n(form.emptyKm), planned = n(form.plannedKm); const p = { tripId: selectedTrip.id, truckId: selectedTrip.truckId, truckRegistration: selectedTrip.truckRegistration, loadedKm: loaded, emptyKm: empty, plannedKm: planned, routeVarianceKm: loaded + empty - planned, routeProgressPct: Math.max(0, Math.min(100, n(form.progress))), fuelLitres: n(form.fuelLitres), fuelCost: n(form.fuelCost), revenueAmount: n(form.revenue), measuredAt: Timestamp.now(), source: "manual" as const, notes: form.notes.trim() }; try { if (existing) await tripMetricsRepo.update(activeOrg.id, user.uid, existing.id, p); else await tripMetricsRepo.create(activeOrg.id, user.uid, p, "LIVE"); setMessage("Trip intelligence saved. Fleet KPIs and alerts now recalculate from persisted measurements."); } catch (e) { setMessage(e instanceof Error ? e.message : "Save failed."); } };

  return <div className="space-y-6">
    <header className="page-header"><div><h1 className="page-title">Fleet & Live Map</h1><p className="page-subtitle">Live movement, route progress, service alerts and trip intelligence from real Translend data.</p></div><span className="badge green">LIVE DATA</span></header>
    {message && <div className="notice blue">{message}</div>}{locationError && <div className="notice red">Location feed unavailable: {locationError}</div>}
    <section className="panel"><div className="section-header"><div><h2 className="section-title">Analysis period</h2><p className="section-sub">Filters the fleet intelligence below.</p></div><select className="form-select" value={range} onChange={e => setRange(e.target.value as Range)}><option value="today">Today</option><option value="month">This month</option><option value="last_month">Last month</option><option value="quarter">This quarter</option><option value="year">Financial year</option><option value="all">All recorded</option></select></div></section>
    <div className="kpi-grid"><K l="Loaded KM" v={totalLoaded.toLocaleString()} n="Revenue movement"/><K l="Empty KM" v={totalEmpty.toLocaleString()} n="Deadhead distance" t="orange"/><K l="Utilisation" v={totalKm ? util.toFixed(1) + "%" : "—"} n="Loaded ÷ total KM" t="green"/><K l="Fuel / 100 KM" v={totalKm ? fuel100.toFixed(1) : "—"} n="Measured efficiency" t="blue"/><K l="Fuel cost / KM" v={totalKm ? activeOrg.currency + " " + costKm.toFixed(2) : "—"} n="Fuel ÷ measured KM" t="orange"/><K l="Route profit" v={activeOrg.currency + " " + profit.toLocaleString()} n="Revenue less tracked fuel" t={profit >= 0 ? "green" : "red"}/></div>
    <FleetLiveMap events={locations} trucks={trucks} />
    <section className="panel"><h2 className="section-title">Route alerts</h2>{alerts.length ? <div className="list">{alerts.map(m => <div className="list-row" key={m.id}><div><strong>{m.truckRegistration}</strong><div className="muted">{m.emptyKm > (m.loadedKm || 1) * .5 ? "Backhaul/empty KM gap" : "Route variance"} · {m.routeVarianceKm.toFixed(1)} km variance</div></div><span className="badge red">REVIEW</span></div>)}</div> : <div className="notice blue">No data-based route alerts in this period.</div>}</section>
    <section className="panel"><h2 className="section-title">Record trip intelligence</h2>{!trips.length ? <div className="notice blue">No live trips exist yet. Dispatch a trip first.</div> : <><div className="form-grid"><S l="Trip" v={selected} set={setSelected} opts={trips.map(t => [t.id, t.jobNumber + " · " + t.truckRegistration])}/>{Object.entries(form).map(([k, v]) => <F key={k} l={k === "notes" ? "Notes" : k.replace(/([A-Z])/g, " $1")} v={v} set={x => setForm({ ...form, [k]: x })}/>)}</div><button className="btn-primary" onClick={save}>Save trip intelligence</button></>}</section>
    <section className="panel"><h2 className="section-title">Revenue KM vs Empty KM</h2><Table rows={filtered.map(m => [m.truckRegistration, String(m.loadedKm), String(m.emptyKm), String(m.revenueAmount), String(m.routeProgressPct) + "%"])}/></section>
    {selectedTrip && <LocationCapturePanel orgId={activeOrg.id} truckId={selectedTrip.truckId} tripId={selectedTrip.id}/>}<section className="panel"><h2 className="section-title">Fleet coverage</h2><p className="section-sub">{trucks.length} live trucks · {locations.length} location events · {fuel.length} persisted fuel logs. Map positions are only shown from driver GPS or telematics events.</p></section>
  </div>;
}
function K({ l, v, n, t = "" }: { l: string; v: string; n: string; t?: string }) { return <div className={`kpi-card ${t}`}><div className="kpi-label">{l}</div><div className="kpi-value">{v}</div><div className="kpi-sub">{n}</div></div>; }
function F({ l, v, set }: { l: string; v: string; set: (x: string) => void }) { return <label className="form-group"><span className="field-label">{l}</span><input className="form-input" value={v} onChange={e => set(e.target.value)}/></label>; }
function S({ l, v, set, opts }: { l: string; v: string; set: (x: string) => void; opts: string[][] }) { return <label className="form-group"><span className="field-label">{l}</span><select className="form-select" value={v} onChange={e => set(e.target.value)}>{opts.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></label>; }
function Table({ rows }: { rows: string[][] }) { return <div style={{ overflowX: "auto" }}><table className="data-table"><thead><tr>{["Truck", "Loaded KM", "Empty KM", "Revenue", "Progress"].map(x => <th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((x, j) => <td key={j}>{x}</td>)}</tr>)}</tbody></table></div>; }
