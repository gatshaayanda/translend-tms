import { NextResponse } from "next/server";
import { FieldValue, Timestamp, type Firestore, type Transaction } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

const ACCOUNTING_ROLES = new Set(["owner", "finance"]);
const OPERATIONS_ROLES = new Set(["owner", "operations_manager", "dispatcher", "fleet_manager"]);

class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

async function context(request: Request, orgId: string) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Authentication required.");
  let user;
  try { user = await getAdminAuth().verifyIdToken(header.slice(7)); } catch { throw new ApiError(401, "Invalid authentication token."); }
  const db = getAdminDb();
  const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
  if (!member.exists || member.data()?.status !== "active") throw new ApiError(403, "Active workspace membership required.");
  return { user, role: String(member.data()?.role), db };
}

async function openPeriod(tx: Transaction, db: Firestore, orgId: string, at: Timestamp) {
  const query = db.collection(`organizations/${orgId}/accountingPeriods`).where("environment", "==", "LIVE").where("status", "==", "open").where("deletedAt", "==", null);
  const snap = await tx.get(query);
  return snap.docs.find((d) => {
    const data = d.data();
    return data.startsAt?.toMillis() <= at.toMillis() && data.endsAt?.toMillis() >= at.toMillis();
  }) ?? null;
}

function audit(base: { orgId: string; uid: string; role: string }, action: string, entityType: string, entityId: string, summary: string, metadata: Record<string, string | number | boolean | null> = {}) {
  const now = Timestamp.now();
  return { orgId: base.orgId, environment: "LIVE", createdAt: now, createdBy: base.uid, updatedAt: now, updatedBy: base.uid, deletedAt: null, actorUid: base.uid, actorRole: base.role, action, entityType, entityId, summary, metadata, occurredAt: now };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const action = String(body.action ?? "");
    if (!orgId || !action) throw new ApiError(400, "Organisation and finance action are required.");
    const { user, role, db } = await context(request, orgId);
    const actor = { orgId, uid: user.uid, role };

    if (action === "invoice_raise") {
      if (!ACCOUNTING_ROLES.has(role)) throw new ApiError(403, "Finance access required to raise invoices.");
      const deliveryNoteId = String(body.deliveryNoteId ?? "");
      const jobId = String(body.jobId ?? "");
      const customerId = String(body.customerId ?? "");
      if (!deliveryNoteId || !jobId || !customerId) throw new ApiError(400, "Delivery note, Job and Customer are required.");
      const noteRef = db.doc(`organizations/${orgId}/deliveryNotes/${deliveryNoteId}`);
      const jobRef = db.doc(`organizations/${orgId}/jobs/${jobId}`);
      const customerRef = db.doc(`organizations/${orgId}/customers/${customerId}`);
      const invoiceRef = db.collection(`organizations/${orgId}/invoices`).doc();
      const journalRef = db.collection(`organizations/${orgId}/journalEntries`).doc();
      const auditRef = db.collection(`organizations/${orgId}/auditEvents`).doc();
      const issuedAt = Timestamp.now();
      let invoiceNumber = "";
      await db.runTransaction(async (tx) => {
        const noteSnap = await tx.get(noteRef);
        const jobSnap = await tx.get(jobRef);
        const customerSnap = await tx.get(customerRef);
        if (!noteSnap.exists || noteSnap.data()?.environment !== "LIVE") throw new ApiError(404, "Live delivery note not found.");
        if (!jobSnap.exists || jobSnap.data()?.environment !== "LIVE") throw new ApiError(404, "Live Job not found.");
        if (!customerSnap.exists || customerSnap.data()?.environment !== "LIVE") throw new ApiError(404, "Live Customer not found.");
        const note = noteSnap.data()!;
        const job = jobSnap.data()!;
        const customer = customerSnap.data()!;
        if (note.jobId !== jobId || note.customerName !== customer.name) throw new ApiError(409, "Delivery note does not match the selected Job and Customer.");
        if (note.podState !== "complete") throw new ApiError(409, "Invoice can only be raised from a completed POD.");
        if (Number(job.rate) <= 0) throw new ApiError(400, "The linked Job must have a positive rate before invoicing.");
        if (job.customerId !== customerId) throw new ApiError(409, "The selected Customer does not match the Job.");
        const existing = await tx.get(db.collection(`organizations/${orgId}/invoices`).where("environment", "==", "LIVE").where("deliveryNoteId", "==", deliveryNoteId).where("deletedAt", "==", null));
        if (!existing.empty) throw new ApiError(409, "This completed delivery already has an invoice.");
        const reference = `INV-${invoiceRef.id.slice(0, 10).toUpperCase()}`;
        invoiceNumber = reference;
        const dueAt = Timestamp.fromMillis(issuedAt.toMillis() + Number(customer.paymentTermsDays || 0) * 86400000);
        if (!await openPeriod(tx, db, orgId, issuedAt)) throw new ApiError(409, "No open accounting period covers the invoice date.");
        const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
        tx.set(invoiceRef, { ...base, invoiceNumber: reference, deliveryNoteId, jobId, customerId, customerName: customer.name, amount: Number(job.rate), currency: String(job.currency || customer.currency || "BWP"), status: "issued", issuedAt, dueAt, paidAt: null });
        tx.set(journalRef, { ...base, entryDate: issuedAt, transactionType: "Customer invoice", reference, amount: Number(job.rate), description: `Invoice for ${note.noteReference}`, debitAccount: "Accounts Receivable", creditAccount: "Haulage Revenue", invoiceId: invoiceRef.id, deliveryNoteId, jobId, customerId });
        tx.set(auditRef, audit(actor, "create", "invoice", invoiceRef.id, `Invoice ${reference} raised from completed delivery.`, { deliveryNoteId, jobId, customerId, amount: Number(job.rate) }));
      });
      return NextResponse.json({ ok: true, invoiceId: invoiceRef.id, invoiceNumber, message: `${invoiceNumber} was raised and posted to Accounts Receivable.` });
    }

    if (action === "fuel_expense") {
      if (!OPERATIONS_ROLES.has(role)) throw new ApiError(403, "Operations access required to record fuel.");
      const truckId = String(body.truckId ?? "");
      const litres = Number(body.litres);
      const totalCost = Number(body.totalCost);
      const odometerKm = Number(body.odometerKm || 0);
      const supplier = String(body.supplier ?? "").trim();
      const tripId = body.tripId ? String(body.tripId) : null;
      const logDateMillis = Number(body.logDateMillis);
      if (!truckId || !Number.isFinite(litres) || litres <= 0 || !Number.isFinite(totalCost) || totalCost <= 0 || !Number.isFinite(odometerKm) || odometerKm < 0 || !Number.isFinite(logDateMillis)) throw new ApiError(400, "Truck, positive litres, positive cost, valid odometer and date are required.");
      const truckRef = db.doc(`organizations/${orgId}/trucks/${truckId}`);
      const fuelRef = db.collection(`organizations/${orgId}/fuelLogs`).doc();
      const journalRef = db.collection(`organizations/${orgId}/journalEntries`).doc();
      const auditRef = db.collection(`organizations/${orgId}/auditEvents`).doc();
      const logDate = Timestamp.fromMillis(logDateMillis);
      await db.runTransaction(async (tx) => {
        const truckSnap = await tx.get(truckRef);
        if (!truckSnap.exists || truckSnap.data()?.environment !== "LIVE") throw new ApiError(404, "Live truck not found.");
        if (tripId) {
          const tripSnap = await tx.get(db.doc(`organizations/${orgId}/trips/${tripId}`));
          if (!tripSnap.exists || tripSnap.data()?.environment !== "LIVE") throw new ApiError(404, "Linked live trip not found.");
          if (tripSnap.data()?.truckId !== truckId) throw new ApiError(409, "Linked trip does not belong to the selected truck.");
        }
        const truck = truckSnap.data()!;
        const now = Timestamp.now();
        if (logDate.toMillis() > now.toMillis() + 86400000) throw new ApiError(400, "Fuel date cannot be more than one day in the future.");
        if (!await openPeriod(tx, db, orgId, logDate)) throw new ApiError(409, "No open accounting period covers the fuel date.");
        const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
        const reference = `FUEL-${fuelRef.id.slice(0, 8).toUpperCase()}`;
        tx.set(fuelRef, { ...base, logDate, truckId, truckRegistration: truck.registrationNumber, litres, totalCost, odometerKm, supplier, tripId, deliveryNoteId: null, receiptUrl: null, receiptKey: null });
        tx.set(journalRef, { ...base, entryDate: logDate, transactionType: "Fuel expense", reference, amount: totalCost, description: `Fuel for ${truck.registrationNumber}`, debitAccount: "Fuel Expense", creditAccount: "Cash at bank", fuelLogId: fuelRef.id, tripId });
        tx.set(auditRef, audit(actor, "create", "fuelLog", fuelRef.id, `Fuel expense ${reference} recorded.`, { truckId, tripId, litres, totalCost }));
      });
      return NextResponse.json({ ok: true, fuelLogId: fuelRef.id, message: "Fuel log saved and the fuel expense was posted to the journal." });
    }

    if (action === "manual_journal") {
      if (!ACCOUNTING_ROLES.has(role)) throw new ApiError(403, "Finance access required for journal posting.");
      const amount = Number(body.amount);
      const description = String(body.description ?? "").trim();
      const debitAccount = String(body.debitAccount ?? "").trim();
      const creditAccount = String(body.creditAccount ?? "").trim();
      const reference = String(body.reference ?? "").trim();
      const transactionType = String(body.transactionType ?? "Manual journal").trim();
      const entryDateMillis = Number(body.entryDateMillis);
      const entryDate = Number.isFinite(entryDateMillis) ? Timestamp.fromMillis(entryDateMillis) : Timestamp.now();
      const ref = db.collection(`organizations/${orgId}/journalEntries`).doc();
      const auditRef = db.collection(`organizations/${orgId}/auditEvents`).doc();
      await db.runTransaction(async (tx) => {
        if (!Number.isFinite(amount) || amount <= 0 || !debitAccount || !creditAccount || debitAccount === creditAccount || !description) throw new ApiError(400, "A positive amount, two different accounts and a description are required.");
        if (!await openPeriod(tx, db, orgId, entryDate)) throw new ApiError(409, "No open accounting period covers the journal date.");
        if (reference) {
          const duplicate = await tx.get(db.collection(`organizations/${orgId}/journalEntries`).where("environment", "==", "LIVE").where("reference", "==", reference).where("deletedAt", "==", null));
          if (!duplicate.empty) throw new ApiError(409, "A journal entry with this reference already exists.");
        }
        const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
        tx.set(ref, { ...base, entryDate, transactionType, reference: reference || `JRN-${ref.id.slice(0, 8).toUpperCase()}`, amount, description, debitAccount, creditAccount });
        tx.set(auditRef, audit(actor, "create", "journalEntry", ref.id, "Manual journal posted.", { amount, debitAccount, creditAccount, reference: reference || null }));
      });
      return NextResponse.json({ ok: true, journalEntryId: ref.id, message: "Balanced journal entry posted." });
    }

    if (action === "invoice_payment") {
      if (!ACCOUNTING_ROLES.has(role)) throw new ApiError(403, "Finance access required for invoice payment.");
      const invoiceId = String(body.invoiceId ?? "");
      const amount = Number(body.amount);
      const reference = String(body.reference ?? "").trim();
      const method = String(body.method ?? "bank_transfer");
      if (!invoiceId || !Number.isFinite(amount) || amount <= 0 || !reference) throw new ApiError(400, "Invoice, positive payment amount and reference are required.");
      const invoiceRef = db.doc(`organizations/${orgId}/invoices/${invoiceId}`);
      const paymentRef = db.collection(`organizations/${orgId}/invoicePayments`).doc();
      const journalRef = db.collection(`organizations/${orgId}/journalEntries`).doc();
      const auditRef = db.collection(`organizations/${orgId}/auditEvents`).doc();
      const paidAt = Timestamp.now();
      const fullyPaid = await db.runTransaction(async (tx) => {
        const invoiceSnap = await tx.get(invoiceRef);
        if (!invoiceSnap.exists || invoiceSnap.data()?.environment !== "LIVE") throw new ApiError(404, "Live invoice not found.");
        const invoice = invoiceSnap.data()!;
        const existing = await tx.get(db.collection(`organizations/${orgId}/invoicePayments`).where("invoiceId", "==", invoiceId).where("environment", "==", "LIVE").where("deletedAt", "==", null));
        if (existing.docs.some((d) => String(d.data().reference ?? "").trim().toLowerCase() === reference.toLowerCase())) throw new ApiError(409, "A payment with this reference is already recorded for this invoice.");
        const paid = existing.docs.reduce((sum, d) => sum + Number(d.data().amount || 0), 0);
        const outstanding = Math.max(0, Number(invoice.amount || 0) - paid);
        if (amount > outstanding) throw new ApiError(409, `Payment exceeds the outstanding balance of ${invoice.currency} ${outstanding.toFixed(2)}.`);
        if (!await openPeriod(tx, db, orgId, paidAt)) throw new ApiError(409, "No open accounting period covers the payment date.");
        const complete = paid + amount >= Number(invoice.amount || 0);
        const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
        tx.set(paymentRef, { ...base, invoiceId, invoiceNumber: invoice.invoiceNumber, customerId: invoice.customerId, customerName: invoice.customerName, amount, currency: invoice.currency, paidAt, reference, method });
        tx.update(invoiceRef, { status: complete ? "paid" : "issued", paidAt: complete ? paidAt : null, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        tx.set(journalRef, { ...base, entryDate: paidAt, transactionType: "Customer payment", reference, amount, description: `Payment received for ${invoice.invoiceNumber}`, debitAccount: "Cash at bank", creditAccount: "Accounts Receivable", invoiceId });
        tx.set(auditRef, audit(actor, "create", "invoicePayment", paymentRef.id, `${complete ? "Full" : "Partial"} payment posted for ${invoice.invoiceNumber}.`, { invoiceId, amount, reference, fullyPaid: complete }));
        return complete;
      });
      return NextResponse.json({ ok: true, message: fullyPaid ? "Invoice fully paid and posted." : "Partial payment posted." });
    }

    if (action === "supplier_bill") {
      if (!ACCOUNTING_ROLES.has(role)) throw new ApiError(403, "Finance access required for supplier bills.");
      const supplier = String(body.supplier ?? "").trim();
      const reference = String(body.reference ?? "").trim();
      const amount = Number(body.amount);
      const dueAt = new Date(String(body.dueAt ?? ""));
      if (!supplier || !reference || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(dueAt.getTime())) throw new ApiError(400, "Supplier, reference, positive amount and due date are required.");
      const billRef = db.collection(`organizations/${orgId}/supplierBills`).doc();
      const journalRef = db.collection(`organizations/${orgId}/journalEntries`).doc();
      const auditRef = db.collection(`organizations/${orgId}/auditEvents`).doc();
      const createdAt = Timestamp.now();
      await db.runTransaction(async (tx) => {
        const duplicate = await tx.get(db.collection(`organizations/${orgId}/supplierBills`).where("environment", "==", "LIVE").where("reference", "==", reference).where("supplier", "==", supplier).where("deletedAt", "==", null));
        if (!duplicate.empty) throw new ApiError(409, "A supplier bill with this supplier and reference already exists.");
        if (!await openPeriod(tx, db, orgId, createdAt)) throw new ApiError(409, "No open accounting period covers the bill date.");
        const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
        tx.set(billRef, { ...base, supplierPOId: body.supplierPOId ? String(body.supplierPOId) : null, supplier, reference, amount, currency: String(body.currency ?? "BWP"), dueAt: Timestamp.fromDate(dueAt), status: "open", paidAt: null });
        tx.set(journalRef, { ...base, entryDate: createdAt, transactionType: "Supplier bill", reference, amount, description: `Supplier bill from ${supplier}`, debitAccount: "Operating Expense", creditAccount: "Accounts Payable", supplierBillId: billRef.id });
        tx.set(auditRef, audit(actor, "create", "supplierBill", billRef.id, `Supplier bill ${reference} created.`, { supplier, reference, amount }));
      });
      return NextResponse.json({ ok: true, supplierBillId: billRef.id, message: "Supplier bill created and posted to Accounts Payable." });
    }

    if (action === "reverse_journal") {
      if (!ACCOUNTING_ROLES.has(role)) throw new ApiError(403, "Finance access required for journal reversal.");
      const sourceId = String(body.sourceId ?? "");
      if (!sourceId) throw new ApiError(400, "Source journal entry is required for a reversal.");
      const ref = db.collection(`organizations/${orgId}/journalEntries`).doc();
      const auditRef = db.collection(`organizations/${orgId}/auditEvents`).doc();
      const entryDate = Timestamp.now();
      await db.runTransaction(async (tx) => {
        const sourceRef = db.doc(`organizations/${orgId}/journalEntries/${sourceId}`);
        const source = await tx.get(sourceRef);
        if (!source.exists || source.data()?.environment !== "LIVE") throw new ApiError(404, "Source journal entry not found.");
        const sourceData = source.data()!;
        if (sourceData.reversedEntryId || sourceData.reversedById) throw new ApiError(409, "This journal entry has already been reversed.");
        const amount = Number(sourceData.amount);
        const debitAccount = String(sourceData.creditAccount ?? "");
        const creditAccount = String(sourceData.debitAccount ?? "");
        if (!Number.isFinite(amount) || amount <= 0 || !debitAccount || !creditAccount || debitAccount === creditAccount) throw new ApiError(409, "Source journal entry cannot be reversed safely.");
        if (!await openPeriod(tx, db, orgId, entryDate)) throw new ApiError(409, "No open accounting period covers the reversal date.");
        const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
        tx.set(ref, { ...base, entryDate, transactionType: "Reversal", reference: `REV-${sourceId.slice(0, 8).toUpperCase()}`, amount, description: `Reversal of ${sourceId}`, debitAccount, creditAccount, reversedEntryId: sourceId });
        tx.set(auditRef, audit(actor, "reverse", "journalEntry", ref.id, `Journal ${sourceId.slice(0, 8)} reversed.`, { sourceId, amount, debitAccount, creditAccount }));
        tx.update(sourceRef, { reversedById: ref.id, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
      });
      return NextResponse.json({ ok: true, message: "Reversal journal posted." });
    }

    throw new ApiError(400, "Unsupported finance action.");
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Finance action failed." }, { status });
  }
}
