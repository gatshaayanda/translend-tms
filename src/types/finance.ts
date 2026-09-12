import type { Timestamp } from "firebase/firestore";
import type { BaseRecord } from "@/types/core";

export type FinanceRecordStatus = "open" | "approved" | "completed" | "cancelled";
export type InvoiceStatus = "draft" | "issued" | "paid" | "void";

export interface FuelLog extends BaseRecord {
  logDate: Timestamp;
  truckId: string;
  truckRegistration: string;
  litres: number;
  totalCost: number;
  odometerKm: number;
  supplier: string;
  tripId: string | null;
  deliveryNoteId: string | null;
  receiptUrl: string | null;
  receiptKey: string | null;
}

export interface WorkOrder extends BaseRecord {
  workOrderNumber: string;
  truckId: string;
  truckRegistration: string;
  workType: string;
  priority: "high" | "medium" | "low";
  workRequired: string;
  status: FinanceRecordStatus;
  supplierPoId: string | null;
}

export interface SupplierPO extends BaseRecord {
  poNumber: string;
  supplier: string;
  truckId: string | null;
  truckRegistration: string | null;
  description: string;
  amount: number;
  currency: string;
  status: FinanceRecordStatus;
  workOrderId: string | null;
}

export interface Invoice extends BaseRecord {
  invoiceNumber: string;
  deliveryNoteId: string;
  jobId: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: Timestamp | null;
  dueAt: Timestamp | null;
  paidAt: Timestamp | null;
}

export interface JournalEntry extends BaseRecord {
  entryDate: Timestamp;
  transactionType: string;
  reference: string;
  amount: number;
  description: string;
  debitAccount: string;
  creditAccount: string;
}
