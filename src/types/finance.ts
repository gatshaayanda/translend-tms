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
  /** Gross invoice amount used for payment/AR settlement. */
  amount: number;
  /** Authoritative tax breakdown captured when the invoice is issued. */
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  taxRate?: number;
  taxCode?: string;
  taxMode?: "exclusive" | "inclusive";
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
  subtotalAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  taxRate?: number;
  taxCode?: string;
  taxMode?: "exclusive" | "inclusive";
  currency: string;
  status: InvoiceStatus;
  issuedAt: Timestamp | null;
  dueAt: Timestamp | null;
  paidAt: Timestamp | null;
}

export interface JournalLine { account: string; side: "debit" | "credit"; amount: number; }

export interface JournalEntry extends BaseRecord {
  entryDate: Timestamp;
  transactionType: string;
  reference: string;
  amount: number;
  description: string;
  debitAccount: string;
  creditAccount: string;
  lines?: JournalLine[];
}
