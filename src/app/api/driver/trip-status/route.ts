import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { recordAuditEvent } from "@/lib/audit/server";
import type { TripStatus } from "@/types/core";

const DRIVER_STATUS_FLOW: TripStatus[] = ["planned", "en_route_pickup", "loading", "in_transit", "unloading", "completed"];

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
    if (!orgId || !tripId || !DRIVER_STATUS_FLOW.includes(requestedStatus) || !idempotencyKey || idempotencyKey.length > 160) {
      throw new ApiError(400, "Trip, valid status and idempotency key are required.");
    }

    const db = getAdminDb();
    const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!member.exists || member.data()?.status !== "active" || member.data()?.role !== "driver") throw new ApiError(403, "Driver access required.");
    const actorRole = String(member.data()?.role ?? "driver");
    const driverSnap = await db.collection(`organizations/${orgId}/drivers`).where("linkedUid", "==", user.uid).limit(1).get();
    if (driverSnap.empty) throw new ApiError(403, "Your account is not linked to a driver record.");
    const driverId = driverSnap.docs[0].id;
    const tripRef = db.doc(`organizations/${orgId}/trips/${tripId}`);
    const receiptRef = db.doc(`organizations/${orgId}/mutationReceipts/${idempotencyKey}`);
    const trip = await tripRef.get();
    if (!trip.exists || trip.data()?.driverId !== driverId) throw new ApiError(403, "This trip is not assigned to you.");
    const current = trip.data()?.status as TripStatus;
    const currentIndex = DRIVER_STATUS_FLOW.indexOf(current);
    const nextIndex = DRIVER_STATUS_FLOW.indexOf(requestedStatus);
    if (nextIndex !== currentIndex + 1) throw new ApiError(409, "Trip status can only move forward one step at a time.");

    const result = await db.runTransaction(async (tx) => {
      const [receiptSnap, latest] = await Promise.all([tx.get(receiptRef), tx.get(tripRef)]);
      if (receiptSnap.exists) return { duplicate: true };
      if (!latest.exists || latest.data()?.driverId !== driverId) throw new ApiError(403, "This trip is no longer assigned to you.");
      const latestStatus = latest.data()?.status as TripStatus;
      if (latestStatus !== current) throw new ApiError(409, "The trip changed before this update. Refresh and try again.");

      const patch: Record<string, unknown> = { status: requestedStatus, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid };
      if (requestedStatus === "in_transit" && !latest.data()?.actualStart) patch.actualStart = FieldValue.serverTimestamp();
      if (requestedStatus === "completed") patch.actualEnd = FieldValue.serverTimestamp();
      tx.update(tripRef, patch);

      if (requestedStatus === "completed") {
        const data = latest.data()!;
        const now = FieldValue.serverTimestamp();
        tx.update(db.doc(`organizations/${orgId}/trucks/${data.truckId}`), { status: "available", assignedDriverId: null, updatedAt: now, updatedBy: user.uid });
        tx.update(db.doc(`organizations/${orgId}/drivers/${data.driverId}`), { status: "available", assignedTruckId: null, updatedAt: now, updatedBy: user.uid });
        tx.update(db.doc(`organizations/${orgId}/jobs/${data.jobId}`), { status: "completed", updatedAt: now, updatedBy: user.uid });
      }

      recordAuditEvent({ orgId, actorUid: user.uid, actorRole, action: "status_change", entityType: "Trip", entityId: tripId, summary: `Driver advanced trip from ${current} to ${requestedStatus}`, metadata: { fromStatus: current, toStatus: requestedStatus, driverId, idempotencyKey }, transaction: tx });
      tx.create(receiptRef, { orgId, action: "driver.trip_status", actorUid: user.uid, createdAt: Timestamp.now(), result: requestedStatus, entityType: "Trip", entityId: tripId });
      return { duplicate: false };
    });

    return NextResponse.json({ ok: true, status: requestedStatus, duplicate: result.duplicate });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Trip update failed." }, { status });
  }
}
