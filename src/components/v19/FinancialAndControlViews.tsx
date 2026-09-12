"use client";

import { useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { trucksRepo, tripsRepo, deliveryNotesRepo } from "@/lib/firebase/modules";
import type { DeliveryNote, RecordEnvironment, Trip, Truck } from "@/types/core";

type ViewKind =
  | "invoicing"
  | "fuel"
  | "performance"
  | "journal"
  | "pl"
  | "cashflow"
  | "balance"
  | "trial";

const money = (value: number) => `BWP ${value.toLocaleString("en-BW", { maximumFractionDigits: 0 })}`;

function useOperationalData() {
  const { activeOrg } = useWorkspace();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);

  useEffect(() => {
    if (!activeOrg) return;
    const orgId = activeOrg.id;
    const env: { environment: RecordEnvironment } = { environment: "LIVE" };
    const unsubTrucks = trucksRepo.subscribe(orgId, { ...env, orderByField: "registrationNumber" }, setTrucks);
    const unsubTrips = tripsRepo.subscribe(orgId, { ...env, orderByField: "plannedStart" }, setTrips);
    const unsubNotes = deliveryNotesRepo.subscribe(orgId, { ...env, orderByField: "noteDateTime" }, setDeliveryNotes);
    return () => {
      unsubTrucks();
      unsubTrips();
      unsubNotes();
    };
  }, [activeOrg]);

  return { trucks, trips, deliveryNotes };
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: string }) {
  return (
    <div className="page-header">
      <div>
        <div className="page-title">{title}</div>
        <div className="page-subtitle">{subtitle}</div>
      </div>
      {action && <button className="btn-primary" type="button">{action}</button>}
    </div>
  );
}

function DataNotice({ children }: { children: React.ReactNode }) {
  return <div className="notice blue" style={{ marginBottom: 18 }}>{children}</div>;
}

function Kpi({ label, value, note, tone = "" }: { label: string; value: string; note: string; tone?: string }) {
  return <div className={`kpi-card ${tone}`}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-sub">{note}</div></div>;
}

