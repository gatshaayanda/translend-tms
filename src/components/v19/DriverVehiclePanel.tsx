"use client";

import { useEffect, useState } from "react";
import { maintenanceSchedulesRepo, tyreRecordsRepo } from "@/lib/firebase/modules";
import type { MaintenanceSchedule, TyreRecord } from "@/types/workshop";
import { useAuth } from "@/contexts/AuthContext";

export function DriverVehiclePanel({ orgId, truckId }: { orgId: string; truckId: string }) {
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState<MaintenanceSchedule[]>([]);
  const [tyres, setTyres] = useState<TyreRecord[]>([]);
  const [inspectionType, setInspectionType] = useState("pre_trip");
  const [inspectionResult, setInspectionResult] = useState("pass");
  const [odometer, setOdometer] = useState("");
  const [findings, setFindings] = useState("");
  const [defect, setDefect] = useState("");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      maintenanceSchedulesRepo.list(orgId, { environment: "LIVE" }),
      tyreRecordsRepo.list(orgId, { environment: "LIVE" }),
    ]).then(([m, t]) => {
      setMaintenance(m.filter((item) => item.truckId === truckId));
      setTyres(t.filter((item) => item.truckId === truckId && item.status === "fitted"));
    }).catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load vehicle maintenance information."));
  }, [orgId, truckId]);

  const submit = async (action: "inspection" | "defect") => {
    if (!user || busy || !navigator.onLine) { setMessage("Reconnect before sending a vehicle action."); return; }
    if (action === "inspection" && !findings.trim()) { setMessage("Add inspection findings, even when the vehicle passes."); return; }
    if (action === "defect" && !defect.trim()) { setMessage("Describe the defect before reporting it."); return; }
    setBusy(true); setMessage(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/driver/vehicle-action", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ orgId, truckId, action, ...(action === "inspection" ? { inspectionType, result: inspectionResult, odometerKm: Number(odometer || 0), findings } : { description: defect, priority }) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Vehicle action failed.");
      setMessage(action === "inspection" ? `Inspection recorded${data.workOrderCreated ? " and a maintenance work order was opened." : "."}` : "Defect reported and a maintenance work order was opened.");
      setFindings(""); setDefect("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Vehicle action failed."); } finally { setBusy(false); }
  };

  return <section className="panel space-y-5">
    <div><h2 className="section-title">Vehicle condition</h2><p className="section-sub">Record the vehicle condition and see maintenance items for your assigned truck.</p></div>
    {message && <div className="notice blue">{message}</div>}
    <div className="grid gap-3 md:grid-cols-4">
      <div className="kpi-card"><div className="kpi-label">Open maintenance</div><div className="kpi-value">{maintenance.filter((m) => m.status === "active").length}</div><div className="kpi-sub">Scheduled maintenance records</div></div>
      <div className="kpi-card"><div className="kpi-label">Fitted tyres</div><div className="kpi-value">{tyres.length}</div><div className="kpi-sub">Current fitted records</div></div>
      <div className="kpi-card"><div className="kpi-label">Next due</div><div className="kpi-value" style={{ fontSize: 16 }}>{maintenance.find((m) => m.status === "active")?.nextDueAt?.toDate().toLocaleDateString() ?? "Not configured"}</div><div className="kpi-sub">From live maintenance schedule</div></div>
      <div className="kpi-card"><div className="kpi-label">Tyre positions</div><div className="kpi-value" style={{ fontSize: 16 }}>{tyres.map((t) => t.position).join(", ") || "Not configured"}</div><div className="kpi-sub">Live fitted tyre records</div></div>
    </div>
    {maintenance.length > 0 && <div><h3 className="font-semibold">Maintenance visibility</h3><div className="mt-2 space-y-2">{maintenance.slice(0, 5).map((item) => <div className="notice" key={item.id}><strong>{item.serviceType}</strong> — {item.status}. {item.notes || "No additional notes."}</div>)}</div></div>}
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-3"><h3 className="font-semibold">Pre-trip / vehicle inspection</h3><div className="grid gap-3 sm:grid-cols-2"><select className="input" value={inspectionType} onChange={(e) => setInspectionType(e.target.value)}><option value="pre_trip">Pre-trip</option><option value="periodic">Periodic</option><option value="roadworthy">Roadworthy</option><option value="post_repair">Post-repair</option></select><select className="input" value={inspectionResult} onChange={(e) => setInspectionResult(e.target.value)}><option value="pass">Pass</option><option value="attention">Attention</option><option value="fail">Fail</option></select></div><input className="input" type="number" min="0" value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="Odometer km"/><textarea className="input min-h-24" value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="Inspection findings / checks completed"/><button className="btn-primary" disabled={busy} onClick={() => void submit("inspection")}>{busy ? "Saving…" : "Record inspection"}</button></div>
      <div className="space-y-3"><h3 className="font-semibold">Report a vehicle defect</h3><div className="grid gap-3 sm:grid-cols-[160px_1fr]"><select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="high">High priority</option><option value="medium">Medium</option><option value="low">Low</option></select><textarea className="input min-h-24" value={defect} onChange={(e) => setDefect(e.target.value)} placeholder="What is wrong with the vehicle?"/></div><button className="btn-secondary" disabled={busy} onClick={() => void submit("defect")}>Report defect</button></div>
    </div>
  </section>;
}
