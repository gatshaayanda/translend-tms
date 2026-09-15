import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

const ROLES = new Set(["owner", "finance"]);
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

async function context(request: Request, orgId: string) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Authentication required.");
  let user;
  try { user = await getAdminAuth().verifyIdToken(header.slice(7)); } catch { throw new ApiError(401, "Invalid authentication token."); }
  const db = getAdminDb();
  const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
  if (!member.exists || member.data()?.status !== "active") throw new ApiError(403, "Active workspace membership required.");
  const role = String(member.data()?.role ?? "");
  if (!ROLES.has(role)) throw new ApiError(403, "Finance access required.");
  return { user, role, db };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const invoiceId = String(body.invoiceId ?? "");
    const noteType = String(body.noteType ?? "credit");
    const reason = String(body.reason ?? "").trim();
    const amount = Number(body.amount);
    if (!orgId || !invoiceId || !["credit", "debit"].includes(noteType) || !reason || !Number.isFinite(amount) || amount <= 0) throw new ApiError(400, "Workspace, invoice, note type, reason and a positive amount are required.");
    const { user, role, db } = await context(request, orgId);
    const invoiceRef = db.doc(`organizations/${orgId}/invoices/${invoiceId}`);
    const noteRef = db.collection(`organizations/${orgId}/invoiceAdjustments`).doc();
    const journalRef = db.collection(`organizations/${orgId}/journalEntries`).doc();
    const auditRef = db.collection(`organizations/${orgId}/auditEvents`).doc();
    const createdAt = Timestamp.now();
    let noteNumber = "";
    await db.runTransaction(async (tx) => {
      const invoiceSnap = await tx.get(invoiceRef);
      if (!invoiceSnap.exists || invoiceSnap.data()?.environment !== "LIVE") throw new ApiError(404, "Live invoice not found.");
      const invoice = invoiceSnap.data()!;
      if (invoice.status === "void") throw new ApiError(409, "Void invoices cannot receive adjustments.");
      const existing = await tx.get(db.collection(`organizations/${orgId}/invoiceAdjustments`).where("environment", "==", "LIVE").where("invoiceId", "==", invoiceId).where("deletedAt", "==", null));
      const priorCredits = existing.docs.filter((d) => d.data().noteType === "credit").reduce((sum, d) => sum + Number(d.data().amount || 0), 0);
      const priorDebits = existing.docs.filter((d) => d.data().noteType === "debit").reduce((sum, d) => sum + Number(d.data().amount || 0), 0);
      const effective = Number(invoice.amount || 0) - priorCredits + priorDebits;
      if (noteType === "credit" && amount > Math.max(0, effective)) throw new ApiError(409, "Credit note cannot exceed the invoice's current adjusted balance.");
      noteNumber = `${noteType === "credit" ? "CN" : "DN"}-${noteRef.id.slice(0, 10).toUpperCase()}`;
      const base = { orgId, environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid, deletedAt: null };
      tx.set(noteRef, { ...base, noteNumber, noteType, invoiceId, invoiceNumber: invoice.invoiceNumber, customerId: invoice.customerId, customerName: invoice.customerName, amount, currency: invoice.currency, reason, status: "issued", issuedAt: createdAt });
      const debitAccount = noteType === "credit" ? "Haulage Revenue" : "Accounts Receivable";
      const creditAccount = noteType === "credit" ? "Accounts Receivable" : "Haulage Revenue";
      tx.set(journalRef, { ...base, entryDate: createdAt, transactionType: noteType === "credit" ? "Credit note" : "Debit note", reference: noteNumber, amount, description: `${noteNumber} against ${invoice.invoiceNumber}: ${reason}`, debitAccount, creditAccount, invoiceId, invoiceAdjustmentId: noteRef.id });
      tx.set(auditRef, { ...base, actorUid: user.uid, actorRole: role, action: "create", entityType: "invoiceAdjustment", entityId: noteRef.id, summary: `${noteNumber} issued against ${invoice.invoiceNumber}.`, metadata: { invoiceId, noteType, amount, reason }, occurredAt: createdAt });
    });
    return NextResponse.json({ ok: true, noteId: noteRef.id, noteNumber, message: `${noteNumber} was issued and posted to the journal.` });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invoice adjustment failed." }, { status });
  }
}
