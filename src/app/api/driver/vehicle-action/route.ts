import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { recordAuditEvent } from "@/lib/audit/server";

const INSPECTION_TYPES = ["pre_trip", "periodic", "roadworthy", "post_repair"] as const;
const RESULTS = ["pass", "attention", "fail"] as const;
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Authentication required.");
    const user = await getAdminAuth().verifyIdToken(header.slice(7));
    const body = await request.json(); const orgId = String(body.orgId ?? ""); const truckId = String(body.truckId ?? ""); const action = String(body.action ?? ""); const idempotencyKey = String(body.idempotencyKey ?? "").trim();
    if (!orgId || !truckId || !["inspection", "defect"].includes(action) || !idempotencyKey || idempotencyKey.length > 160) throw new ApiError(400, "Organization, truck, valid vehicle action and idempotency key are required.");

    const db = getAdminDb(); const memberSnap = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!memberSnap.exists || memberSnap.data()?.status !== "active" || memberSnap.data()?.role !== "driver") throw new ApiError(403, "Driver access required.");
    const actorRole = String(memberSnap.data()?.role ?? "driver"); const driverSnap = await db.collection(`organizations/${orgId}/drivers`).where("linkedUid", "==", user.uid).limit(1).get();
    if (driverSnap.empty) throw new ApiError(403, "Your account is not linked to a driver record.");
    const driverId = driverSnap.docs[0].id; const receiptRef = db.doc(`organizations/${orgId}/mutationReceipts/${idempotencyKey}`);
    const existingReceipt = await receiptRef.get();
    if (existingReceipt.exists) return NextResponse.json({ ok: true, action, duplicate: true, ...(existingReceipt.data()?.resultData ?? {}) });

    if (action === "inspection") {
      const type = String(body.inspectionType ?? "pre_trip"); const result = String(body.result ?? "attention"); const findings = String(body.findings ?? "").trim(); const odometerKm = Number(body.odometerKm ?? 0);
      if (!INSPECTION_TYPES.includes(type as typeof INSPECTION_TYPES[number]) || !RESULTS.includes(result as typeof RESULTS[number]) || !findings || !Number.isFinite(odometerKm) || odometerKm < 0) throw new ApiError(400, "Inspection type, result, findings and a valid odometer reading are required.");
      const outcome = await db.runTransaction(async (tx) => {
        const [receiptSnap, truckSnap] = await Promise.all([tx.get(receiptRef), tx.get(db.doc(`organizations/${orgId}/trucks/${truckId}`))]);
        if (receiptSnap.exists) return receiptSnap.data()?.resultData ?? { duplicate: true };
        if (!truckSnap.exists) throw new ApiError(404, "Truck record not found.");
        const tripSnap = await tx.get(db.collection(`organizations/${orgId}/trips`).where("driverId", "==", driverId).where("truckId", "==", truckId));
        const activeTrip = tripSnap.docs.find((d) => String(d.data().status) !== "completed") ?? null;
        if (!activeTrip) throw new ApiError(409, "This truck is not assigned to an active trip for you.");
        const now = Timestamp.now(); const inspectionRef = db.collection(`organizations/${orgId}/vehicleInspections`).doc(); let workOrderId: string | null = null;
        tx.create(inspectionRef, { orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null, truckId, truckRegistration: truckSnap.data()?.registrationNumber ?? "", inspectionDate: now, inspectionType: type, result, odometerKm, findings, inspectorName: user.name ?? user.email ?? "Driver", nextDueAt: null, tripId: activeTrip.id });
        if (result !== "pass") { const workRef = db.collection(`organizations/${orgId}/workOrders`).doc(); workOrderId = workRef.id; tx.create(workRef, { orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null, workOrderNumber: `WO-${Date.now().toString(36).toUpperCase()}`, truckId, truckRegistration: truckSnap.data()?.registrationNumber ?? "", workType: "Inspection defect", priority: result === "fail" ? "high" : "medium", workRequired: findings, status: "open", supplierPoId: null, sourceInspectionId: inspectionRef.id, reportedByDriverId: driverId, tripId: activeTrip.id }); }
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole, action: "create", entityType: "vehicleInspection", entityId: inspectionRef.id, summary: `Driver recorded ${type} inspection for truck ${truckId.slice(0, 8)}.`, metadata: { truckId, result, odometerKm, workOrderCreated: result !== "pass", idempotencyKey }, transaction: tx });
        if (workOrderId) recordAuditEvent({ orgId, actorUid: user.uid, actorRole, action: "create", entityType: "workOrder", entityId: workOrderId, summary: `Inspection created a ${result === "fail" ? "high" : "medium"}-priority work order.`, metadata: { truckId, inspectionId: inspectionRef.id, result, idempotencyKey }, transaction: tx });
        const resultData = { inspectionId: inspectionRef.id, workOrderCreated: Boolean(workOrderId) };
        tx.create(receiptRef, { orgId, action: "driver.vehicle_inspection", actorUid: user.uid, createdAt: now, resultData, entityType: "vehicleInspection", entityId: inspectionRef.id });
        return resultData;
      });
      return NextResponse.json({ ok: true, action, ...outcome, duplicate: false });
    }

    const description = String(body.description ?? "").trim(); const priority = ["high", "medium", "low"].includes(String(body.priority)) ? String(body.priority) : "medium";
    if (!description) throw new ApiError(400, "Defect description is required.");
    const outcome = await db.runTransaction(async (tx) => {
      const [receiptSnap, truckSnap] = await Promise.all([tx.get(receiptRef), tx.get(db.doc(`organizations/${orgId}/trucks/${truckId}`))]);
      if (receiptSnap.exists) return receiptSnap.data()?.resultData ?? { duplicate: true };
      if (!truckSnap.exists) throw new ApiError(404, "Truck record not found.");
      const tripSnap = await tx.get(db.collection(`organizations/${orgId}/trips`).where("driverId", "==", driverId).where("truckId", "==", truckId)); const activeTrip = tripSnap.docs.find((d) => String(d.data().status) !== "completed") ?? null;
      if (!activeTrip) throw new ApiError(409, "This truck is not assigned to an active trip for you.");
      const now = Timestamp.now(); const workRef = db.collection(`organizations/${orgId}/workOrders`).doc();
      tx.create(workRef, { orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null, workOrderNumber: `WO-${Date.now().toString(36).toUpperCase()}`, truckId, truckRegistration: truckSnap.data()?.registrationNumber ?? "", workType: "Driver defect", priority, workRequired: description, status: "open", supplierPoId: null, reportedByDriverId: driverId, reportedAt: now, tripId: activeTrip.id });
      recordAuditEvent({ orgId, actorUid: user.uid, actorRole, action: "create", entityType: "workOrder", entityId: workRef.id, summary: `Driver reported a ${priority}-priority vehicle defect.`, metadata: { truckId, tripId: activeTrip.id, priority, idempotencyKey }, transaction: tx });
      const resultData = { workOrderId: workRef.id }; tx.create(receiptRef, { orgId, action: "driver.vehicle_defect", actorUid: user.uid, createdAt: now, resultData, entityType: "workOrder", entityId: workRef.id }); return resultData;
    });
    return NextResponse.json({ ok: true, action, ...outcome, duplicate: false });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Vehicle action failed." }, { status });
  }
}
