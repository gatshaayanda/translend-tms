"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  customersRepo, trucksRepo, tripsRepo, jobsRepo, deliveryNotesRepo,
  fuelLogsRepo, workOrdersRepo, supplierPOsRepo, invoicesRepo, journalEntriesRepo,
} from "@/lib/firebase/modules";
import { uploadFuelReceipt } from "@/lib/uploadthing/client";
import type { Customer, DeliveryNote, Job, RecordEnvironment, Trip, Truck } from "@/types/core";
import type { FuelLog, Invoice, JournalEntry, SupplierPO, WorkOrder } from "@/types/finance";

type ViewKind = "invoicing" | "fuel" | "performance" | "journal" | "pl" | "cashflow" | "balance" | "trial";
type Data = {
  trucks: Truck[]; trips: Trip[]; jobs: Job[]; customers: Customer[]; deliveryNotes: DeliveryNote[];
  fuelLogs: FuelLog[]; workOrders: WorkOrder[]; supplierPOs: SupplierPO[]; invoices: Invoice[]; journalEntries: JournalEntry[];
};

function useOperationalData(): Data {
  const { activeOrg } = useWorkspace();
  const [data, setData] = useState<Data>({ trucks: [], trips: [], jobs: [], customers: [], deliveryNotes: [], fuelLogs: [], workOrders: [], supplierPOs: [], invoices: [], journalEntries: [] });
  useEffect(() => {
    if (!activeOrg) return;
    const orgId = activeOrg.id;
    const env: { environment: RecordEnvironment } = { environment: "LIVE" };
    const unsubs = [
      trucksRepo.subscribe(orgId, { ...env, orderByField: "registrationNumber" }, (v) => setData((d) => ({ ...d, trucks: v }))),
      tripsRepo.subscribe(orgId, env, (v) => setData((d) => ({ ...d, trips: v }))),
      jobsRepo.subscribe(orgId, env, (v) => setData((d) => ({ ...d, jobs: v }))),
      deliveryNotesRepo.subscribe(orgId, env, (v) => setData((d) => ({ ...d, deliveryNotes: v }))),
      fuelLogsRepo.subscribe(orgId, env, (v) => setData((d) => ({ ...d, fuelLogs: v }))),
      workOrdersRepo.subscribe(orgId, env, (v) => setData((d) => ({ ...d, workOrders: v }))),
      supplierPOsRepo.subscribe(orgId, env, (v) => setData((d) => ({ ...d, supplierPOs: v }))),
      invoicesRepo.subscribe(orgId, env, (v) => setData((d) => ({ ...d, invoices: v }))),
      journalEntriesRepo.subscribe(orgId, env, (v) => setData((d) => ({ ...d, journalEntries: v }))),
    ];
    Promise.all([
      customersRepo.list(orgId, env),
    ]).then(([customers]) => setData((d) => ({ ...d, customers }))).catch(() => undefined);
    return () => unsubs.forEach((unsub) => unsub());
  }, [activeOrg]);
  return data;
}

