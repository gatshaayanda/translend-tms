import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { OrgRole } from "@/types/core";

const ROLES: OrgRole[] = ["owner", "operations_manager", "dispatcher", "fleet_manager"];
type Entity = "customer" | "truck";

class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Authentication required.");
    const user = await getAdminAuth().verifyIdToken(header.slice(7));
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const entity = String(body.entity ?? "") as Entity;
    const id = String(body.id ?? "");
    if (!orgId || !id || !["customer", "truck"].includes(entity)) throw new ApiError(400, "Organization, entity and record id are required.");

    const db = getAdminDb();
    const memberSnap = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!memberSnap.exists || memberSnap.data()?.status !== "active") throw new ApiError(403, "Active workspace membership required.");
    const role = String(memberSnap.data()?.role ?? "") as OrgRole;
    if (!ROLES.includes(role)) throw new ApiError(403, "Operational management access required.");

    const collection = entity === "customer" ? "customers" : "trucks";
    const ref = db.doc(`organizations/${orgId}/${collection}/${id}`);
    const snap = await ref.get();
    if (!snap.exists) throw new ApiError(404, "Record not found.");
    const data = snap.data()!;
    if (data.deletedAt) throw new ApiError(409, "Record is already retired/archived.");

    if (entity === "customer") {
      const openJobs = await db.collection(`organizations/${orgId}/jobs`).where("customerId", "==", id).where("deletedAt", "==", null).where("status", "in", ["confirmed", "dispatched", "in_progress"]).limit(1).get();
      if (!openJobs.empty) throw new ApiError(409, "Customer has open jobs and cannot be archived yet.");
    }

    if (entity === "truck") {
      const activeTrips = await db.collection(`organizations/${orgId}/trips`).where("truckId", "==", id).where("status", "in", ["planned", "en_route_pickup", "loading", "in_transit", "unloading", "exception"]).limit(1).get();
      if (!activeTrips.empty) throw new ApiError(409, "Truck has an active trip and cannot be retired yet.");
    }

    await ref.update({ deletedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: user.uid });
    return NextResponse.json({ ok: true, entity, id });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Archive action failed." }, { status });
  }
}
