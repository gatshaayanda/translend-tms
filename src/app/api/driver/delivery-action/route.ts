import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { DeliveryExceptionCategory } from "@/types/core";
import { notifyOrgRoles } from "@/lib/notifications/server";
import { recordAuditEvent } from "@/lib/audit/server";

const CATEGORIES: DeliveryExceptionCategory[] = ["shortage", "damage", "quantity_discrepancy", "wrong_material", "refused", "site", "vehicle", "other"];

export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new Error("Authentication required.");
    const user = await getAdminAuth().verifyIdToken(header.slice(7));
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const deliveryId = String(body.deliveryId ?? "");
    const deliveryNoteId = String(body.deliveryNoteId ?? "");
    const action = String(body.action ?? "");
    if (!orgId || !deliveryId || !deliveryNoteId || !["arrive", "depart", "acknowledge", "exception"].includes(action)) {
      return NextResponse.json({ error: "Organization, delivery, delivery note and valid action are required." }, { status: 400 });
    }

    const db = getAdminDb();
    const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!member.exists || member.data()?.status !== "active" || member.data()?.role !== "driver") {
      return NextResponse.json({ error: "Driver access required." }, { status: 403 });
    }
    const driverSnap = await db.collection(`organizations/${orgId}/drivers`).where("linkedUid", "==", user.uid).limit(1).get();
    if (driverSnap.empty) return NextResponse.json({ error: "Your account is not linked to a driver record." }, { status: 403 });
    const driverId = driverSnap.docs[0].id;
    const deliveryRef = db.doc(`organizations/${orgId}/deliveries/${deliveryId}`);
    const noteRef = db.doc(`organizations/${orgId}/deliveryNotes/${deliveryNoteId}`);
    let exceptionId: string | null = null;
    let exceptionMessage: string | null = null;

    await db.runTransaction(async (tx) => {
      const [deliverySnap, noteSnap] = await Promise.all([tx.get(deliveryRef), tx.get(noteRef)]);
      if (!deliverySnap.exists || !noteSnap.exists) throw new Error("Delivery record not found.");
      const delivery = deliverySnap.data()!;
      const note = noteSnap.data()!;
      if (delivery.deliveryNoteId !== deliveryNoteId || note.deliveryId !== deliveryId) throw new Error("Delivery and Delivery Note do not match.");

      const tripRef = db.doc(`organizations/${orgId}/trips/${note.tripId}`);
      const tripSnap = await tx.get(tripRef);
      if (!tripSnap.exists || tripSnap.data()?.driverId !== driverId) throw new Error("This delivery is not assigned to you.");

      const now = Timestamp.now();
      if (action === "arrive") {
        if (delivery.arrivalAt || note.arrivalAt) throw new Error("Arrival has already been recorded.");
        tx.update(deliveryRef, { arrivalAt: now, arrivalBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        tx.update(noteRef, { arrivalAt: now, arrivalBy: user.uid, podState: "incomplete", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: "driver", action: "status_change", entityType: "delivery", entityId: deliveryId, summary: `Driver recorded arrival for Delivery Note ${deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryNoteId, transition: "arrival_recorded" }, transaction: tx });
        return;
      }

      if (action === "depart") {
        if (!note.arrivalAt || !delivery.arrivalAt) throw new Error("Mark arrival before departure.");
        if (delivery.departureAt || note.departureAt) throw new Error("Departure has already been recorded.");
        tx.update(deliveryRef, { departureAt: now, departureBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        tx.update(noteRef, { departureAt: now, departureBy: user.uid, podState: "incomplete", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: "driver", action: "status_change", entityType: "delivery", entityId: deliveryId, summary: `Driver recorded departure for Delivery Note ${deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryNoteId, transition: "departure_recorded" }, transaction: tx });
        return;
      }

      if (action === "acknowledge") {
        const name = String(body.name ?? "").trim();
        if (!name) throw new Error("Receiver name is required.");
        if (!delivery.arrivalAt || !note.arrivalAt) throw new Error("Mark arrival before receiver acknowledgement.");
        if (Array.isArray(note.acknowledgements) && note.acknowledgements.some((item: { role?: string }) => item.role === "receiver")) {
          throw new Error("Receiver acknowledgement has already been recorded.");
        }
        const acknowledgement = { role: "receiver", name, uid: user.uid, acknowledgedAt: now };
        tx.update(deliveryRef, { acknowledgements: FieldValue.arrayUnion(acknowledgement), receivedByName: name, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        tx.update(noteRef, { acknowledgements: FieldValue.arrayUnion(acknowledgement), receivedByName: name, podState: "incomplete", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: "driver", action: "status_change", entityType: "delivery", entityId: deliveryId, summary: `Receiver acknowledgement recorded for Delivery Note ${deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryNoteId, transition: "receiver_acknowledged", receiverName: name }, transaction: tx });
        return;
      }

      const category = String(body.category ?? "other") as DeliveryExceptionCategory;
      const description = String(body.description ?? "").trim();
      if (!CATEGORIES.includes(category) || !description) throw new Error("Valid exception category and description are required.");
      const exceptionRef = db.collection(`organizations/${orgId}/deliveryExceptions`).doc();
      exceptionId = exceptionRef.id;
      exceptionMessage = `${category.replaceAll("_", " ")}: ${description}`;
      tx.create(exceptionRef, { orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null, deliveryNoteId, deliveryId, category, description, reportedBy: user.uid, reportedAt: now, status: "open", evidenceRefs: [], resolutionNotes: null, resolvedBy: null, resolvedAt: null });
      tx.update(deliveryRef, { exceptionIds: FieldValue.arrayUnion(exceptionRef.id), podState: "incomplete", status: "exception", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
      tx.update(noteRef, { exceptionIds: FieldValue.arrayUnion(exceptionRef.id), podState: "incomplete", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
      recordAuditEvent({ orgId, actorUid: user.uid, actorRole: "driver", action: "create", entityType: "deliveryException", entityId: exceptionRef.id, summary: `Driver reported ${category.replaceAll("_", " ")} on delivery ${deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryId, deliveryNoteId, category }, transaction: tx });
    });

    if (action === "exception" && exceptionId && exceptionMessage) {
      try {
        await notifyOrgRoles({ orgId, roles: ["owner", "operations_manager", "dispatcher"], type: "exception", severity: "urgent", title: "Delivery exception reported", message: exceptionMessage, href: `/${orgId}/deliveries`, sourceId: deliveryId, sourceType: "delivery" });
      } catch {
        // Notification delivery is non-authoritative; the exception and audit are committed.
      }
    }

    return NextResponse.json({ ok: true, action, exceptionId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Driver delivery action failed." }, { status: 401 });
  }
}