function DemoTable({ rows, headers }: { rows: string[][]; headers: string[] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="data-table">
        <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={`${i}-${j}`}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function FinancialAndControlViews({ kind }: { kind: ViewKind }) {
  const data = useOperationalData();
  const content = useMemo(() => renderView(kind, data), [kind, data.trucks, data.trips, data.deliveryNotes]);
  return content;
}

function renderView(kind: ViewKind, { trucks, trips, deliveryNotes }: ReturnType<typeof useOperationalData>) {
  switch (kind) {
    case "invoicing":
      return <InvoicingView trucks={trucks} trips={trips} deliveryNotes={deliveryNotes} />;
    case "fuel":
      return <FuelView trucks={trucks} trips={trips} />;
    case "performance":
      return <PerformanceView trucks={trucks} trips={trips} deliveryNotes={deliveryNotes} />;
    case "journal":
      return <JournalView deliveryNotes={deliveryNotes} />;
    case "pl":
      return <StatementView title="P&L Statement" subtitle="Management income statement aligned to the v19 financial product surface." />;
    case "cashflow":
      return <StatementView title="Cash Flow" subtitle="Management cash-flow view for customer receipts, operating costs and fleet liquidity." />;
    case "balance":
      return <StatementView title="Balance Sheet" subtitle="Financial position view for cash, receivables, fleet assets, payables and equity." />;
    case "trial":
      return <StatementView title="Trial Balance" subtitle="Accounting control view prepared for future ledger integration." />;
  }
}

function InvoicingView({ trucks, trips, deliveryNotes }: { trucks: Truck[]; trips: Trip[]; deliveryNotes: DeliveryNote[] }) {
  const ready = deliveryNotes.filter((n) => n.environment === "LIVE" && n.podState === "complete");
  return <>
    <PageHeader title="Invoicing & Statements" subtitle="Billing readiness, customer statements and POD-linked invoice control." action="Raise invoice" />
    <DataNotice>Invoice and accounting persistence is not yet a separate Firestore domain in v19. This native surface therefore derives its operational readiness from live delivery-note data and does not invent financial records.</DataNotice>
    <div className="kpi-grid">
      <Kpi label="Ready to invoice" value={String(ready.length)} note="Live delivery notes with complete POD state" tone="green" />
      <Kpi label="Delivery notes" value={String(deliveryNotes.length)} note="Current workspace records" />
      <Kpi label="Trips" value={String(trips.length)} note="Operational records available" tone="blue" />
      <Kpi label="Fleet" value={String(trucks.length)} note="Live trucks in workspace" tone="orange" />
      <Kpi label="POD readiness" value={deliveryNotes.length ? `${Math.round((ready.length / deliveryNotes.length) * 100)}%` : "—"} note="Complete POD ÷ delivery notes" tone={ready.length === deliveryNotes.length ? "green" : "yellow"} />
    </div>
    <div className="ready-pay-grid section">
      <div className="panel"><h3>Ready-to-Invoice Queue</h3><div className="panel-sub">Only completed delivery notes are presented as billing-ready. No invoice documents are fabricated here.</div>
        <DemoTable headers={["Delivery note", "Customer", "Vehicle", "Received by", "POD", "Billing"]} rows={ready.slice(0, 12).map((n) => [n.noteReference, n.customerName, n.vehicleRegistration, n.receivedByName || "—", "Complete", "Ready"])} />
      </div>
      <div className="panel rate-card-panel"><h3>Billing Control</h3><div className="panel-sub">The visual model is ready for the future finance repository without bypassing the current engine.</div>
        <div className="list">
          <div className="list-row"><div><strong>POD completeness</strong><div className="muted">Delivery-note evidence remains the gating condition.</div></div><span className="badge green">Live</span></div>
          <div className="list-row"><div><strong>Customer balances</strong><div className="muted">Requires a finance/ledger domain before balances can be persisted.</div></div><span className="badge yellow">Planned</span></div>
          <div className="list-row"><div><strong>Invoice preview</strong><div className="muted">Native v19 document styling can now be attached when invoice records exist.</div></div><span className="badge blue">UI ready</span></div>
        </div>
      </div>
    </div>
  </>;
}

function FuelView({ trucks, trips }: { trucks: Truck[]; trips: Trip[] }) {
  const maintenance = trucks.filter((t) => t.status === "in_maintenance").length;
  const activeTrips = trips.filter((t) => t.status !== "completed").length;
  return <>
    <PageHeader title="Fuel & Workshop" subtitle="Fleet cost, maintenance and compliance control in the v19 operating language." action="Log fuel" />
    <DataNotice>Fuel transactions, work orders, inspections and tyre ledgers are not separate persisted collections in the current engine. This pass deliberately keeps the surface native and ready without inventing Firestore writes.</DataNotice>
    <div className="kpi-grid">
      <Kpi label="Fleet" value={String(trucks.length)} note="Live trucks" />
      <Kpi label="In workshop" value={String(maintenance)} note="Truck status currently in maintenance" tone={maintenance ? "yellow" : "green"} />
      <Kpi label="Open trips" value={String(activeTrips)} note="Trips not yet completed" tone="blue" />
      <Kpi label="Compliance data" value={String(trucks.filter((t) => t.complianceExpiryDates.roadworthy).length)} note="Trucks with roadworthy dates" tone="green" />
      <Kpi label="Cost ledger" value="Not yet persisted" note="Finance domain required" tone="red" />
    </div>
    <div className="grid-2 section">
      <div className="form-card"><h3>Log Fuel Transaction</h3><div className="form-grid"><Field label="Date" type="date" /><Field label="Truck" select options={trucks.map((t) => t.registrationNumber)} /><Field label="Litres" /><Field label="Total cost (BWP)" /><Field label="Odometer" /><Field label="Supplier" /><Field label="Linked trip / delivery note" full /></div><div className="form-row-actions"><button className="btn-primary" type="button">Save Fuel Log</button><button className="btn-secondary" type="button">Attach Receipt</button></div></div>
      <div className="form-card"><h3>Maintenance Work Order</h3><div className="form-grid"><Field label="Work order" /><Field label="Truck" select options={trucks.map((t) => t.registrationNumber)} /><Field label="Work type" select options={["Scheduled service", "Repair", "Tyres", "Inspection finding", "Roadworthy preparation"]} /><Field label="Priority" select options={["High", "Medium", "Low"]} /><Field label="Work required" full /></div><div className="form-row-actions"><button className="btn-primary" type="button">Create Work Order</button><button className="btn-secondary" type="button">Create Supplier PO</button></div></div>
    </div>
    <div className="panel section"><h3>Workshop & Compliance Register</h3><div className="panel-sub">Live vehicle records are shown here; maintenance costs remain non-persistent until the finance/workshop domain is introduced.</div>
      <DemoTable headers={["Truck", "Status", "Odometer", "Roadworthy", "Insurance", "Driver"]} rows={trucks.map((t) => [t.registrationNumber, t.status.replaceAll("_", " "), t.odometerKm.toLocaleString(), t.complianceExpiryDates.roadworthy ? "Recorded" : "Not recorded", t.complianceExpiryDates.insurance ? "Recorded" : "Not recorded", t.assignedDriverId || "Unassigned"])} />
    </div>
  </>;
}

function PerformanceView({ trucks, trips, deliveryNotes }: { trucks: Truck[]; trips: Trip[]; deliveryNotes: DeliveryNote[] }) {
  const active = trips.filter((t) => t.status !== "completed").length;
  return <>
    <PageHeader title="Performance Dashboard" subtitle="Operating KPIs, fleet utilisation, delivery readiness and decision support." />
    <div className="kpi-dashboard-grid section">
      <Kpi label="Fleet" value={String(trucks.length)} note="Live trucks" />
      <Kpi label="Active trips" value={String(active)} note="Not completed" tone="blue" />
      <Kpi label="Delivery notes" value={String(deliveryNotes.length)} note="Current workspace" tone="green" />
      <Kpi label="POD readiness" value={deliveryNotes.length ? `${Math.round((deliveryNotes.filter((n) => n.podState === "complete").length / deliveryNotes.length) * 100)}%` : "—"} note="Complete POD state" tone="orange" />
    </div>
    <div className="manager-strip section">
      <Kpi label="Available" value={String(trucks.filter((t) => t.status === "available").length)} note="Fleet" />
      <Kpi label="On trip" value={String(trucks.filter((t) => t.status === "on_trip").length)} note="Fleet" tone="green" />
      <Kpi label="Workshop" value={String(trucks.filter((t) => t.status === "in_maintenance").length)} note="Fleet" tone="yellow" />
      <Kpi label="Out of service" value={String(trucks.filter((t) => t.status === "out_of_service").length)} note="Fleet" tone="red" />
      <Kpi label="Exceptions" value={String(trips.filter((t) => t.status === "exception").length)} note="Trip status" tone="red" />
    </div>
    <DataNotice>Revenue, cost/km and margin charts in the original HTML are management-product concepts. The current Firestore engine does not yet persist the required finance inputs, so this pass avoids presenting fixture numbers as live financial truth.</DataNotice>
    <div className="chart-grid section">
      <div className="chart-panel"><h3>Fleet Status</h3><div className="panel-sub">Current live vehicle distribution.</div><div className="bar-list">{(["available", "on_trip", "in_maintenance", "out_of_service"] as const).map((status) => { const count = trucks.filter((t) => t.status === status).length; const pct = trucks.length ? Math.round((count / trucks.length) * 100) : 0; return <div className="bar-row" key={status}><span className="label">{status.replaceAll("_", " ")}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div><span className="bar-value">{count} · {pct}%</span></div>; })}</div></div>
      <div className="chart-panel"><h3>Trip Status</h3><div className="panel-sub">Operational distribution from live trips.</div><DemoTable headers={["Status", "Trips"]} rows={Array.from(new Set(trips.map((t) => t.status))).map((status) => [status.replaceAll("_", " "), String(trips.filter((t) => t.status === status).length)])} /></div>
    </div>
  </>;
}

function JournalView({ deliveryNotes }: { deliveryNotes: DeliveryNote[] }) {
  return <>
    <PageHeader title="Journal Entry" subtitle="Financial posting workspace prepared for the future ledger domain." action="Post transaction" />
    <DataNotice>The current authoritative Firestore engine has no finance transaction collection. This UI does not write fake accounting entries. Operational source records are used only to demonstrate the intended v19 posting flow.</DataNotice>
    <div className="transaction-workspace section">
      <div className="form-card"><h3>Post Journal Entry</h3><div className="form-grid"><Field label="Date" type="date" /><Field label="Transaction type" select options={["Customer invoice", "Customer receipt", "Fuel expense", "Supplier invoice", "Subcontractor cost"]} /><Field label="Reference" /><Field label="Amount (BWP)" /><Field label="Description" full /></div><div className="transaction-actions"><button className="btn-primary" type="button">Post Transaction</button><button className="btn-secondary" type="button">Export to Google Sheets</button><button className="btn-ghost" type="button">Clear</button></div></div>
      <div className="panel ledger-preview-panel"><h3>Ledger Preview</h3><div className="panel-sub">Accrual accounting structure from the v19 reference.</div><div className="t-account-preview"><div className="t-account-box"><h4>Debit</h4><div className="t-account-row"><span>Accounts Receivable</span><strong>—</strong></div></div><div className="t-account-box"><h4>Credit</h4><div className="t-account-row"><span>Haulage Revenue</span><strong>—</strong></div><div className="t-account-row"><span>VAT Output</span><strong>—</strong></div></div></div><div className="ledger-output-title">Source activity available</div><div className="ledger-output-queue"><div className="ledger-output-card"><div><strong>Delivery notes</strong><span>{deliveryNotes.length} live records available for future billing posting.</span></div><span className="badge blue">Source</span></div><div className="ledger-output-card urgent"><div><strong>Finance ledger</strong><span>No persisted accounting collection exists yet.</span></div><span className="badge yellow">Planned</span></div></div></div>
    </div>
    <div className="panel section"><h3>Recent Operational Sources</h3><DemoTable headers={["Reference", "Customer", "Vehicle", "POD", "State"]} rows={deliveryNotes.slice(0, 10).map((n) => [n.noteReference, n.customerName, n.vehicleRegistration, n.podState, "Operational source"])} /></div>
  </>;
}

function StatementView({ title, subtitle }: { title: string; subtitle: string }) {
  const isBalance = title === "Balance Sheet";
  const isTrial = title === "Trial Balance";
  const isCash = title === "Cash Flow";
  return <>
    <PageHeader title={title} subtitle={subtitle} />
    <DataNotice>These accounting views are native v19 product surfaces, but they are intentionally labelled as presentation-ready until a dedicated finance/ledger Firestore domain is approved. No demo figures are treated as live business truth.</DataNotice>
    {!isTrial && <div className="financial-summary section"><Kpi label={isCash ? "Opening cash" : isBalance ? "Current assets" : "Revenue"} value="—" note="Finance data not yet persisted" /><Kpi label={isCash ? "Cash in" : isBalance ? "Receivables" : "Transport cost"} value="—" note="Finance data not yet persisted" tone="yellow" /><Kpi label={isCash ? "Cash out" : isBalance ? "Liabilities" : "Gross profit"} value="—" note="Finance data not yet persisted" tone="green" /><Kpi label={isCash ? "Closing cash" : isBalance ? "Equity" : "Net profit"} value="—" note="Finance data not yet persisted" tone="blue" /></div>}
    <div className="panel section"><h3>{isTrial ? "Trial Balance" : title}</h3><div className="panel-sub">Native table structure mirrors the v19 reference and is ready to bind to real finance records later.</div>
      {isBalance ? <div className="financial-layout"><AccountPanel title="Assets" lines={["Cash at bank", "Accounts receivable", "Fuel deposits / advances", "Truck fleet at carrying value", "Workshop equipment"]} /><AccountPanel title="Liabilities & Equity" lines={["Supplier payables", "Accrued operating costs", "Vehicle finance", "Owner capital and retained earnings"]} /></div> :
       <DemoTable headers={isTrial ? ["Account", "Debit", "Credit"] : ["Line item", "Current period", "Prior period", "YTD", "Status"]} rows={(isTrial ? ["Cash at bank", "Accounts receivable", "Truck fleet", "Workshop equipment", "Fuel expense", "Supplier payables", "Vehicle finance", "Haulage revenue"] : isCash ? ["Customer receipts", "Fuel and lubricants paid", "Tyres, spares and workshop paid", "Subcontracted haulage paid", "Driver wages and permits", "Net cash from operating activities", "Net increase in cash", "Closing cash balance"] : ["Aggregate haulage", "Rubble removal", "Aggregate supply", "Fuel", "Tyres", "Workshop and spares", "Subcontracted haulage", "Gross profit", "Admin overheads", "Net profit"]).map((line) => isTrial ? [line, "—", "—"] : [line, "—", "—", "—", "Pending finance data"]))} />}
    </div>
  </>;
}

function AccountPanel({ title, lines }: { title: string; lines: string[] }) {
  return <div className="panel"><h3>{title}</h3><DemoTable headers={["Account", "Balance"]} rows={lines.map((line) => [line, "—"])} /></div>;
}

function Field({ label, type = "text", full = false, select = false, options = [] }: { label: string; type?: string; full?: boolean; select?: boolean; options?: string[] }) {
  return <div className={`form-group ${full ? "full" : ""}`}><label>{label}</label>{select ? <select className="form-select"><option value="">Select…</option>{options.map((o) => <option key={o}>{o}</option>)}</select> : <input className="form-input" type={type} placeholder={label} />}</div>;
}
