"use client";

import { useEffect, useMemo, useState } from "react";
import { customersRepo, deliveriesRepo, driversRepo, fuelLogsRepo, invoicesRepo, jobsRepo, journalEntriesRepo, maintenanceSchedulesRepo, supplierBillsRepo, supplierPOsRepo, trucksRepo, tripsRepo, vehicleInspectionsRepo, workOrdersRepo } from "@/lib/firebase/modules";
import type { Customer, Delivery, Driver, Job, Trip, Truck } from "@/types/core";
import type { FuelLog, Invoice, JournalEntry, SupplierPO, WorkOrder } from "@/types/finance";
import type { InvoicePayment, SupplierBill } from "@/types/business";
import type { MaintenanceSchedule, VehicleInspection } from "@/types/workshop";

type ReportData = { customers: Customer[]; trucks: Truck[]; drivers: Driver[]; jobs: Job[]; trips: Trip[]; deliveries: Delivery[]; fuel: FuelLog[]; workOrders: WorkOrder[]; maintenance: MaintenanceSchedule[]; inspections: VehicleInspection[]; invoices: Invoice[]; supplierPOs: SupplierPO[]; supplierBills: SupplierBill[]; payments: InvoicePayment[]; journals: JournalEntry[] };
const EMPTY: ReportData = { customers: [], trucks: [], drivers: [], jobs: [], trips: [], deliveries: [], fuel: [], workOrders: [], maintenance: [], inspections: [], invoices: [], supplierPOs: [], supplierBills: [], payments: [], journals: [] };
const money = (amount: number, currency = "") => `${currency ? `${currency} ` : ""}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (value: { toDate?: () => Date } | null | undefined) => value?.toDate ? value.toDate().toLocaleDateString() : "—";
const csv = (rows: Array<Record<string, unknown>>) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  return [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
};

export function ReportsHub({ orgId }: { orgId: string }) {
  const [data, setData] = useState<ReportData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"operations" | "fleet" | "finance" | "customers">("operations");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      customersRepo.list(orgId, { environment: "LIVE" }), trucksRepo.list(orgId, { environment: "LIVE" }), driversRepo.list(orgId, { environment: "LIVE" }),
      jobsRepo.list(orgId, { environment: "LIVE" }), tripsRepo.list(orgId, { environment: "LIVE" }), deliveriesRepo.list(orgId, { environment: "LIVE" }),
      fuelLogsRepo.list(orgId, { environment: "LIVE" }), workOrdersRepo.list(orgId, { environment: "LIVE" }), maintenanceSchedulesRepo.list(orgId, { environment: "LIVE" }), vehicleInspectionsRepo.list(orgId, { environment: "LIVE" }),
      invoicesRepo.list(orgId, { environment: "LIVE" }), supplierPOsRepo.list(orgId, { environment: "LIVE" }), supplierBillsRepo.list(orgId, { environment: "LIVE" }),
      // These collections are finance-controlled but read-only for the reporting surface; Firestore rules decide access.
      import("@/lib/firebase/modules").then(({ invoicePaymentsRepo }) => invoicePaymentsRepo.list(orgId, { environment: "LIVE" })),
      journalEntriesRepo.list(orgId, { environment: "LIVE" }),
    ]).then(([customers, trucks, drivers, jobs, trips, deliveries, fuel, workOrders, maintenance, inspections, invoices, supplierPOs, supplierBills, payments, journals]) => {
      if (cancelled) return;
      setData({ customers, trucks, drivers, jobs, trips, deliveries, fuel, workOrders, maintenance, inspections, invoices, supplierPOs, supplierBills, payments: payments as InvoicePayment[], journals });
      setError(null);
    }).catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Reports could not be loaded."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orgId]);

  const operationsRows = useMemo(() => data.jobs.map((job) => {
    const trip = data.trips.find((item) => item.jobId === job.id);
    const delivery = trip ? data.deliveries.find((item) => item.tripId === trip.id) : undefined;
    return { job: job.jobNumber, customer: job.customerName, origin: job.origin, destination: job.destination, status: job.status, tripStatus: trip?.status ?? "unassigned", deliveryStatus: delivery?.status ?? "not created", rate: money(job.rate, job.currency) };
  }), [data]);

  const fleetRows = useMemo(() => data.trucks.map((truck) => ({ registration: truck.registrationNumber, status: truck.status, driver: data.drivers.find((driver) => driver.id === truck.assignedDriverId)?.fullName ?? "Unassigned", odometerKm: truck.odometerKm, fuelType: truck.fuelType, compliance: [truck.complianceExpiryDates.licenseDisc, truck.complianceExpiryDates.roadworthy, truck.complianceExpiryDates.insurance].some((item) => item && item.toDate() < new Date()) ? "expired" : "current" })), [data]);
  const invoiceRows = useMemo(() => data.invoices.map((invoice) => ({ invoice: invoice.invoiceNumber, customer: invoice.customerName, status: invoice.status, amount: money(invoice.amount, invoice.currency), issued: date(invoice.issuedAt), due: date(invoice.dueAt), paid: date(invoice.paidAt) })), [data]);
  const customerRows = useMemo(() => data.customers.map((customer) => ({ customer: customer.name, status: customer.status, jobs: customer.stats.openJobs, activeTrips: customer.stats.activeTrips, outstanding: money(customer.stats.outstandingBalance, customer.currency), lastActivity: date(customer.stats.lastActivityAt) })), [data]);

  const exportRows = () => {
    const rows = tab === "operations" ? operationsRows : tab === "fleet" ? fleetRows : tab === "finance" ? invoiceRows : customerRows;
    const blob = new Blob([csv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `translend-${tab}-report-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const activeTrips = data.trips.filter((item) => !["completed"].includes(item.status)).length;
  const openDeliveries = data.deliveries.filter((item) => item.status !== "delivered").length;
  const outstandingAR = data.invoices.filter((item) => item.status !== "paid" && item.status !== "void").reduce((sum, item) => sum + item.amount, 0);
  const fuelCost = data.fuel.reduce((sum, item) => sum + item.totalCost, 0);
  const openAP = data.supplierBills.filter((item) => item.status === "open").reduce((sum, item) => sum + item.amount, 0);
  const exceptions = data.deliveries.filter((item) => item.status === "exception").length;

  return <div className="space-y-6 print:text-black">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-xl font-semibold text-slate-50">Reports & Intelligence</h1><p className="mt-1 text-sm text-slate-400">Derived from LIVE Firestore records. No report data is fabricated.</p></div><div className="flex gap-2"><button onClick={() => window.print()} className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800">Print / PDF</button><button onClick={exportRows} disabled={loading} className="rounded-md bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50">Export CSV</button></div></div>
    {error && <div className="rounded-md border border-red-900/50 bg-red-950/30 p-3 text-sm text-red-300">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{[["Active trips", activeTrips], ["Open deliveries", openDeliveries], ["Exceptions", exceptions], ["Outstanding AR", money(outstandingAR)], ["Open AP", money(openAP)], ["Fuel spend", money(fuelCost)]].map(([label, value]) => <div key={String(label)} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-lg font-semibold text-slate-100">{value}</p></div>)}</div>
    <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2 print:hidden">{(["operations", "fleet", "finance", "customers"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-md px-3 py-2 text-xs font-medium capitalize ${tab === item ? "bg-sky-600 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"}`}>{item}</button>)}</div>
    {loading ? <div className="rounded-lg border border-slate-800 p-8 text-sm text-slate-500">Loading LIVE report data…</div> : <>
      {tab === "operations" && <ReportTable title="Job → Trip → Delivery" rows={operationsRows} />}
      {tab === "fleet" && <ReportTable title="Fleet readiness and compliance" rows={fleetRows} />}
      {tab === "finance" && <div className="space-y-5"><ReportTable title="Customer invoices" rows={invoiceRows} /><ReportTable title="Supplier bills" rows={data.supplierBills.map((bill) => ({ supplier: bill.supplier, reference: bill.reference, status: bill.status, amount: money(bill.amount, bill.currency), due: date(bill.dueAt), paid: date(bill.paidAt) }))} /><ReportTable title="Journal activity" rows={data.journals.map((entry) => ({ date: date(entry.entryDate), reference: entry.reference, type: entry.transactionType, debit: entry.debitAccount, credit: entry.creditAccount, amount: money(entry.amount) }))} /></div>}
      {tab === "customers" && <ReportTable title="Customer activity and exposure" rows={customerRows} />}
      <div className="grid gap-4 lg:grid-cols-3"><ReportTable title="Fuel by truck" rows={data.fuel.slice(0, 20).map((item) => ({ date: date(item.logDate), truck: item.truckRegistration, litres: item.litres, cost: money(item.totalCost), odometerKm: item.odometerKm }))} /><ReportTable title="Workshop work orders" rows={data.workOrders.slice(0, 20).map((item) => ({ number: item.workOrderNumber, truck: item.truckRegistration, type: item.workType, priority: item.priority, status: item.status }))} /><ReportTable title="Inspection results" rows={data.inspections.slice(0, 20).map((item) => ({ date: date(item.inspectionDate), truck: item.truckRegistration, type: item.inspectionType, result: item.result, odometerKm: item.odometerKm }))} /></div>
    </>}
    <p className="text-xs text-slate-600 print:hidden">Print / PDF uses the browser print dialog. Exported CSV contains the currently selected report table; finance access remains governed by Firestore permissions.</p>
  </div>;
}

function ReportTable({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60"><div className="border-b border-slate-800 px-4 py-3"><h2 className="text-sm font-semibold text-slate-200">{title}</h2><p className="mt-0.5 text-xs text-slate-600">{rows.length} records</p></div>{rows.length === 0 ? <p className="p-6 text-sm text-slate-600">No LIVE records available for this report.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-900 text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-3 py-2 font-medium uppercase tracking-wide">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-800">{rows.map((row, index) => <tr key={index} className="hover:bg-slate-900/50">{headers.map((header) => <td key={header} className="px-3 py-2 text-slate-300">{String(row[header] ?? "—")}</td>)}</tr>)}</tbody></table></div>}</section>;
}
