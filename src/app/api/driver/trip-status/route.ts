import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { recordAuditEvent } from "@/lib/audit/server";
import type { TripStatus } from "@/types/core";

const DRIVER_STATUS_FLOW: TripStatus[] = ["planned", "en_route_pickup", "loading", "in_transit", "unloading", "completed"];

export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new Error("Authentication required.");
    const user = await getAdminAuth().verifyIdToken(header.slice(7));
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const tripId = String(body.tripId ?? "");
    const requestedStatus = String(body.status ?? "") as TripStatus;
    if (!orgId || !tripId || !DRIVER_STATUS_FLOW.includes(requestedStatus)) return NextResponse.json({ error: "Trip and valid status are required." }, { status: 400 });
    const db = getAdminDb();
    const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!member.exists || member.data()?.status !== "active" || member.data()?.role !== "driver") return NextResponse.json({ error: "Driver access required." }, { status: 403 });
    const actorRole = String(member.data()?.role ?? "driver");
    const driverSnap = await db.collection(`organizations/${orgId}/drivers`).where("linkedUid", "==", user.uid).limit(1).get();
    if (driverSnap.empty) return NextResponse.json({ error: "Your account is not linked to a driver record." }, { status: 403 });
    const driverId = driverSnap.docs[0].id;
    const tripRef = db.doc(`organizations/${orgId}/trips/${tripId}`);
    const trip = await tripRef.get();
    if (!trip.exists || trip.data()?.driverId !== driverId) return NextResponse.json({ error: "This trip is not assigned to you." }, { status: 403 });
    const current = trip.data()?.status as TripStatus;
    const currentIndex = DRIVER_STATUS_FLOW.indexOf(current);
    const nextIndex = DRIVER_STATUS_FLOW.indexOf(requestedStatus);
    if (nextIndex !== currentIndex + 1) return NextResponse.json({ error: "Trip status can only move forward one step at a time." }, { status: 409 });

    await db.runTransaction(async (tx) => {
      const latest = await tx.get(tripRef);
      if (!latest.exists || latest.data()?.driverId !== driverId) throw new Error("This trip is no longer assigned to you.");
      const latestStatus = latest.data()?.status as TripStatus;
      if (latestStatus !== current) throw new Error("The trip changed before this update. Refresh and try again.");

      const patch: Record<string, unknown> = {
        status: requestedStatus,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: user.uid,
      };
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

      recordAuditEvent({
        orgId,
        actorUid: user.uid,
        actorRole,
        action: "status_change",
        entityType: "Trip",
        entityId: tripId,
        summary: `Driver advanced trip from ${current} to ${requestedStatus}`,
        metadata: { fromStatus: current, toStatus: requestedStatus, driverId },
        transaction: tx,
      });
    });

    return NextResponse.json({ ok: true, status: requestedStatus });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Trip update failed." }, { status: 400 });
  }
}
