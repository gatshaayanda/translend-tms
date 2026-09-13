import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
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
    const patch: Record<string, unknown> = { status: requestedStatus, updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid };
    if (requestedStatus === "in_transit" && !trip.data()?.actualStart) patch.actualStart = FieldValue.serverTimestamp();
    if (requestedStatus === "completed") patch.actualEnd = FieldValue.serverTimestamp();
    await tripRef.update(patch);
    return NextResponse.json({ ok: true, status: requestedStatus });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Trip update failed." }, { status: 401 });
  }
}
