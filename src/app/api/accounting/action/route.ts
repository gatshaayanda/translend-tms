import { NextResponse } from "next/server";
import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

const OPS_ROLES = new Set(["owner", "operations_manager", "finance"]);

async function context(request: Request, orgId: string) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("Authentication required.");
  const user = await getAdminAuth().verifyIdToken(header.slice(7));
  const db = getAdminDb();
  const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
  if (!member.exists || member.data()?.status !== "active" || !OPS_ROLES.has(String(member.data()?.role))) throw new Error("Accounting access required.");
  return { user, db };
}

async function openPeriod(db: Firestore, orgId: string, at: Timestamp) {
  const snap = await db.collection(`organizations/${orgId}/accountingPeriods`).where("environment", "==", "LIVE").where("status", "==", "open").where("deletedAt", "==", null).get();
  return snap.docs.find((d) => {
    const data = d.data();
    return data.startsAt?.toMillis() <= at.toMillis() && data.endsAt?.toMillis() >= at.toMillis();
  }) ?? null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const action = String(body.action ?? "");
    if (!orgId || !action) return NextResponse.json({ error: "Organisation and accounting action are required." }, { status: 400 });
    const { user, db } = await context(request, orgId);

    if (action === "invoice_payment") {
      const invoiceId = String(body.invoiceId ?? "");
      const amount = Number(body.amount);
      const reference = String(body.reference ?? "").trim();
      const method = String(body.method ?? "bank_transfer");
      if (!invoiceId || !Number.isFinite(amount) || amount <= 0 || !reference) return NextResponse.json({ error: "Invoice, positive payment amount and reference are required." }, { status: 400 });
      const invoiceRef = db.doc(`organizations/${orgId}/invoices/${invoiceId}`);
      const invoiceSnap = await invoiceRef.get();
      if (!invoiceSnap.exists || invoiceSnap.data()?.environment !== "LIVE") return NextResponse.json({ error: "Live invoice not found." }, { status: 404 });
      const invoice = invoiceSnap.data()!;
      const existing = await db.collection(`organizations/${orgId}/invoicePayments`).where("invoiceId", "==", invoiceId).where("environment", "==", "LIVE").where("deletedAt", "==", null).get();
      const paid = existing.docs.reduce((sum, d) => sum + Number(d.data().amount || 0), 0);
      const outstanding = Math.max(0, Number(invoice.amount || 0) - paid);
      if (amount > outstanding) return NextResponse.json({ error: `Payment exceeds the outstanding balance of ${invoice.currency} ${outstanding.toFixed(2)}.` }, { status: 409 });
      const paidAt = Timestamp.now();
      if (!await openPeriod(db, orgId, paidAt)) return NextResponse.json({ error: "No open accounting period covers the payment date." }, { status: 409 });
      const paymentRef = db.collection(`organizations/${orgId}/invoicePayments`).doc();
      const journalRef = db.collection(`organizations/${orgId}/journalEntries`).doc();
      const fullyPaid = paid + amount >= Number(invoice.amount || 0);
      const batch = db.batch();
      const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
      batch.set(paymentRef, { ...base, invoiceId, invoiceNumber: invoice.invoiceNumber, customerId: invoice.customerId, customerName: invoice.customerName, amount, currency: invoice.currency, paidAt, reference, method });
      batch.update(invoiceRef, { status: fullyPaid ? "paid" : "issued", paidAt: fullyPaid ? paidAt : null, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
      batch.set(journalRef, { ...base, entryDate: paidAt, transactionType: "Customer payment", reference, amount, description: `Payment received for ${invoice.invoiceNumber}`, debitAccount: "Cash at bank", creditAccount: "Accounts Receivable" });
      await batch.commit();
      return NextResponse.json({ ok: true, message: fullyPaid ? "Invoice fully paid and posted." : "Partial payment posted." });
    }

    if (action === "supplier_bill") {
      const supplier = String(body.supplier ?? "").trim();
      const reference = String(body.reference ?? "").trim();
      const amount = Number(body.amount);
      const dueAt = new Date(String(body.dueAt ?? ""));
      if (!supplier || !reference || !Number.isFinite(amount) || amount <= 0 || Number.isNaN(dueAt.getTime())) return NextResponse.json({ error: "Supplier, reference, positive amount and due date are required." }, { status: 400 });
      const createdAt = Timestamp.now();
      if (!await openPeriod(db, orgId, createdAt)) return NextResponse.json({ error: "No open accounting period covers the bill date." }, { status: 409 });
      const billRef = db.collection(`organizations/${orgId}/supplierBills`).doc();
      const journalRef = db.collection(`organizations/${orgId}/journalEntries`).doc();
      const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
      const batch = db.batch();
      batch.set(billRef, { ...base, supplierPOId: body.supplierPOId ? String(body.supplierPOId) : null, supplier, reference, amount, currency: String(body.currency ?? "BWP"), dueAt: Timestamp.fromDate(dueAt), status: "open", paidAt: null });
      batch.set(journalRef, { ...base, entryDate: createdAt, transactionType: "Supplier bill", reference, amount, description: `Supplier bill from ${supplier}`, debitAccount: "Operating Expense", creditAccount: "Accounts Payable" });
      await batch.commit();
      return NextResponse.json({ ok: true, message: "Supplier bill created and posted to Accounts Payable." });
    }

    if (action === "manual_journal" || action === "reverse_journal") {
      const sourceId = String(body.sourceId ?? "");
      const amount = Number(body.amount);
      const description = String(body.description ?? "").trim();
      let debitAccount = String(body.debitAccount ?? "").trim();
      let creditAccount = String(body.creditAccount ?? "").trim();
      if (action === "reverse_journal") {
        const source = await db.doc(`organizations/${orgId}/journalEntries/${sourceId}`).get();
        if (!source.exists || source.data()?.environment !== "LIVE") return NextResponse.json({ error: "Source journal entry not found." }, { status: 404 });
        const data = source.data()!;
        debitAccount = String(data.creditAccount); creditAccount = String(data.debitAccount);
      }
      if (!Number.isFinite(amount) || amount <= 0 || !debitAccount || !creditAccount || debitAccount === creditAccount || (!description && action === "manual_journal")) return NextResponse.json({ error: "A positive amount, two different accounts and a description are required." }, { status: 400 });
      const entryDate = Timestamp.now();
      if (!await openPeriod(db, orgId, entryDate)) return NextResponse.json({ error: "No open accounting period covers the journal date." }, { status: 409 });
      const ref = db.collection(`organizations/${orgId}/journalEntries`).doc();
      const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
      await ref.set({ ...base, entryDate, transactionType: action === "reverse_journal" ? "Reversal" : "Manual journal", reference: action === "reverse_journal" ? `REV-${sourceId.slice(0, 8).toUpperCase()}` : `JRN-${ref.id.slice(0, 8).toUpperCase()}`, amount, description: description || `Reversal of ${sourceId}`, debitAccount, creditAccount, reversedEntryId: action === "reverse_journal" ? sourceId : null });
      return NextResponse.json({ ok: true, message: action === "reverse_journal" ? "Reversal journal posted." : "Balanced journal entry posted." });
    }

    return NextResponse.json({ error: "Unsupported accounting action." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Accounting action failed." }, { status: 401 });
  }
}
