import { createRepository } from "./repository";
import { getFirebase } from "./client";
import type { Customer, Truck, Driver, Job, Trip, Delivery, DeliveryNote, DeliveryException } from "@/types/core";
import type { FuelLog, WorkOrder, SupplierPO, Invoice, JournalEntry } from "@/types/finance";
import type { TripMetrics } from "@/types/fleet";
import type { TruckLocationEvent } from "@/types/location";
import type { MaintenanceSchedule, VehicleInspection, TyreRecord } from "@/types/workshop";
import type { InvoicePayment, SupplierBill, ChartAccount, AccountingPeriod } from "@/types/business";
import type { NotificationRecord } from "@/types/notifications";

async function postFinanceAction(orgId: string, action: string, body: Record<string, unknown>) {
  const currentUser = getFirebase().auth.currentUser;
  if (!currentUser) throw new Error("Authentication required.");
  const token = await currentUser.getIdToken();
  const response = await fetch("/api/accounting/action", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ orgId, action, ...body }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(payload.error ?? "Finance action failed."));
  return payload as { ok: true; message?: string; invoiceId?: string; invoiceNumber?: string; fuelLogId?: string; journalEntryId?: string; paymentId?: string };
}

export const customersRepo = createRepository<Customer>("customers");
export const trucksRepo = createRepository<Truck>("trucks");
export const driversRepo = createRepository<Driver>("drivers");
export const jobsRepo = createRepository<Job>("jobs");
export const tripsRepo = createRepository<Trip>("trips");
export const deliveriesRepo = createRepository<Delivery>("deliveries");
export const deliveryNotesRepo = createRepository<DeliveryNote>("deliveryNotes");
export const deliveryExceptionsRepo = createRepository<DeliveryException>("deliveryExceptions");
export const workOrdersRepo = createRepository<WorkOrder>("workOrders");
export const supplierPOsRepo = createRepository<SupplierPO>("supplierPOs");
export const tripMetricsRepo = createRepository<TripMetrics>("tripMetrics");
export const truckLocationEventsRepo = createRepository<TruckLocationEvent>("truckLocationEvents");
export const maintenanceSchedulesRepo = createRepository<MaintenanceSchedule>("maintenanceSchedules");
export const vehicleInspectionsRepo = createRepository<VehicleInspection>("vehicleInspections");
export const tyreRecordsRepo = createRepository<TyreRecord>("tyreRecords");

const invoicePaymentsBaseRepo = createRepository<InvoicePayment>("invoicePayments");
export const invoicePaymentsRepo = {
  ...invoicePaymentsBaseRepo,
  create: async (
    orgId: string,
    _uid: string,
    data: Omit<InvoicePayment, "id" | "orgId" | "environment" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "deletedAt">,
    _environment: "LIVE" | "DEMO" | "SEED" | "FIXTURE" = "LIVE",
  ) => {
    if (_environment !== "LIVE") throw new Error("Invoice payment creation is available only for LIVE records.");
    await postFinanceAction(orgId, "invoice_payment", {
      invoiceId: data.invoiceId,
      amount: data.amount,
      reference: data.reference,
      method: data.method,
    });
    return data.reference;
  },
};

export const supplierBillsRepo = createRepository<SupplierBill>("supplierBills");
export const chartAccountsRepo = createRepository<ChartAccount>("chartAccounts");
export const accountingPeriodsRepo = createRepository<AccountingPeriod>("accountingPeriods");
export const notificationsRepo = createRepository<NotificationRecord>("notifications");

const invoicesBaseRepo = createRepository<Invoice>("invoices");
export const invoicesRepo = {
  ...invoicesBaseRepo,
  create: async (orgId: string, _uid: string, data: Omit<Invoice, "id" | "orgId" | "environment" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "deletedAt">, _environment: "LIVE" | "DEMO" | "SEED" | "FIXTURE" = "LIVE") => {
    if (_environment !== "LIVE") throw new Error("Invoice creation is available only for LIVE records.");
    const result = await postFinanceAction(orgId, "invoice_raise", { deliveryNoteId: data.deliveryNoteId, jobId: data.jobId, customerId: data.customerId });
    if (!result.invoiceId) throw new Error("Invoice was created without an invoice id.");
    return result.invoiceId;
  },
};

const journalBaseRepo = createRepository<JournalEntry>("journalEntries");
export const journalEntriesRepo = {
  ...journalBaseRepo,
  create: async (orgId: string, _uid: string, data: Omit<JournalEntry, "id" | "orgId" | "environment" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "deletedAt">, _environment: "LIVE" | "DEMO" | "SEED" | "FIXTURE" = "LIVE") => {
    if (_environment !== "LIVE") throw new Error("Journal creation is available only for LIVE records.");
    if (data.transactionType === "Customer invoice" && data.reference.startsWith("INV-")) return `invoice-journal-${data.reference.slice(4)}`;
    if (data.transactionType === "Fuel expense" && data.reference.startsWith("FUEL-")) return `fuel-journal-${data.reference.slice(5)}`;
    const result = await postFinanceAction(orgId, "manual_journal", { amount: data.amount, description: data.description, debitAccount: data.debitAccount, creditAccount: data.creditAccount, reference: data.reference, transactionType: data.transactionType, entryDateMillis: data.entryDate.toMillis() });
    if (!result.journalEntryId) throw new Error("Journal entry was created without an id.");
    return result.journalEntryId;
  },
};

const fuelBaseRepo = createRepository<FuelLog>("fuelLogs");
export const fuelLogsRepo = {
  ...fuelBaseRepo,
  create: async (orgId: string, _uid: string, data: Omit<FuelLog, "id" | "orgId" | "environment" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy" | "deletedAt">, _environment: "LIVE" | "DEMO" | "SEED" | "FIXTURE" = "LIVE") => {
    if (_environment !== "LIVE") throw new Error("Fuel log creation is available only for LIVE records.");
    const result = await postFinanceAction(orgId, "fuel_expense", { truckId: data.truckId, litres: data.litres, totalCost: data.totalCost, odometerKm: data.odometerKm, supplier: data.supplier, tripId: data.tripId, logDateMillis: data.logDate.toMillis() });
    if (!result.fuelLogId) throw new Error("Fuel log was created without a fuel log id.");
    return result.fuelLogId;
  },
};