function PageHeader({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return <div className="page-header"><div><div className="page-title">{title}</div><div className="page-subtitle">{subtitle}</div></div>{action && <button className="btn-primary" type="button" onClick={onAction}>{action}</button>}</div>;
}
function DataNotice({ children }: { children: React.ReactNode }) { return <div className="notice blue" style={{ marginBottom: 18 }}>{children}</div>; }
function Kpi({ label, value, note, tone = "" }: { label: string; value: string; note: string; tone?: string }) { return <div className={`kpi-card ${tone}`}><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-sub">{note}</div></div>; }
function DemoTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div style={{ overflowX: "auto" }}><table className="data-table"><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={`${i}-${j}`}>{cell}</td>)}</tr>)}</tbody></table></div>; }
function Input({ label, value, onChange, type = "text", options }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; options?: string[] }) { return <div className="form-group"><label>{label}</label>{options ? <select className="form-select" value={String(value)} onChange={(e) => onChange(e.target.value)}><option value="">Select…</option>{options.map((o) => <option key={o}>{o}</option>)}</select> : <input className="form-input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />}</div>; }
function ActionNotice({ message }: { message: string | null }) { return message ? <div className="notice blue" style={{ marginBottom: 18 }}>{message}</div> : null; }

export default function FinancialAndControlViews({ kind }: { kind: ViewKind }) {
  const data = useOperationalData();
  return useMemo(() => renderView(kind, data), [kind, data]);
}

function renderView(kind: ViewKind, data: Data) {
  switch (kind) {
    case "invoicing": return <InvoicingView {...data} />;
    case "fuel": return <FuelView {...data} />;
    case "performance": return <PerformanceView {...data} />;
    case "journal": return <JournalView {...data} />;
    case "pl": return <StatementView title="P&L Statement" subtitle="Live income statement derived from persisted invoices, fuel and journal activity." entries={data.journalEntries} />;
    case "cashflow": return <StatementView title="Cash Flow" subtitle="Live cash movement derived from persisted journal entries." entries={data.journalEntries} />;
    case "balance": return <StatementView title="Balance Sheet" subtitle="Live financial position derived from persisted journal entries." entries={data.journalEntries} />;
    case "trial": return <StatementView title="Trial Balance" subtitle="Accounting control view derived from persisted journal entries." entries={data.journalEntries} />;
  }
}

function InvoicingView({ deliveryNotes, trips, trucks, jobs, customers, invoices }: Data) {
  const { activeOrg } = useWorkspace(); const { user } = useAuth();
  const ready = deliveryNotes.filter((n) => n.podState === "complete" && !invoices.some((i) => i.deliveryNoteId === n.id));
  const [selected, setSelected] = useState(ready[0]?.id ?? ""); const [message, setMessage] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!selected && ready[0]) setSelected(ready[0].id); }, [ready, selected]);
  const raiseInvoice = async () => {
    if (!activeOrg || !user) return; const note = ready.find((n) => n.id === selected); if (!note) { setMessage("Select a completed POD first."); return; }
    const job = jobs.find((j) => j.id === note.jobId); const customer = customers.find((c) => c.id === note.customerId) ?? customers.find((c) => c.name === note.customerName);
    if (!job || !customer) { setMessage("The linked Job/Customer record is required before an invoice can be raised."); return; }
    setBusy(true); setMessage(null);
    try {
      const amount = Number(job.rate) || 0; const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`; const issuedAt = Timestamp.now();
      const dueAt = Timestamp.fromMillis(issuedAt.toMillis() + customer.paymentTermsDays * 86400000);
      await invoicesRepo.create(activeOrg.id, user.uid, { invoiceNumber, deliveryNoteId: note.id, jobId: job.id, customerId: customer.id, customerName: customer.name, amount, currency: job.currency || customer.currency || activeOrg.currency, status: "issued", issuedAt, dueAt, paidAt: null }, "LIVE");
      await journalEntriesRepo.create(activeOrg.id, user.uid, { entryDate: issuedAt, transactionType: "Customer invoice", reference: invoiceNumber, amount, description: `Invoice for ${note.noteReference}`, debitAccount: "Accounts Receivable", creditAccount: "Haulage Revenue" }, "LIVE");
      setMessage(`${invoiceNumber} was raised and posted to Accounts Receivable.`); setSelected("");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Failed to raise invoice."); } finally { setBusy(false); }
  };
  const paid = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  return <>
    <PageHeader title="Invoicing & Statements" subtitle="Billing readiness, customer statements and POD-linked invoice control." action="Raise invoice" onAction={raiseInvoice} />
    <ActionNotice message={message} />
    <DataNotice>Invoices are now persisted. A completed POD is the billing gate; raising an invoice creates the invoice record and its Accounts Receivable / Haulage Revenue journal entry.</DataNotice>
    <div className="kpi-grid"><Kpi label="Ready to invoice" value={String(ready.length)} note="Complete live PODs" tone="green" /><Kpi label="Invoices" value={String(invoices.length)} note="Persisted invoice records" tone="blue" /><Kpi label="Issued value" value={invoices.length ? `${invoices[0].currency} ${invoices.reduce((s, i) => s + i.amount, 0).toLocaleString()}` : "—"} note="Invoice total" /><Kpi label="Paid value" value={paid.toLocaleString()} note="Paid invoice total" tone="green" /><Kpi label="POD readiness" value={deliveryNotes.length ? `${Math.round((deliveryNotes.filter((n) => n.podState === "complete").length / deliveryNotes.length) * 100)}%` : "—"} note="Complete POD ÷ notes" /></div>
    {ready.length > 0 && <div className="panel section"><h3>Raise from completed POD</h3><div className="form-grid"><Input label="Delivery note" value={selected} onChange={setSelected} options={ready.map((n) => n.id)} /></div><div className="form-row-actions"><button className="btn-primary" disabled={busy || !selected} onClick={raiseInvoice}>{busy ? "Raising…" : "Raise selected invoice"}</button></div></div>}
    <div className="panel section"><h3>Invoice Register</h3><DemoTable headers={["Invoice", "Customer", "Amount", "Status", "Due"]} rows={invoices.slice(0, 20).map((i) => [i.invoiceNumber, i.customerName, `${i.currency} ${i.amount.toLocaleString()}`, i.status, i.dueAt?.toDate().toLocaleDateString() ?? "—"])} /></div>
    <div className="panel section"><h3>Operational context</h3><DemoTable headers={["Trips", "Fleet", "Completed PODs"]} rows={[[String(trips.length), String(trucks.length), String(deliveryNotes.filter((n) => n.podState === "complete").length)]]} /></div>
  </>;
}

function FuelView({ trucks, trips, fuelLogs, workOrders, supplierPOs }: Data) {
  const { activeOrg } = useWorkspace(); const { user } = useAuth();
  const [fuel, setFuel] = useState({ date: new Date().toISOString().slice(0, 10), truckId: trucks[0]?.id ?? "", litres: "", cost: "", odometer: "", supplier: "", tripId: "" });
  const [work, setWork] = useState({ truckId: trucks[0]?.id ?? "", type: "Scheduled service", priority: "medium", required: "" });
  const [po, setPo] = useState({ supplier: "", truckId: trucks[0]?.id ?? "", description: "", amount: "" });
  const [message, setMessage] = useState<string | null>(null); const [busy, setBusy] = useState(false); const receiptInput = useRef<HTMLInputElement>(null); const [receiptLog, setReceiptLog] = useState<string | null>(null);
  const truck = (id: string) => trucks.find((t) => t.id === id);
  const saveFuel = async () => { if (!activeOrg || !user) return; const t = truck(fuel.truckId); if (!t || !fuel.litres || !fuel.cost) { setMessage("Truck, litres and total cost are required."); return; } setBusy(true); try { const id = await fuelLogsRepo.create(activeOrg.id, user.uid, { logDate: Timestamp.fromDate(new Date(`${fuel.date}T00:00:00`)), truckId: t.id, truckRegistration: t.registrationNumber, litres: Number(fuel.litres), totalCost: Number(fuel.cost), odometerKm: Number(fuel.odometer || 0), supplier: fuel.supplier.trim(), tripId: fuel.tripId || null, deliveryNoteId: null, receiptUrl: null, receiptKey: null }, "LIVE"); await journalEntriesRepo.create(activeOrg.id, user.uid, { entryDate: Timestamp.now(), transactionType: "Fuel expense", reference: `FUEL-${id.slice(0, 8).toUpperCase()}`, amount: Number(fuel.cost), description: `Fuel for ${t.registrationNumber}`, debitAccount: "Fuel Expense", creditAccount: "Cash at bank" }, "LIVE"); setReceiptLog(id); setMessage("Fuel log saved and the fuel expense was posted to the journal."); setFuel({ ...fuel, litres: "", cost: "", odometer: "", supplier: "", tripId: "" }); } catch (err) { setMessage(err instanceof Error ? err.message : "Failed to save fuel log."); } finally { setBusy(false); } };
  const saveWork = async () => { if (!activeOrg || !user) return; const t = truck(work.truckId); if (!t || !work.required.trim()) { setMessage("Truck and work required are required."); return; } try { const id = await workOrdersRepo.create(activeOrg.id, user.uid, { workOrderNumber: `WO-${Date.now().toString(36).toUpperCase()}`, truckId: t.id, truckRegistration: t.registrationNumber, workType: work.type, priority: work.priority as WorkOrder["priority"], workRequired: work.required.trim(), status: "open", supplierPoId: null }, "LIVE"); setMessage(`Work order ${id.slice(0, 8).toUpperCase()} created.`); setWork({ ...work, required: "" }); } catch (err) { setMessage(err instanceof Error ? err.message : "Failed to create work order."); } };
  const savePO = async () => { if (!activeOrg || !user) return; const t = truck(po.truckId); if (!po.supplier.trim() || !po.description.trim()) { setMessage("Supplier and description are required."); return; } try { const id = await supplierPOsRepo.create(activeOrg.id, user.uid, { poNumber: `PO-${Date.now().toString(36).toUpperCase()}`, supplier: po.supplier.trim(), truckId: t?.id ?? null, truckRegistration: t?.registrationNumber ?? null, description: po.description.trim(), amount: Number(po.amount || 0), currency: activeOrg.currency, status: "open", workOrderId: null }, "LIVE"); setMessage(`Supplier PO ${id.slice(0, 8).toUpperCase()} created.`); setPo({ ...po, supplier: "", description: "", amount: "" }); } catch (err) { setMessage(err instanceof Error ? err.message : "Failed to create supplier PO."); } };
  const attachReceipt = async (file: File) => { if (!activeOrg || !user || !receiptLog) return; if (file.size > 8 * 1024 * 1024 || (!file.type.startsWith("image/") && file.type !== "application/pdf")) { setMessage("Receipt must be an image or PDF up to 8MB."); return; } setBusy(true); try { await uploadFuelReceipt({ user, orgId: activeOrg.id, fuelLogId: receiptLog, file }); setMessage("Receipt uploaded and attached to the fuel log."); } catch (err) { setMessage(err instanceof Error ? err.message : "Failed to upload receipt."); } finally { setBusy(false); } };
  return <>
    <PageHeader title="Fuel & Workshop" subtitle="Fleet cost, maintenance and compliance control in the v19 operating language." action="Log fuel" onAction={() => document.getElementById("fuel-form")?.scrollIntoView({ behavior: "smooth" })} />
    <ActionNotice message={message} />
    <DataNotice>Fuel logs, workshop work orders and supplier POs are now persisted as real workspace records. Fuel receipts use UploadThing and are not stored in Firebase Storage.</DataNotice>
    <div className="kpi-grid"><Kpi label="Fleet" value={String(trucks.length)} note="Live trucks" /><Kpi label="Fuel logs" value={String(fuelLogs.length)} note="Persisted" tone="blue" /><Kpi label="Open work orders" value={String(workOrders.filter((w) => w.status === "open").length)} note="Workshop queue" tone="yellow" /><Kpi label="Supplier POs" value={String(supplierPOs.length)} note="Persisted" /><Kpi label="Open trips" value={String(trips.filter((t) => t.status !== "completed").length)} note="Operational context" /></div>
    <div id="fuel-form" className="grid-2 section"><div className="form-card"><h3>Log Fuel Transaction</h3><div className="form-grid"><Input label="Date" type="date" value={fuel.date} onChange={(v) => setFuel({ ...fuel, date: v })} /><Input label="Truck" value={fuel.truckId} onChange={(v) => setFuel({ ...fuel, truckId: v })} options={trucks.map((t) => t.id)} /><Input label="Litres" type="number" value={fuel.litres} onChange={(v) => setFuel({ ...fuel, litres: v })} /><Input label="Total cost" type="number" value={fuel.cost} onChange={(v) => setFuel({ ...fuel, cost: v })} /><Input label="Odometer" type="number" value={fuel.odometer} onChange={(v) => setFuel({ ...fuel, odometer: v })} /><Input label="Supplier" value={fuel.supplier} onChange={(v) => setFuel({ ...fuel, supplier: v })} /><Input label="Linked trip" value={fuel.tripId} onChange={(v) => setFuel({ ...fuel, tripId: v })} options={trips.map((t) => t.id)} /></div><div className="form-row-actions"><button className="btn-primary" onClick={saveFuel} disabled={busy}>{busy ? "Saving…" : "Save Fuel Log"}</button><button className="btn-secondary" onClick={() => receiptInput.current?.click()} disabled={!receiptLog || busy}>Attach Receipt</button><input ref={receiptInput} hidden type="file" accept="image/*,application/pdf" onChange={(e) => { const file = e.target.files?.[0]; e.currentTarget.value = ""; if (file) void attachReceipt(file); }} /></div></div>
      <div className="form-card"><h3>Maintenance Work Order</h3><div className="form-grid"><Input label="Truck" value={work.truckId} onChange={(v) => setWork({ ...work, truckId: v })} options={trucks.map((t) => t.id)} /><Input label="Work type" value={work.type} onChange={(v) => setWork({ ...work, type: v })} options={["Scheduled service", "Repair", "Tyres", "Inspection finding", "Roadworthy preparation"]} /><Input label="Priority" value={work.priority} onChange={(v) => setWork({ ...work, priority: v })} options={["high", "medium", "low"]} /><Input label="Work required" value={work.required} onChange={(v) => setWork({ ...work, required: v })} /></div><div className="form-row-actions"><button className="btn-primary" onClick={saveWork}>Create Work Order</button><button className="btn-secondary" onClick={() => document.getElementById("po-form")?.scrollIntoView({ behavior: "smooth" })}>Create Supplier PO</button></div></div></div>
    <div id="po-form" className="form-card section"><h3>Supplier Purchase Order</h3><div className="form-grid"><Input label="Supplier" value={po.supplier} onChange={(v) => setPo({ ...po, supplier: v })} /><Input label="Truck" value={po.truckId} onChange={(v) => setPo({ ...po, truckId: v })} options={trucks.map((t) => t.id)} /><Input label="Description" value={po.description} onChange={(v) => setPo({ ...po, description: v })} /><Input label="Amount" type="number" value={po.amount} onChange={(v) => setPo({ ...po, amount: v })} /></div><div className="form-row-actions"><button className="btn-primary" onClick={savePO}>Create Supplier PO</button></div></div>
    <div className="panel section"><h3>Workshop & Fuel Register</h3><DemoTable headers={["Type", "Reference", "Truck", "Value / State", "Supplier"]} rows={[...fuelLogs.slice(0, 10).map((f) => ["Fuel", f.id.slice(0, 8), f.truckRegistration, `${f.litres} L · ${f.totalCost.toLocaleString()}`, f.supplier || "—"]), ...workOrders.slice(0, 10).map((w) => ["Work order", w.workOrderNumber, w.truckRegistration, w.status, w.workType]), ...supplierPOs.slice(0, 10).map((p) => ["Supplier PO", p.poNumber, p.truckRegistration || "—", `${p.currency} ${p.amount.toLocaleString()}`, p.supplier])]}/></div>
  </>;
}

function PerformanceView({ trucks, trips, deliveryNotes, invoices, fuelLogs, workOrders }: Data) {
  const active = trips.filter((t) => t.status !== "completed").length; const statuses = Array.from(new Set(trips.map((t) => t.status))); const revenue = invoices.reduce((s, i) => s + i.amount, 0); const fuel = fuelLogs.reduce((s, f) => s + f.totalCost, 0);
  return <><PageHeader title="Performance Dashboard" subtitle="Operating KPIs, fleet utilisation, delivery readiness and decision support." /><div className="kpi-dashboard-grid section"><Kpi label="Fleet" value={String(trucks.length)} note="Live trucks" /><Kpi label="Active trips" value={String(active)} note="Not completed" tone="blue" /><Kpi label="Delivery notes" value={String(deliveryNotes.length)} note="Current workspace" tone="green" /><Kpi label="Invoices" value={String(invoices.length)} note="Persisted billing" /><Kpi label="Revenue" value={revenue.toLocaleString()} note="Persisted invoice value" tone="green" /><Kpi label="Fuel cost" value={fuel.toLocaleString()} note="Persisted fuel logs" tone="orange" /><Kpi label="Open work orders" value={String(workOrders.filter((w) => w.status === "open").length)} note="Workshop queue" /></div><div className="chart-grid section"><div className="chart-panel"><h3>Fleet Status</h3><div className="bar-list">{(["available", "on_trip", "in_maintenance", "out_of_service"] as const).map((status) => { const count = trucks.filter((t) => t.status === status).length; const pct = trucks.length ? Math.round(count / trucks.length * 100) : 0; return <div className="bar-row" key={status}><span className="label">{status.replaceAll("_", " ")}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%` }} /></div><span className="bar-value">{count} · {pct}%</span></div>; })}</div></div><div className="chart-panel"><h3>Trip Status</h3><DemoTable headers={["Status", "Trips"]} rows={statuses.map((s) => [s.replaceAll("_", " "), String(trips.filter((t) => t.status === s).length)])} /></div></div></>;
}

