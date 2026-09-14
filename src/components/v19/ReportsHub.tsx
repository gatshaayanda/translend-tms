"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Customer, Delivery, Driver, Job, Trip, Truck } from "@/types/core";
import type { FuelLog, Invoice, JournalEntry, SupplierPO, WorkOrder } from "@/types/finance";
import type { InvoicePayment, SupplierBill } from "@/types/business";
import type { MaintenanceSchedule, VehicleInspection } from "@/types/workshop";

type ReportData = { customers: Customer[]; trucks: Truck[]; drivers: Driver[]; jobs: Job[]; trips: Trip[]; deliveries: Delivery[]; fuel: FuelLog[]; workOrders: WorkOrder[]; maintenance: MaintenanceSchedule[]; inspections: VehicleInspection[]; invoices: Invoice[]; supplierPOs: SupplierPO[]; supplierBills: SupplierBill[]; payments: InvoicePayment[]; journals: JournalEntry[] };
const EMPTY: ReportData = { customers: [], trucks: [], drivers: [], jobs: [], trips: [], deliveries: [], fuel: [], workOrders: [], maintenance: [], inspections: [], invoices: [], supplierPOs: [], supplierBills: [], payments: [], journals: [] };
const money = (amount: number, currency = "") => `${currency ? `${currency} ` : ""}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const millis = (value: unknown) => { if (typeof value === "number") return value; if (value && typeof value === "object") { const candidate = value as { toMillis?: () => number; toDate?: () => Date }; if (candidate.toMillis) return candidate.toMillis(); if (candidate.toDate) return candidate.toDate().getTime(); } return 0; };
const date = (value: unknown) => { const ms = millis(value); return ms ? new Date(ms).toLocaleDateString() : "—"; };
const csv = (rows: Array<Record<string, unknown>>) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
};

export function ReportsHub({ orgId }: { orgId: string }) {
  const [data, setData] = useState<ReportData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"operations" | "fleet" | "pod" | "finance" | "customers">("operations");

  const loadReports = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const currentUser = (await import("@/lib/firebase/client")).getFirebase().auth.currentUser;
        if (!currentUser) throw new Error("Authentication required.");
        const token = await currentUser.getIdToken();
        const response = await fetch(`/api/reports?orgId=${encodeURIComponent(orgId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(String(payload.error ?? "Reports could not be loaded."));
        if (cancelled) return;
        setData((payload.data ?? EMPTY) as ReportData);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Reports could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  useEffect(() => loadReports(), [loadReports]);

  const operationsRows = useMemo(() => data.jobs.map((job) => {
    const trip = data.trips.find((item) => item.jobId === job.id);
    const delivery = trip ? data.deliveries.find((item) => item.tripId === trip.id) : undefined;
    return { job: job.jobNumber, customer: job.customerName, origin: job.origin, destination: job.destination, status: job.status, tripStatus: trip?.status ?? "unassigned", deliveryStatus: delivery?.status ?? "not created", rate: money(job.rate, job.currency) };
  }), [data]);

  const fleetRows = useMemo(() => data.trucks.map((truck) => ({ registration: truck.registrationNumber, status: truck.status, driver: data.drivers.find((driver) => driver.id === truck.assignedDriverId)?.fullName ?? "Unassigned", odometerKm: truck.odometerKm, fuelType: truck.fuelType, compliance: [truck.complianceExpiryDates.licenseDisc, truck.complianceExpiryDates.roadworthy, truck.complianceExpiryDates.insurance].some((item) => item && millis(item) < Date.now()) ? "expired" : "current" })), [data]);
  const podRows = useMemo(() => data.deliveries.map((delivery) => {
    const evidence = delivery.evidenceRefs ?? [];
    const required = evidence.filter((item) => item.required && item.status !== "replaced");
    const approvedRequired = required.filter((item) => item.status === "approved");
    const rejected = evidence.filter((item) => item.status === "rejected");
    const trip = data.trips.find((item) => item.id === delivery.tripId);
    return { delivery: delivery.deliveryNoteId ?? delivery.id.slice(0, 8), job: trip?.jobNumber ?? delivery.jobId, truck: trip?.truckRegistration ?? "—", status: delivery.status, podState: delivery.podState ?? "not_started", required: required.length, approvedRequired: approvedRequired.length, rejected: rejected.length, readiness: required.length > 0 && approvedRequired.length >= required.length ? "ready" : delivery.status === "exception" ? "exception" : "needs evidence" };
  }), [data]);
  const invoiceRows = useMemo(() => data.invoices.map((invoice) => ({ invoice: invoice.invoiceNumber, customer: invoice.customerName, status: invoice.status, amount: money(invoice.amount, invoice.currency), issued: date(invoice.issuedAt), due: date(invoice.dueAt), paid: date(invoice.paidAt) })), [data]);
  const customerRows = useMemo(() => data.customers.map((customer) => ({ customer: customer.name, status: customer.status, jobs: customer.stats.openJobs, activeTrips: customer.stats.activeTrips, outstanding: money(customer.stats.outstandingBalance, customer.currency), lastActivity: date(customer.stats.lastActivityAt) })), [data]);

  const exportRows = () => {
    const rows = tab === "operations" ? operationsRows : tab === "fleet" ? fleetRows : tab === "pod" ? podRows : tab === "finance" ? invoiceRows : customerRows;
    const blob = new Blob([csv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `translend-${tab}-report-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const activeTrips = data.trips.filter((item) => !["completed"].includes(item.status)).length;
  const openDeliveries = data.deliveries.filter((item) => item.status !== "delivered").length;
  const outstandingAR = data.invoices.filter((item) => item.status !== "paid" && item.status !== "void").reduce((sum, item) => sum + item.amount, 0);
  const fuelCost = data.fuel.reduce((sum, item) => sum + item.totalCost, 0);
  const openAP = data.supplierBills.filter((item) => item.status === "open").reduce((sum, item) => sum + item.amount, 0);
  const exceptions = data.deliveries.filter((item) => item.status === "exception").length;
  const podNeedsAttention = podRows.filter((row) => row.readiness !== "ready").length;

  return <div className="space-y-6 report-hub">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-xl font-semibold text-slate-900">Reports & Intelligence</h1><p className="mt-1 text-sm text-slate-600">Derived from LIVE Firestore records. No report data is fabricated.</p></div><div className="flex gap-2"><button onClick={() => loadReports()} disabled={loading} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">{loading ? "Refreshing…" : "Refresh"}</button><button onClick={() => window.print()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Print / PDF</button><button onClick={exportRows} disabled={loading} className="rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50">Export CSV</button></div></div>
    {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">{[["Active trips", activeTrips], ["Open deliveries", openDeliveries], ["POD attention", podNeedsAttention], ["Exceptions", exceptions], ["Outstanding AR", money(outstandingAR)], ["Open AP", money(openAP)], ["Fuel spend", money(fuelCost)]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-medium text-slate-600">{label}</p><p className="mt-1 text-lg font-semibold text-slate-900">{value}</p></div>)}</div>
    <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2 print:hidden">{(["operations", "fleet", "pod", "finance", "customers"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-md px-3 py-2 text-xs font-medium capitalize ${tab === item ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>{item === "pod" ? "POD readiness" : item}</button>)}</div>
    {loading ? <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-600">Loading LIVE report data…</div> : <>
      {tab === "operations" && <ReportTable title="Job → Trip → Delivery" rows={operationsRows} />}
      {tab === "fleet" && <ReportTable title="Fleet readiness and compliance" rows={fleetRows} />}
      {tab === "pod" && <ReportTable title="POD readiness and evidence review" rows={podRows} />}
      {tab === "finance" && <div className="space-y-5"><ReportTable title="Customer invoices" rows={invoiceRows} /><ReportTable title="Supplier bills" rows={data.supplierBills.map((bill) => ({ supplier: bill.supplier, reference: bill.reference, status: bill.status, amount: money(bill.amount, bill.currency), due: date(bill.dueAt), paid: date(bill.paidAt) }))} /><ReportTable title="Journal activity" rows={data.journals.map((entry) => ({ date: date(entry.entryDate), reference: entry.reference, type: entry.transactionType, debit: entry.debitAccount, credit: entry.creditAccount, amount: money(entry.amount) }))} /></div>}
      {tab === "customers" && <ReportTable title="Customer activity and exposure" rows={customerRows} />}
      <div className="grid gap-4 lg:grid-cols-3"><ReportTable title="Fuel by truck" rows={data.fuel.slice(0, 20).map((item) => ({ date: date(item.logDate), truck: item.truckRegistration, litres: item.litres, cost: money(item.totalCost), odometerKm: item.odometerKm }))} /><ReportTable title="Workshop work orders" rows={data.workOrders.slice(0, 20).map((item) => ({ number: item.workOrderNumber, truck: item.truckRegistration, type: item.workType, priority: item.priority, status: item.status }))} /><ReportTable title="Inspection results" rows={data.inspections.slice(0, 20).map((item) => ({ date: date(item.inspectionDate), truck: item.truckRegistration, type: item.inspectionType, result: item.result, odometerKm: item.odometerKm }))} /></div>
    </>}
    <p className="text-xs text-slate-500 print:hidden">Print / PDF uses the browser print dialog. Exported CSV contains the currently selected report table; report access is checked server-side.</p>
  </div>;
}

function ReportTable({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold text-slate-900">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{rows.length} records</p></div>{rows.length === 0 ? <p className="p-6 text-sm text-slate-600">No LIVE records available for this report.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr>{headers.map((header) => <th key={header} className="px-3 py-2 font-semibold uppercase tracking-wide">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{rows.map((row, index) => <tr key={index} className="hover:bg-slate-50">{headers.map((header) => <td key={header} className="px-3 py-2 text-slate-700">{String(row[header] ?? "—")}</td>)}</tr>)}</tbody></table></div>}</section>;
}
