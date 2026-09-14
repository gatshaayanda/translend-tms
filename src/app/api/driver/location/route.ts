import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { OrgRole } from "@/types/core";
import type { TelemetryStatus } from "@/types/location";

const ALLOWED_ROLES: OrgRole[] = ["owner", "operations_manager", "dispatcher", "fleet_manager", "driver"];

type LocationEventData = {
  id: string;
  environment?: string;
  deletedAt?: unknown;
  capturedAt?: unknown;
  [key: string]: unknown;
};

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function timestampMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return Number(value.toMillis());
  }
  return Number(value ?? 0);
}

async function authorizeLocationAccess(request: Request, orgId: string) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Authentication required.");
  const user = await getAdminAuth().verifyIdToken(header.slice(7));
  if (!orgId) throw new ApiError(400, "Workspace is required.");

  const memberSnap = await getAdminDb().doc(`organizations/${orgId}/members/${user.uid}`).get();
  if (!memberSnap.exists || memberSnap.data()?.status !== "active") throw new ApiError(403, "Active workspace membership required.");
  const actorRole = String(memberSnap.data()?.role ?? "") as OrgRole;
  if (!ALLOWED_ROLES.includes(actorRole)) throw new ApiError(403, "Location access is not permitted for this workspace role.");
  return user;
}

export async function GET(request: Request) {
  try {
    const orgId = new URL(request.url).searchParams.get("orgId")?.trim() ?? "";
    await authorizeLocationAccess(request, orgId);

    const snapshot = await getAdminDb().collection(`organizations/${orgId}/truckLocationEvents`).get();
    const events: LocationEventData[] = snapshot.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }))
      .filter((event) => event.environment === "LIVE" && event.deletedAt == null)
      .sort((a, b) => timestampMillis(b.capturedAt) - timestampMillis(a.capturedAt))
      .slice(0, 500)
      .map((event) => ({
        ...event,
        createdAt: null,
        updatedAt: null,
        capturedAt: timestampMillis(event.capturedAt),
      }));

    return NextResponse.json({ events });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Location data could not be loaded." }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Authentication required.");
    const user = await getAdminAuth().verifyIdToken(header.slice(7));
    const body = await request.json();
    const orgId = String(body.orgId ?? "").trim();
    const truckId = String(body.truckId ?? "").trim();
    const tripId = body.tripId == null ? null : String(body.tripId).trim() || null;
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const accuracyMeters = body.accuracyMeters == null ? null : Number(body.accuracyMeters);
    const speedKph = body.speedKph == null ? null : Number(body.speedKph);
    const headingDegrees = body.headingDegrees == null ? null : Number(body.headingDegrees);
    const capturedAtMillis = Number(body.capturedAtMillis);
    const status = String(body.status ?? "unknown") as TelemetryStatus;

    if (!orgId || !truckId || !finiteNumber(latitude) || latitude < -90 || latitude > 90 || !finiteNumber(longitude) || longitude < -180 || longitude > 180) {
      throw new ApiError(400, "Valid workspace, truck and GPS coordinates are required.");
    }
    if (accuracyMeters != null && (!finiteNumber(accuracyMeters) || accuracyMeters < 0)) throw new ApiError(400, "Invalid GPS accuracy.");
    if (speedKph != null && (!finiteNumber(speedKph) || speedKph < 0)) throw new ApiError(400, "Invalid GPS speed.");
    if (headingDegrees != null && (!finiteNumber(headingDegrees) || headingDegrees < 0 || headingDegrees > 360)) throw new ApiError(400, "Invalid GPS heading.");
    if (!finiteNumber(capturedAtMillis) || capturedAtMillis < 0) throw new ApiError(400, "Valid GPS capture time is required.");
    if (!["moving", "idle", "stopped", "unknown"].includes(status)) throw new ApiError(400, "Invalid GPS status.");

    const db = getAdminDb();
    const memberRef = db.doc(`organizations/${orgId}/members/${user.uid}`);
    const truckRef = db.doc(`organizations/${orgId}/trucks/${truckId}`);
    const [memberSnap, truckSnap] = await Promise.all([memberRef.get(), truckRef.get()]);
    if (!memberSnap.exists || memberSnap.data()?.status !== "active") throw new ApiError(403, "Active workspace membership required.");
    const actorRole = String(memberSnap.data()?.role ?? "") as OrgRole;
    if (!ALLOWED_ROLES.includes(actorRole)) throw new ApiError(403, "Location capture is not permitted for this workspace role.");
    if (!truckSnap.exists || truckSnap.data()?.deletedAt != null || truckSnap.data()?.environment !== "LIVE") throw new ApiError(404, "Truck not found.");

    if (actorRole === "driver") {
      const driverSnap = await db.collection(`organizations/${orgId}/drivers`).where("linkedUid", "==", user.uid).limit(1).get();
      if (driverSnap.empty) throw new ApiError(403, "Your account is not linked to a driver record.");
      const driver = driverSnap.docs[0];
      if (driver.data().assignedTruckId !== truckId) throw new ApiError(403, "This truck is not assigned to your driver record.");
      if (tripId) {
        const tripSnap = await db.doc(`organizations/${orgId}/trips/${tripId}`).get();
        if (!tripSnap.exists || tripSnap.data()?.driverId !== driver.id || tripSnap.data()?.truckId !== truckId) throw new ApiError(403, "This trip is not assigned to your driver record.");
      }
    }

    const eventRef = db.collection(`organizations/${orgId}/truckLocationEvents`).doc();
    await eventRef.create({
      orgId,
      environment: "LIVE",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: user.uid,
      deletedAt: null,
      truckId,
      tripId,
      latitude,
      longitude,
      accuracyMeters,
      speedKph,
      headingDegrees,
      capturedAt: new Date(capturedAtMillis),
      source: "driver_gps",
      status,
    });

    return NextResponse.json({ ok: true, eventId: eventRef.id });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Location could not be saved." }, { status });
  }
}
