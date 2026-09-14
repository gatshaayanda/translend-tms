import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { recordAuditEvent } from "@/lib/audit/server";

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
    const actorRole = String(memberSnap.data()?.role ?? "driver");
    const driverSnap = await db.collection(`organizations/${orgId}/drivers`).where("linkedUid", "==", user.uid).limit(1).get();
    if (driverSnap.empty) return NextResponse.json({ error: "Your account is not linked to a driver record." }, { status: 403 });
    const driverId = driverSnap.docs[0].id;

    if (action === "inspection") {
      const type = String(body.inspectionType ?? "pre_trip");
      const result = String(body.result ?? "attention");
      const findings = String(body.findings ?? "").trim();
      const odometerKm = Number(body.odometerKm ?? 0);
      if (!INSPECTION_TYPES.includes(type as typeof INSPECTION_TYPES[number]) || !RESULTS.includes(result as typeof RESULTS[number]) || !findings || !Number.isFinite(odometerKm) || odometerKm < 0) return NextResponse.json({ error: "Inspection type, result, findings and a valid odometer reading are required." }, { status: 400 });

      const outcome = await db.runTransaction(async (tx) => {
        const truckRef = db.doc(`organizations/${orgId}/trucks/${truckId}`);
        const truckSnap = await tx.get(truckRef);
        if (!truckSnap.exists) throw new Error("Truck record not found.");
        const tripQuery = db.collection(`organizations/${orgId}/trips`).where("driverId", "==", driverId).where("truckId", "==", truckId);
        const tripSnap = await tx.get(tripQuery);
        const activeTrip = tripSnap.docs.find((d) => String(d.data().status) !== "completed") ?? null;
        if (!activeTrip) throw new Error("This truck is not assigned to an active trip for you.");

        const now = Timestamp.now();
        const inspectionRef = db.collection(`organizations/${orgId}/vehicleInspections`).doc();
        tx.create(inspectionRef, { orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null, truckId, truckRegistration: truckSnap.data()?.registrationNumber ?? "", inspectionDate: now, inspectionType: type, result, odometerKm, findings, inspectorName: user.name ?? user.email ?? "Driver", nextDueAt: null, tripId: activeTrip.id });

        let workOrderId: string | null = null;
        if (result !== "pass") {
          const workRef = db.collection(`organizations/${orgId}/workOrders`).doc();
          workOrderId = workRef.id;
          tx.create(workRef, { orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null, workOrderNumber: `WO-${Date.now().toString(36).toUpperCase()}`, truckId, truckRegistration: truckSnap.data()?.registrationNumber ?? "", workType: "Inspection defect", priority: result === "fail" ? "high" : "medium", workRequired: findings, status: "open", supplierPoId: null, sourceInspectionId: inspectionRef.id, reportedByDriverId: driverId, tripId: activeTrip.id });
        }
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole, action: "create", entityType: "vehicleInspection", entityId: inspectionRef.id, summary: `Driver recorded ${type} inspection for truck ${truckId.slice(0, 8)}.`, metadata: { truckId, result, odometerKm, workOrderCreated: result !== "pass" }, transaction: tx });
        if (workOrderId) recordAuditEvent({ orgId, actorUid: user.uid, actorRole, action: "create", entityType: "workOrder", entityId: workOrderId, summary: `Inspection created a ${result === "fail" ? "high" : "medium"}-priority work order.`, metadata: { truckId, inspectionId: inspectionRef.id, result }, transaction: tx });
        return { inspectionId: inspectionRef.id, workOrderId };
      });
      return NextResponse.json({ ok: true, action, inspectionId: outcome.inspectionId, workOrderCreated: Boolean(outcome.workOrderId) });
    }

    const description = String(body.description ?? "").trim();
    const priority = ["high", "medium", "low"].includes(String(body.priority)) ? String(body.priority) : "medium";
    if (!description) return NextResponse.json({ error: "Defect description is required." }, { status: 400 });

    const outcome = await db.runTransaction(async (tx) => {
      const truckRef = db.doc(`organizations/${orgId}/trucks/${truckId}`);
      const truckSnap = await tx.get(truckRef);
      if (!truckSnap.exists) throw new Error("Truck record not found.");
      const tripSnap = await tx.get(db.collection(`organizations/${orgId}/trips`).where("driverId", "==", driverId).where("truckId", "==", truckId));
      const activeTrip = tripSnap.docs.find((d) => String(d.data().status) !== "completed") ?? null;
      if (!activeTrip) throw new Error("This truck is not assigned to an active trip for you.");
      const now = Timestamp.now();
      const workRef = db.collection(`organizations/${orgId}/workOrders`).doc();
      tx.create(workRef, { orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null, workOrderNumber: `WO-${Date.now().toString(36).toUpperCase()}`, truckId, truckRegistration: truckSnap.data()?.registrationNumber ?? "", workType: "Driver defect", priority, workRequired: description, status: "open", supplierPoId: null, reportedByDriverId: driverId, reportedAt: now, tripId: activeTrip.id });
      recordAuditEvent({ orgId, actorUid: user.uid, actorRole, action: "create", entityType: "workOrder", entityId: workRef.id, summary: `Driver reported a ${priority}-priority vehicle defect.`, metadata: { truckId, tripId: activeTrip.id, priority }, transaction: tx });
      return { workOrderId: workRef.id };
    });
    return NextResponse.json({ ok: true, action, workOrderId: outcome.workOrderId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Vehicle action failed." }, { status: 400 });
  }
}
