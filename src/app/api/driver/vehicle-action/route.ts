import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

const INSPECTION_TYPES = ["pre_trip", "periodic", "roadworthy", "post_repair"] as const;
const RESULTS = ["pass", "attention", "fail"] as const;

export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new Error("Authentication required.");
    const user = await getAdminAuth().verifyIdToken(header.slice(7));
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const truckId = String(body.truckId ?? "");
    const action = String(body.action ?? "");
    if (!orgId || !truckId || !["inspection", "defect"].includes(action)) return NextResponse.json({ error: "Organization, truck and valid vehicle action are required." }, { status: 400 });

    const db = getAdminDb();
    const memberSnap = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!memberSnap.exists || memberSnap.data()?.status !== "active" || memberSnap.data()?.role !== "driver") return NextResponse.json({ error: "Driver access required." }, { status: 403 });
    const driverSnap = await db.collection(`organizations/${orgId}/drivers`).where("linkedUid", "==", user.uid).limit(1).get();
    if (driverSnap.empty) return NextResponse.json({ error: "Your account is not linked to a driver record." }, { status: 403 });
    const truckSnap = await db.doc(`organizations/${orgId}/trucks/${truckId}`).get();
    if (!truckSnap.exists) return NextResponse.json({ error: "Truck record not found." }, { status: 404 });
    const driverId = driverSnap.docs[0].id;
    const tripQuery = await db.collection(`organizations/${orgId}/trips`).where("driverId", "==", driverId).where("truckId", "==", truckId).get();
    const activeTrip = tripQuery.docs.find((d) => !["completed"].includes(String(d.data().status))) ?? null;
    if (!activeTrip) return NextResponse.json({ error: "This truck is not assigned to an active trip for you." }, { status: 403 });

    const now = Timestamp.now();
    if (action === "inspection") {
      const type = String(body.inspectionType ?? "pre_trip");
      const result = String(body.result ?? "attention");
      const findings = String(body.findings ?? "").trim();
      const odometerKm = Number(body.odometerKm ?? 0);
      if (!INSPECTION_TYPES.includes(type as typeof INSPECTION_TYPES[number]) || !RESULTS.includes(result as typeof RESULTS[number]) || !findings || !Number.isFinite(odometerKm) || odometerKm < 0) return NextResponse.json({ error: "Inspection type, result, findings and a valid odometer reading are required." }, { status: 400 });
      const ref = db.collection(`organizations/${orgId}/vehicleInspections`).doc();
      await ref.create({ orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null, truckId, truckRegistration: truckSnap.data()?.registrationNumber ?? "", inspectionDate: now, inspectionType: type, result, odometerKm, findings, inspectorName: user.name ?? user.email ?? "Driver", nextDueAt: null });
      if (result !== "pass") {
        const workRef = db.collection(`organizations/${orgId}/workOrders`).doc();
        await workRef.create({ orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null, workOrderNumber: `WO-${Date.now().toString(36).toUpperCase()}`, truckId, truckRegistration: truckSnap.data()?.registrationNumber ?? "", workType: "Inspection defect", priority: result === "fail" ? "high" : "medium", workRequired: findings, status: "open", supplierPoId: null, sourceInspectionId: ref.id });
      }
      return NextResponse.json({ ok: true, action, inspectionId: ref.id, workOrderCreated: result !== "pass" });
    }

    const description = String(body.description ?? "").trim();
    const priority = ["high", "medium", "low"].includes(String(body.priority)) ? String(body.priority) : "medium";
    if (!description) return NextResponse.json({ error: "Defect description is required." }, { status: 400 });
    const ref = db.collection(`organizations/${orgId}/workOrders`).doc();
    await ref.create({ orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null, workOrderNumber: `WO-${Date.now().toString(36).toUpperCase()}`, truckId, truckRegistration: truckSnap.data()?.registrationNumber ?? "", workType: "Driver defect", priority, workRequired: description, status: "open", supplierPoId: null, reportedByDriverId: driverId, reportedAt: now, tripId: activeTrip.id });
    return NextResponse.json({ ok: true, action, workOrderId: ref.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Vehicle action failed." }, { status: 401 });
  }
}
