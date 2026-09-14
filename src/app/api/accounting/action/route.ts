import { NextResponse } from "next/server";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

const ACCOUNTING_ROLES = new Set(["owner", "finance"]);

async function context(request: Request, orgId: string) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("Authentication required.");
  const user = await getAdminAuth().verifyIdToken(header.slice(7));
  const db = getAdminDb();
  const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
  if (!member.exists || member.data()?.status !== "active" || !ACCOUNTING_ROLES.has(String(member.data()?.role))) throw new Error("Accounting access required.");
  return { user, role: String(member.data()?.role), db };
}

async function openPeriod(db: Firestore, orgId: string, at: Timestamp) {
  const snap = await db.collection(`organizations/${orgId}/accountingPeriods`).where("environment", "==", "LIVE").where("status", "==", "open").where("deletedAt", "==", null).get();
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
    if (!orgId || !action) return NextResponse.json({ error: "Organisation and accounting action are required." }, { status: 400 });
    const { user, role, db } = await context(request, orgId);
    const actor = { orgId, uid: user.uid, role };

    if (action === "invoice_payment") {
      const invoiceId = String(body.invoiceId ?? "");
      const amount = Number(body.amount);
      const reference = String(body.reference ?? "").trim();
      const method = String(body.method ?? "bank_transfer");
      if (!invoiceId || !Number.isFinite(amount) || amount <= 0 || !reference) return NextResponse.json({ error: "Invoice, positive payment amount and reference are required." }, { status: 400 });
      const invoiceRef = db.doc(`organizations/${orgId}/invoices/${invoiceId}`);
      const paymentRef = db.collection(`organizations/${orgId}/invoicePayments`).doc();
      const journalRef = db.collection(`organizations/${orgId}/journalEntries`).doc();
      const auditRef = db.collection(`organizations/${orgId}/auditEvents`).doc();
      const paidAt = Timestamp.now();
      const fullyPaid = await db.runTransaction(async (tx) => {
        const invoiceSnap = await tx.get(invoiceRef);
        if (!invoiceSnap.exists || invoiceSnap.data()?.environment !== "LIVE") throw new Error("Live invoice not found.");
        const invoice = invoiceSnap.data()!;
        const existing = await tx.get(db.collection(`organizations/${orgId}/invoicePayments`).where("invoiceId", "==", invoiceId).where("environment", "==", "LIVE").where("deletedAt", "==", null));
        if (existing.docs.some((d) => String(d.data().reference ?? "").trim().toLowerCase() === reference.toLowerCase())) throw new Error("A payment with this reference is already recorded for this invoice.");
        const paid = existing.docs.reduce((sum, d) => sum + Number(d.data().amount || 0), 0);
        const outstanding = Math.max(0, Number(invoice.amount || 0) - paid);
        if (amount > outstanding) throw new Error(`Payment exceeds the outstanding balance of ${invoice.currency} ${outstanding.toFixed(2)}.`);
        if (!await openPeriod(db, orgId, paidAt)) throw new Error("No open accounting period covers the payment date.");
        const complete = paid + amount >= Number(invoice.amount || 0);
        const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
        tx.set(paymentRef, { ...base, invoiceId, invoiceNumber: invoice.invoiceNumber, customerId: invoice.customerId, customerName: invoice.customerName, amount, currency: invoice.currency, paidAt, reference, method });
        tx.update(invoiceRef, { status: complete ? "paid" : "issued", paidAt: complete ? paidAt : null, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        tx.set(journalRef, { ...base, entryDate: paidAt, transactionType: "Customer payment", reference, amount, description: `Payment received for ${invoice.invoiceNumber}`, debitAccount: "Cash at bank", creditAccount: "Accounts Receivable" });
        tx.set(auditRef, audit(actor, "create", "invoicePayment", paymentRef.id, `${complete ? "Full" : "Partial"} payment posted for ${invoice.invoiceNumber}.`, { invoiceId, amount, reference, fullyPaid: complete }));
        return complete;
      });
      return NextResponse.json({ ok: true, message: fullyPaid ? "Invoice fully paid and posted." : "Partial payment posted." });
    }

    if (action === "supplier_bill") {
      const supplier = String(body.supplier ?? "").trim();
      const reference = String(body.reference ?? "").trim();
      const amount = Number(body.amount);
      const dueAt = new Date(String(body.dueAt ?? ""));
      if (!supplier || !reference || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "Supplier, reference, positive amount and due date are required." }, { status: 400 });
      const billRef = db.collection(`organizations/${orgId}/supplierBills`).doc();
      const journalRef = db.collection(`organizations/${orgId}/journalEntries`).doc();
      const auditRef = db.collection(`organizations/${orgId}/auditEvents`).doc();
      const createdAt = Timestamp.now();
      await db.runTransaction(async (tx) => {
        const duplicate = await tx.get(db.collection(`organizations/${orgId}/supplierBills`).where("environment", "==", "LIVE").where("reference", "==", reference).where("supplier", "==", supplier).where("deletedAt", "==", null));
        if (!duplicate.empty) throw new Error("A supplier bill with this supplier and reference already exists.");
        if (!await openPeriod(db, orgId, createdAt)) throw new Error("No open accounting period covers the bill date.");
        const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
        tx.set(billRef, { ...base, supplierPOId: body.supplierPOId ? String(body.supplierPOId) : null, supplier, reference, amount, currency: String(body.currency ?? "BWP"), dueAt: Timestamp.fromDate(dueAt), status: "open", paidAt: null });
        tx.set(journalRef, { ...base, entryDate: createdAt, transactionType: "Supplier bill", reference, amount, description: `Supplier bill from ${supplier}`, debitAccount: "Operating Expense", creditAccount: "Accounts Payable" });
        tx.set(auditRef, audit(actor, "create", "supplierBill", billRef.id, `Supplier bill ${reference} created.`, { supplier, reference, amount }));
      });
      return NextResponse.json({ ok: true, message: "Supplier bill created and posted to Accounts Payable." });
    }

    if (action === "manual_journal" || action === "reverse_journal") {
      const sourceId = String(body.sourceId ?? "");
      let amount = Number(body.amount);
      const description = String(body.description ?? "").trim();
      let debitAccount = String(body.debitAccount ?? "").trim();
      let creditAccount = String(body.creditAccount ?? "").trim();
      const ref = db.collection(`organizations/${orgId}/journalEntries`).doc();
      const auditRef = db.collection(`organizations/${orgId}/auditEvents`).doc();
      const entryDate = Timestamp.now();
      await db.runTransaction(async (tx) => {
        let sourceData: Record<string, unknown> | undefined;
        if (action === "reverse_journal") {
          if (!sourceId) throw new Error("Source journal entry is required for a reversal.");
          const source = await tx.get(db.doc(`organizations/${orgId}/journalEntries/${sourceId}`));
          if (!source.exists || source.data()?.environment !== "LIVE") throw new Error("Source journal entry not found.");
          sourceData = source.data() as Record<string, unknown>;
          if (sourceData.reversedEntryId || sourceData.reversedById) throw new Error("This journal entry has already been reversed.");
          amount = Number(sourceData.amount);
          debitAccount = String(sourceData.creditAccount ?? "");
          creditAccount = String(sourceData.debitAccount ?? "");
        }
        if (!Number.isFinite(amount) || amount <= 0 || !debitAccount || !creditAccount || debitAccount === creditAccount || (!description && action === "manual_journal")) throw new Error("A positive amount, two different accounts and a description are required.");
        if (!await openPeriod(db, orgId, entryDate)) throw new Error("No open accounting period covers the journal date.");
        const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
        tx.set(ref, { ...base, entryDate, transactionType: action === "reverse_journal" ? "Reversal" : "Manual journal", reference: action === "reverse_journal" ? `REV-${sourceId.slice(0, 8).toUpperCase()}` : `JRN-${ref.id.slice(0, 8).toUpperCase()}`, amount, description: description || `Reversal of ${sourceId}`, debitAccount, creditAccount, reversedEntryId: action === "reverse_journal" ? sourceId : null });
        tx.set(auditRef, audit(actor, action === "reverse_journal" ? "reverse" : "create", "journalEntry", ref.id, action === "reverse_journal" ? `Journal ${sourceId.slice(0, 8)} reversed.` : "Manual journal posted.", { sourceId: sourceId || null, amount, debitAccount, creditAccount }));
        if (action === "reverse_journal") tx.update(db.doc(`organizations/${orgId}/journalEntries/${sourceId}`), { reversedById: ref.id, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
      });
      return NextResponse.json({ ok: true, message: action === "reverse_journal" ? "Reversal journal posted." : "Balanced journal entry posted." });
    }

    return NextResponse.json({ error: "Unsupported accounting action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Accounting action failed." }, { status: 409 });
  }
}