function JournalView({ deliveryNotes, journalEntries }: Data) {
  const { activeOrg } = useWorkspace(); const { user } = useAuth();
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), type: "Customer receipt", reference: "", amount: "", description: "", debit: "Cash at bank", credit: "Accounts Receivable" }); const [message, setMessage] = useState<string | null>(null);
  const post = async () => { if (!activeOrg || !user || !form.amount) { setMessage("Amount is required."); return; } try { const ref = form.reference.trim() || `JE-${Date.now().toString(36).toUpperCase()}`; await journalEntriesRepo.create(activeOrg.id, user.uid, { entryDate: Timestamp.fromDate(new Date(`${form.date}T00:00:00`)), transactionType: form.type, reference: ref, amount: Number(form.amount), description: form.description.trim(), debitAccount: form.debit, creditAccount: form.credit }, "LIVE"); setMessage(`${ref} posted to the live journal.`); setForm({ ...form, reference: "", amount: "", description: "" }); } catch (err) { setMessage(err instanceof Error ? err.message : "Failed to post transaction."); } };
  const exportCsv = () => { const rows = [["Date", "Type", "Reference", "Amount", "Description", "Debit", "Credit"], ...journalEntries.map((j) => [j.entryDate.toDate().toISOString(), j.transactionType, j.reference, String(j.amount), j.description, j.debitAccount, j.creditAccount])]; const csv = rows.map((r) => r.map((v) => `"${v.replaceAll('"', '""')}"`).join(",")).join("\n"); const blob = new Blob([csv], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "translend-journal.csv"; a.click(); URL.revokeObjectURL(url); };
  return <><PageHeader title="Journal Entry" subtitle="Persisted financial posting workspace." action="Post transaction" onAction={post} /><ActionNotice message={message} /><DataNotice>Journal entries are now persisted in Firestore and feed the statement surfaces. Export is a local CSV export of the live journal.</DataNotice><div className="transaction-workspace section"><div className="form-card"><h3>Post Journal Entry</h3><div className="form-grid"><Input label="Date" type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} /><Input label="Transaction type" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={["Customer invoice", "Customer receipt", "Fuel expense", "Supplier invoice", "Subcontractor cost"]} /><Input label="Reference" value={form.reference} onChange={(v) => setForm({ ...form, reference: v })} /><Input label="Amount" type="number" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} /><Input label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} /><Input label="Debit account" value={form.debit} onChange={(v) => setForm({ ...form, debit: v })} options={["Cash at bank", "Accounts Receivable", "Fuel Expense", "Workshop Expense", "Supplier Payables", "Truck Fleet"]} /><Input label="Credit account" value={form.credit} onChange={(v) => setForm({ ...form, credit: v })} options={["Cash at bank", "Accounts Receivable", "Haulage Revenue", "Fuel Expense", "Supplier Payables"]} /></div><div className="transaction-actions"><button className="btn-primary" onClick={post}>Post Transaction</button><button className="btn-secondary" onClick={exportCsv}>Export CSV</button><button className="btn-ghost" onClick={() => setForm({ ...form, reference: "", amount: "", description: "" })}>Clear</button></div></div><div className="panel ledger-preview-panel"><h3>Ledger Preview</h3><div className="panel-sub">Live journal balance is represented by persisted entries.</div><div className="t-account-preview"><div className="t-account-box"><h4>Debit</h4><div className="t-account-row"><span>{form.debit}</span><strong>{form.amount || "—"}</strong></div></div><div className="t-account-box"><h4>Credit</h4><div className="t-account-row"><span>{form.credit}</span><strong>{form.amount || "—"}</strong></div></div></div><div className="ledger-output-queue"><div className="ledger-output-card"><div><strong>Delivery notes</strong><span>{deliveryNotes.length} live operational sources.</span></div><span className="badge blue">Source</span></div><div className="ledger-output-card"><div><strong>Journal</strong><span>{journalEntries.length} persisted entries.</span></div><span className="badge green">Live</span></div></div></div></div><div className="panel section"><h3>Recent Journal Entries</h3><DemoTable headers={["Date", "Type", "Reference", "Amount", "Debit", "Credit"]} rows={journalEntries.slice(0, 20).map((j) => [j.entryDate.toDate().toLocaleDateString(), j.transactionType, j.reference, j.amount.toLocaleString(), j.debitAccount, j.creditAccount])} /></div></>;
}

