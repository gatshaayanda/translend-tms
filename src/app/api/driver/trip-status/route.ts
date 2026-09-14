import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { recordAuditEvent } from "@/lib/audit/server";
import type { OrgRole, TripStatus } from "@/types/core";

const FLOW: TripStatus[] = ["planned", "en_route_pickup", "loading", "in_transit", "unloading", "completed"];
const OPERATIONAL_ROLES: OrgRole[] = ["owner", "operations_manager", "dispatcher", "fleet_manager"];
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Authentication required.");
    const user = await getAdminAuth().verifyIdToken(header.slice(7));
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const tripId = String(body.tripId ?? "");
    const requestedStatus = String(body.status ?? "") as TripStatus;
    const idempotencyKey = String(body.idempotencyKey ?? "").trim();
    if (!orgId || !tripId || !FLOW.includes(requestedStatus) || !idempotencyKey || idempotencyKey.length > 160) throw new ApiError(400, "Trip, valid status and idempotency key are required.");

    const db = getAdminDb();
    const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!member.exists || member.data()?.status !== "active") throw new ApiError(403, "Active workspace membership required.");
    const actorRole = String(member.data()?.role ?? "") as OrgRole;
    if (![...OPERATIONAL_ROLES, "driver"].includes(actorRole)) throw new ApiError(403, "Operational trip access required.");

    const tripRef = db.doc(`organizations/${orgId}/trips/${tripId}`);
    const receiptRef = db.doc(`organizations/${orgId}/mutationReceipts/${idempotencyKey}`);
    const tripSnap = await tripRef.get();
    if (!tripSnap.exists) throw new ApiError(404, "Trip not found.");
    const tripData = tripSnap.data()!;
    const current = tripData.status as TripStatus;
    const currentIndex = FLOW.indexOf(current);
    const requestedIndex = FLOW.indexOf(requestedStatus);
    if (currentIndex < 0 || requestedIndex < 0 || Math.abs(requestedIndex - currentIndex) !== 1) throw new ApiError(409, "Trip status can move only one operational step at a time.");

    let driverId = String(tripData.driverId ?? "");
    if (actorRole === "driver") {
      const driverSnap = await db.collection(`organizations/${orgId}/drivers`).where("linkedUid", "==", user.uid).limit(1).get();
      if (driverSnap.empty) throw new ApiError(403, "Your account is not linked to a driver record.");
      driverId = driverSnap.docs[0].id;
      if (tripData.driverId !== driverId) throw new ApiError(403, "This trip is not assigned to you.");
    }

    const result = await db.runTransaction(async (tx) => {
      const [receiptSnap, latest] = await Promise.all([tx.get(receiptRef), tx.get(tripRef)]);
      if (receiptSnap.exists) return { duplicate: true };
      if (!latest.exists) throw new ApiError(404, "Trip no longer exists.");
      const latestData = latest.data()!;
      if (latestData.status !== current) throw new ApiError(409, "The trip changed before this update. Refresh and try again.");
      if (actorRole === "driver" && latestData.driverId !== driverId) throw new ApiError(403, "This trip is no longer assigned to you.");

      const patch: Record<string, unknown> = { status: requestedStatus, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid };
      if (requestedStatus === "in_transit" && !latestData.actualStart) patch.actualStart = FieldValue.serverTimestamp();
      if (requestedStatus !== "completed" && current === "completed") patch.actualEnd = null;
      if (requestedStatus === "completed") patch.actualEnd = FieldValue.serverTimestamp();
      tx.update(tripRef, patch);

      const data = latestData;
      if (requestedStatus === "unloading" && data.jobId) {
        const existing = await tx.get(db.collection(`organizations/${orgId}/deliveries`).where("environment", "==", "LIVE").where("tripId", "==", tripId).where("deletedAt", "==", null));
        if (existing.empty) {
          const jobRef = db.doc(`organizations/${orgId}/jobs/${data.jobId}`);
          const jobSnap = await tx.get(jobRef);
          if (jobSnap.exists && jobSnap.data()?.environment === "LIVE") {
            const job = jobSnap.data()!;
            const customerId = String(job.customerId ?? data.customerId ?? "");
            if (customerId) {
              const customerSnap = await tx.get(db.doc(`organizations/${orgId}/customers/${customerId}`));
              if (customerSnap.exists && customerSnap.data()?.environment === "LIVE") {
                const deliveryRef = db.collection(`organizations/${orgId}/deliveries`).doc();
                const noteRef = db.collection(`organizations/${orgId}/deliveryNotes`).doc();
                const now = FieldValue.serverTimestamp();
                tx.set(deliveryRef, {
                  orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null,
                  tripId, jobId: data.jobId, status: "pending", deliveredAt: null, receivedByName: "", podFileUrl: null, signatureUrl: null,
                  exceptionReason: null, deliveryNoteId: noteRef.id, arrivalAt: null, arrivalBy: null, departureAt: null, departureBy: null,
                  acknowledgements: [], evidenceRefs: [], exceptionIds: [], podState: "not_started",
                });
                tx.set(noteRef, {
                  orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null,
                  noteReference: `DN-${deliveryRef.id.slice(0, 8).toUpperCase()}`, noteDateTime: Timestamp.now(), jobId: data.jobId, tripId,
                  deliveryId: deliveryRef.id, suppliedTo: "", customerName: String(customerSnap.data()?.name ?? ""), vehicleRegistration: data.truckRegistration ?? "", deliveryLocation: "",
                  driverId: data.driverId, driverName: data.driverName, orderReference: null, podReference: null, loadingPoint: null,
                  receivedByName: "", receivedByRole: null, notes: "", materialLines: [{ id: crypto.randomUUID(), description: "", materialCode: null, quantity: 0, unit: "", expectedQuantity: null, notes: "" }],
                  arrivalAt: null, arrivalBy: null, departureAt: null, departureBy: null, acknowledgements: [], evidenceRefs: [], exceptionIds: [], podState: "not_started",
                });
                recordAuditEvent({ orgId, actorUid: user.uid, actorRole, action: "create", entityType: "delivery", entityId: deliveryRef.id, summary: `Automatically created delivery record for trip ${tripId.slice(0, 8)} entering unloading.`, metadata: { tripId, deliveryNoteId: noteRef.id, customerId }, transaction: tx });
              }
            }
          }
        }
      }

      if (current !== "completed" && requestedStatus === "completed") {
        const now = FieldValue.serverTimestamp();
        tx.update(db.doc(`organizations/${orgId}/trucks/${data.truckId}`), { status: "available", assignedDriverId: null, updatedAt: now, updatedBy: user.uid });
        tx.update(db.doc(`organizations/${orgId}/drivers/${data.driverId}`), { status: "available", assignedTruckId: null, updatedAt: now, updatedBy: user.uid });
        tx.update(db.doc(`organizations/${orgId}/jobs/${data.jobId}`), { status: "completed", updatedAt: now, updatedBy: user.uid });
      }
      if (current === "completed" && requestedStatus !== "completed") {
        const now = FieldValue.serverTimestamp();
        tx.update(db.doc(`organizations/${orgId}/trucks/${data.truckId}`), { status: "on_trip", assignedDriverId: data.driverId, updatedAt: now, updatedBy: user.uid });
        tx.update(db.doc(`organizations/${orgId}/drivers/${data.driverId}`), { status: "on_trip", assignedTruckId: data.truckId, updatedAt: now, updatedBy: user.uid });
        tx.update(db.doc(`organizations/${orgId}/jobs/${data.jobId}`), { status: "in_progress", updatedAt: now, updatedBy: user.uid });
      }
      const direction = requestedIndex > currentIndex ? "advanced" : "reversed";
      recordAuditEvent({ orgId, actorUid: user.uid, actorRole, action: "status_change", entityType: "Trip", entityId: tripId, summary: `${actorRole === "driver" ? "Driver" : "Operations user"} ${direction} trip from ${current} to ${requestedStatus}`, metadata: { fromStatus: current, toStatus: requestedStatus, driverId: data.driverId, idempotencyKey, direction }, transaction: tx });
      tx.create(receiptRef, { orgId, action: "trip_status_change", actorUid: user.uid, createdAt: Timestamp.now(), result: requestedStatus, entityType: "Trip", entityId: tripId });
      return { duplicate: false };
    });
    return NextResponse.json({ ok: true, status: requestedStatus, duplicate: result.duplicate });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Trip update failed." }, { status });
  }
}
