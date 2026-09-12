// =============================================================
// Module repositories — thin, named wrappers around the generic
// repository factory. One export per business collection.
// =============================================================

import { createRepository } from "./repository";
import type {
  Customer,
  Truck,
  Driver,
  Job,
  Trip,
  Delivery,
  DeliveryNote,
  DeliveryException,
} from "@/types/core";
import type { FuelLog, WorkOrder, SupplierPO, Invoice, JournalEntry } from "@/types/finance";

export const customersRepo = createRepository<Customer>("customers");
export const trucksRepo = createRepository<Truck>("trucks");
export const driversRepo = createRepository<Driver>("drivers");
export const jobsRepo = createRepository<Job>("jobs");
export const tripsRepo = createRepository<Trip>("trips");
export const deliveriesRepo = createRepository<Delivery>("deliveries");
export const deliveryNotesRepo = createRepository<DeliveryNote>("deliveryNotes");
export const deliveryExceptionsRepo = createRepository<DeliveryException>("deliveryExceptions");
export const fuelLogsRepo = createRepository<FuelLog>("fuelLogs");
export const workOrdersRepo = createRepository<WorkOrder>("workOrders");
export const supplierPOsRepo = createRepository<SupplierPO>("supplierPOs");
export const invoicesRepo = createRepository<Invoice>("invoices");
export const journalEntriesRepo = createRepository<JournalEntry>("journalEntries");
