import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new Error("Authentication required.");
    const user = await getAdminAuth().verifyIdToken(header.slice(7));
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const jobId = String(body.jobId ?? "");
    const truckId = String(body.truckId ?? "");
    const driverId = String(body.driverId ?? "");
    if (!orgId || !jobId || !truckId || !driverId) return NextResponse.json({ error: "Job, truck, and driver are required." }, { status: 400 });

    const db = getAdminDb();
    const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    const role = member.data()?.role;
    if (!member.exists || member.data()?.status !== "active" || !["owner", "operations_manager", "dispatcher"].includes(role)) {
      return NextResponse.json({ error: "Dispatch access required." }, { status: 403 });
    }

    const jobRef = db.doc(`organizations/${orgId}/jobs/${jobId}`);
    const truckRef = db.doc(`organizations/${orgId}/trucks/${truckId}`);
    const driverRef = db.doc(`organizations/${orgId}/drivers/${driverId}`);
    const tripRef = db.collection(`organizations/${orgId}/trips`).doc();

    await db.runTransaction(async (tx) => {
      const [jobSnap, truckSnap, driverSnap] = await Promise.all([tx.get(jobRef), tx.get(truckRef), tx.get(driverRef)]);
      if (!jobSnap.exists) throw new Error("The selected job no longer exists.");
      if (!truckSnap.exists) throw new Error("The selected truck no longer exists.");
      if (!driverSnap.exists) throw new Error("The selected driver no longer exists.");

      const job = jobSnap.data()!;
      const truck = truckSnap.data()!;
      const driver = driverSnap.data()!;
      if (job.environment !== "LIVE" || truck.environment !== "LIVE" || driver.environment !== "LIVE") throw new Error("Only LIVE records can be dispatched.");
      if (job.deletedAt || truck.deletedAt || driver.deletedAt) throw new Error("One of the selected records is no longer active.");
      if (!["confirmed", "dispatched"].includes(job.status)) throw new Error("Only a confirmed job can be dispatched.");
      if (truck.status !== "available") throw new Error("The selected truck is no longer available.");
      if (driver.status !== "available") throw new Error("The selected driver is no longer available.");

      const now = FieldValue.serverTimestamp();
      tx.set(tripRef, {
        jobId,
        jobNumber: job.jobNumber,
        truckId,
        truckRegistration: truck.registrationNumber,
        driverId,
        driverName: driver.fullName,
        status: "planned",
        plannedStart: job.requestedPickupDate,
        plannedEnd: job.requestedDeliveryDate,
        actualStart: null,
        actualEnd: null,
        currentLocation: job.origin ?? null,
        lastCheckpointAt: now,
        orgId,
        environment: "LIVE",
        createdAt: now,
        createdBy: user.uid,
        updatedAt: now,
        updatedBy: user.uid,
        deletedAt: null,
      });
      tx.update(jobRef, { status: "dispatched", updatedAt: now, updatedBy: user.uid });
      tx.update(truckRef, { status: "on_trip", assignedDriverId: driverId, updatedAt: now, updatedBy: user.uid });
      tx.update(driverRef, { status: "on_trip", assignedTruckId: truckId, updatedAt: now, updatedBy: user.uid });
    });

    return NextResponse.json({ ok: true, tripId: tripRef.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dispatch failed." }, { status: 400 });
  }
}
