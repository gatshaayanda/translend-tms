import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { DeliveryExceptionCategory } from "@/types/core";
import { notifyOrgRoles } from "@/lib/notifications/server";
import { recordAuditEvent } from "@/lib/audit/server";

const CATEGORIES: DeliveryExceptionCategory[] = ["shortage", "damage", "quantity_discrepancy", "wrong_material", "refused", "site", "vehicle", "other"];
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Authentication required.");
    const user = await getAdminAuth().verifyIdToken(header.slice(7));
    const body = await request.json();
    const orgId = String(body.orgId ?? ""); const deliveryId = String(body.deliveryId ?? ""); const deliveryNoteId = String(body.deliveryNoteId ?? ""); const action = String(body.action ?? ""); const idempotencyKey = String(body.idempotencyKey ?? "").trim();
    if (!orgId || !deliveryId || !deliveryNoteId || !["arrive", "depart", "acknowledge", "exception"].includes(action) || !idempotencyKey || idempotencyKey.length > 160) throw new ApiError(400, "Organization, delivery, delivery note, valid action and idempotency key are required.");

    const db = getAdminDb();
    const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!member.exists || member.data()?.status !== "active" || member.data()?.role !== "driver") throw new ApiError(403, "Driver access required.");
    const driverSnap = await db.collection(`organizations/${orgId}/drivers`).where("linkedUid", "==", user.uid).limit(1).get();
    if (driverSnap.empty) throw new ApiError(403, "Your account is not linked to a driver record.");
    const driverId = driverSnap.docs[0].id;
    const receiptRef = db.doc(`organizations/${orgId}/mutationReceipts/${idempotencyKey}`);
    if ((await receiptRef.get()).exists) return NextResponse.json({ ok: true, action, duplicate: true });

    const deliveryRef = db.doc(`organizations/${orgId}/deliveries/${deliveryId}`); const noteRef = db.doc(`organizations/${orgId}/deliveryNotes/${deliveryNoteId}`);
    let exceptionId: string | null = null; let exceptionMessage: string | null = null;
    const result = await db.runTransaction(async (tx) => {
      const [receiptSnap, deliverySnap, noteSnap] = await Promise.all([tx.get(receiptRef), tx.get(deliveryRef), tx.get(noteRef)]);
      if (receiptSnap.exists) return { duplicate: true };
      if (!deliverySnap.exists || !noteSnap.exists) throw new ApiError(404, "Delivery record not found.");
      const delivery = deliverySnap.data()!; const note = noteSnap.data()!;
      if (delivery.deliveryNoteId !== deliveryNoteId || note.deliveryId !== deliveryId) throw new ApiError(409, "Delivery and Delivery Note do not match.");
      const tripRef = db.doc(`organizations/${orgId}/trips/${note.tripId}`); const tripSnap = await tx.get(tripRef);
      if (!tripSnap.exists || tripSnap.data()?.driverId !== driverId) throw new ApiError(403, "This delivery is not assigned to you.");
      const now = Timestamp.now();

      if (action === "arrive") {
        if (delivery.arrivalAt || note.arrivalAt) throw new ApiError(409, "Arrival has already been recorded.");
        tx.update(deliveryRef, { arrivalAt: now, arrivalBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        tx.update(noteRef, { arrivalAt: now, arrivalBy: user.uid, podState: "incomplete", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: "driver", action: "status_change", entityType: "delivery", entityId: deliveryId, summary: `Driver recorded arrival for Delivery Note ${deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryNoteId, transition: "arrival_recorded", idempotencyKey }, transaction: tx });
      } else if (action === "depart") {
        if (!note.arrivalAt || !delivery.arrivalAt) throw new ApiError(409, "Mark arrival before departure.");
        if (delivery.departureAt || note.departureAt) throw new ApiError(409, "Departure has already been recorded.");
        tx.update(deliveryRef, { departureAt: now, departureBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        tx.update(noteRef, { departureAt: now, departureBy: user.uid, podState: "incomplete", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: "driver", action: "status_change", entityType: "delivery", entityId: deliveryId, summary: `Driver recorded departure for Delivery Note ${deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryNoteId, transition: "departure_recorded", idempotencyKey }, transaction: tx });
      } else if (action === "acknowledge") {
        const name = String(body.name ?? "").trim();
        if (!name) throw new ApiError(400, "Receiver name is required.");
        if (!delivery.arrivalAt || !note.arrivalAt) throw new ApiError(409, "Mark arrival before receiver acknowledgement.");
        if (Array.isArray(note.acknowledgements) && note.acknowledgements.some((item: { role?: string }) => item.role === "receiver")) throw new ApiError(409, "Receiver acknowledgement has already been recorded.");
        const acknowledgement = { role: "receiver", name, uid: user.uid, acknowledgedAt: now };
        tx.update(deliveryRef, { acknowledgements: FieldValue.arrayUnion(acknowledgement), receivedByName: name, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        tx.update(noteRef, { acknowledgements: FieldValue.arrayUnion(acknowledgement), receivedByName: name, podState: "incomplete", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: "driver", action: "status_change", entityType: "delivery", entityId: deliveryId, summary: `Receiver acknowledgement recorded for Delivery Note ${deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryNoteId, transition: "receiver_acknowledged", receiverName: name, idempotencyKey }, transaction: tx });
      } else {
        const category = String(body.category ?? "other") as DeliveryExceptionCategory; const description = String(body.description ?? "").trim();
        if (!CATEGORIES.includes(category) || !description) throw new ApiError(400, "Valid exception category and description are required.");
        const exceptionRef = db.collection(`organizations/${orgId}/deliveryExceptions`).doc(); exceptionId = exceptionRef.id; exceptionMessage = `${category.replaceAll("_", " ")}: ${description}`;
        tx.create(exceptionRef, { orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null, deliveryNoteId, deliveryId, category, description, reportedBy: user.uid, reportedAt: now, status: "open", evidenceRefs: [], resolutionNotes: null, resolvedBy: null, resolvedAt: null });
        tx.update(deliveryRef, { exceptionIds: FieldValue.arrayUnion(exceptionRef.id), podState: "incomplete", status: "exception", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        tx.update(noteRef, { exceptionIds: FieldValue.arrayUnion(exceptionRef.id), podState: "incomplete", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: "driver", action: "create", entityType: "deliveryException", entityId: exceptionRef.id, summary: `Driver reported ${category.replaceAll("_", " ")} on delivery ${deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryId, deliveryNoteId, category, idempotencyKey }, transaction: tx });
      }
      tx.create(receiptRef, { orgId, action: `driver.delivery_${action}`, actorUid: user.uid, createdAt: now, result: action, entityType: "delivery", entityId: deliveryId });
      return { duplicate: false };
    });

    if (action === "exception" && exceptionId && exceptionMessage && !result.duplicate) {
      try { await notifyOrgRoles({ orgId, roles: ["owner", "operations_manager", "dispatcher"], type: "exception", severity: "urgent", title: "Delivery exception reported", message: exceptionMessage, href: `/${orgId}/deliveries`, sourceId: deliveryId, sourceType: "delivery" }); } catch { /* notification is non-authoritative */ }
    }
    return NextResponse.json({ ok: true, action, exceptionId, duplicate: result.duplicate });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Driver delivery action failed." }, { status });
  }
}