function StatementView({ title, subtitle, entries }: { title: string; subtitle: string; entries: JournalEntry[] }) {
  const debit = (account: string) => entries.filter((e) => e.debitAccount === account).reduce((s, e) => s + e.amount, 0);
  const credit = (account: string) => entries.filter((e) => e.creditAccount === account).reduce((s, e) => s + e.amount, 0);
  const revenue = credit("Haulage Revenue"); const fuel = debit("Fuel Expense"); const workshop = debit("Workshop Expense"); const cash = debit("Cash at bank") - credit("Cash at bank"); const receivable = debit("Accounts Receivable") - credit("Accounts Receivable"); const payables = credit("Supplier Payables") - debit("Supplier Payables"); const assets = cash + receivable + debit("Truck Fleet"); const liabilities = payables; const profit = revenue - fuel - workshop;
  const isTrial = title === "Trial Balance";
  const rows = isTrial ? ["Cash at bank", "Accounts Receivable", "Truck Fleet", "Fuel Expense", "Workshop Expense", "Supplier Payables", "Haulage Revenue"].map((a) => [a, debit(a).toLocaleString(), credit(a).toLocaleString()]) : title === "P&L Statement" ? [["Haulage Revenue", revenue.toLocaleString(), ""], ["Fuel Expense", "", fuel.toLocaleString()], ["Workshop Expense", "", workshop.toLocaleString()], ["Net operating result", profit.toLocaleString(), ""]] : title === "Cash Flow" ? [["Cash at bank movement", cash.toLocaleString(), ""], ["Customer receipts", credit("Accounts Receivable").toLocaleString(), ""], ["Fuel paid", fuel.toLocaleString(), ""], ["Workshop paid", workshop.toLocaleString(), ""]] : [["Cash at bank", cash.toLocaleString(), ""], ["Accounts receivable", receivable.toLocaleString(), ""], ["Truck fleet", debit("Truck Fleet").toLocaleString(), ""], ["Total assets", assets.toLocaleString(), ""], ["Supplier payables", liabilities.toLocaleString(), ""], ["Equity / retained result", (assets - liabilities).toLocaleString(), ""]];
  return <><PageHeader title={title} subtitle={subtitle} /><DataNotice>These figures are now derived only from persisted LIVE journal entries. No demo figures are used as accounting truth.</DataNotice><div className="kpi-grid"><Kpi label="Journal entries" value={String(entries.length)} note="Persisted LIVE entries" /><Kpi label="Revenue" value={revenue.toLocaleString()} note="Haulage Revenue credits" tone="green" /><Kpi label="Fuel expense" value={fuel.toLocaleString()} note="Fuel Expense debits" tone="orange" /><Kpi label="Net result" value={profit.toLocaleString()} note="Revenue less tracked expenses" tone={profit >= 0 ? "green" : "red"} /></div><div className="panel section"><h3>{isTrial ? "Trial Balance" : title}</h3><DemoTable headers={isTrial ? ["Account", "Debit", "Credit"] : ["Line", "Value", ""]} rows={rows as string[][]} /></div></>;
}
