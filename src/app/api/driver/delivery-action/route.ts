import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { DeliveryExceptionCategory } from "@/types/core";

const CATEGORIES: DeliveryExceptionCategory[] = ["shortage","damage","quantity_discrepancy","wrong_material","refused","site","vehicle","other"];

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
    if (!orgId || !deliveryId || !deliveryNoteId || !["arrive","depart","acknowledge","exception"].includes(action)) {
      return NextResponse.json({ error: "Organization, delivery, delivery note and valid action are required." }, { status: 400 });
    }

    const db = getAdminDb();
    const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!member.exists || member.data()?.status !== "active" || member.data()?.role !== "driver") return NextResponse.json({ error: "Driver access required." }, { status: 403 });
    const driverSnap = await db.collection(`organizations/${orgId}/drivers`).where("linkedUid", "==", user.uid).limit(1).get();
    if (driverSnap.empty) return NextResponse.json({ error: "Your account is not linked to a driver record." }, { status: 403 });
    const driverId = driverSnap.docs[0].id;

    const deliveryRef = db.doc(`organizations/${orgId}/deliveries/${deliveryId}`);
    const noteRef = db.doc(`organizations/${orgId}/deliveryNotes/${deliveryNoteId}`);
    const [deliverySnap, noteSnap] = await Promise.all([deliveryRef.get(), noteRef.get()]);
    if (!deliverySnap.exists || !noteSnap.exists) return NextResponse.json({ error: "Delivery record not found." }, { status: 404 });
    const delivery = deliverySnap.data()!;
    const note = noteSnap.data()!;
    if (delivery.deliveryNoteId !== deliveryNoteId || note.deliveryId !== deliveryId) return NextResponse.json({ error: "Delivery and Delivery Note do not match." }, { status: 409 });
    const tripSnap = await db.doc(`organizations/${orgId}/trips/${note.tripId}`).get();
    if (!tripSnap.exists || tripSnap.data()?.driverId !== driverId) return NextResponse.json({ error: "This delivery is not assigned to you." }, { status: 403 });

    const now = Timestamp.now();
    if (action === "arrive") {
      await Promise.all([
        deliveryRef.update({ arrivalAt: now, arrivalBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid }),
        noteRef.update({ arrivalAt: now, arrivalBy: user.uid, podState: "incomplete", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid }),
      ]);
    } else if (action === "depart") {
      if (!note.arrivalAt) return NextResponse.json({ error: "Mark arrival before departure." }, { status: 409 });
      await Promise.all([
        deliveryRef.update({ departureAt: now, departureBy: user.uid, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid }),
        noteRef.update({ departureAt: now, departureBy: user.uid, podState: "incomplete", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid }),
      ]);
    } else if (action === "acknowledge") {
      const name = String(body.name ?? "").trim();
      if (!name) return NextResponse.json({ error: "Receiver name is required." }, { status: 400 });
      const acknowledgement = { role: "receiver", name, uid: user.uid, acknowledgedAt: now };
      await Promise.all([
        deliveryRef.update({ acknowledgements: FieldValue.arrayUnion(acknowledgement), receivedByName: name, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid }),
        noteRef.update({ acknowledgements: FieldValue.arrayUnion(acknowledgement), receivedByName: name, podState: "incomplete", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid }),
      ]);
    } else {
      const category = String(body.category ?? "other") as DeliveryExceptionCategory;
      const description = String(body.description ?? "").trim();
      if (!CATEGORIES.includes(category) || !description) return NextResponse.json({ error: "Valid exception category and description are required." }, { status: 400 });
      const exceptionRef = db.collection(`organizations/${orgId}/deliveryExceptions`).doc();
      await exceptionRef.create({
        orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null,
        deliveryNoteId, deliveryId, category, description, reportedBy: user.uid, reportedAt: now, status: "open",
        evidenceRefs: [], resolutionNotes: null, resolvedBy: null, resolvedAt: null,
      });
      await Promise.all([
        deliveryRef.update({ exceptionIds: FieldValue.arrayUnion(exceptionRef.id), podState: "incomplete", status: "exception", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid }),
        noteRef.update({ exceptionIds: FieldValue.arrayUnion(exceptionRef.id), podState: "incomplete", updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid }),
      ]);
    }
    return NextResponse.json({ ok: true, action });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Driver delivery action failed." }, { status: 401 });
  }
}
