import type { Timestamp } from "firebase/firestore";
import type { BaseRecord } from "@/types/core";

export interface InvoicePayment extends BaseRecord {
  invoiceId: string; invoiceNumber: string; customerId: string; customerName: string;
  amount: number; currency: string; paidAt: Timestamp; reference: string; method: "cash"|"bank_transfer"|"mobile_money"|"other";
}
export interface SupplierBill extends BaseRecord {
  supplierPOId: string | null; supplier: string; reference: string; amount: number; currency: string;
  dueAt: Timestamp | null; status: "open"|"paid"|"cancelled"; paidAt: Timestamp | null;
}
export interface ChartAccount extends BaseRecord {
  code: string; name: string; category: "asset"|"liability"|"equity"|"revenue"|"expense"; active: boolean;
}
export interface AccountingPeriod extends BaseRecord {
  name: string; startsAt: Timestamp; endsAt: Timestamp; status: "open"|"closed";
}