import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { DeliveryEvidenceRef, OrgRole } from "@/types/core";
import { notifyOrgRoles } from "@/lib/notifications/server";
import { recordAuditEvent } from "@/lib/audit/server";

const EDIT_ROLES: OrgRole[] = ["owner", "operations_manager", "dispatcher", "fleet_manager"];
const ACTIONS = ["create", "arrive", "depart", "acknowledge", "complete", "resolve_exception", "void_exception", "approve_evidence", "reject_evidence"] as const;
type Action = (typeof ACTIONS)[number];
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) throw new ApiError(401, "Authentication required.");
    let user;
    try {
      user = await getAdminAuth().verifyIdToken(authorization.slice(7).trim());
    } catch {
      throw new ApiError(401, "Invalid authentication token.");
    }
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const action = String(body.action ?? "") as Action;
    const tripId = String(body.tripId ?? "");
    const deliveryId = String(body.deliveryId ?? "");
    const deliveryNoteId = String(body.deliveryNoteId ?? "");
    if (!orgId || !ACTIONS.includes(action)) throw new ApiError(400, "Organization and valid delivery action are required.");
    if (action === "create" && !tripId) throw new ApiError(400, "Trip is required to create a delivery record.");
    if (action !== "create" && (!deliveryId || !deliveryNoteId)) throw new ApiError(400, "Organization, delivery and delivery note are required.");

    const db = getAdminDb();
    const memberSnap = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    const memberRole = memberSnap.data()?.role as OrgRole | undefined;
    if (!memberSnap.exists || memberSnap.data()?.status !== "active" || !memberRole || !EDIT_ROLES.includes(memberRole)) throw new ApiError(403, "Delivery operations access required.");

    if (action === "create") {
      const tripRef = db.doc(`organizations/${orgId}/trips/${tripId}`);
      const deliveryRef = db.collection(`organizations/${orgId}/deliveries`).doc();
      const noteRef = db.collection(`organizations/${orgId}/deliveryNotes`).doc();
      await db.runTransaction(async (tx) => {
        const tripSnap = await tx.get(tripRef);
        if (!tripSnap.exists || tripSnap.data()?.environment !== "LIVE") throw new ApiError(404, "Live trip not found.");
        const trip = tripSnap.data()!;
        if (!["completed", "unloading"].includes(String(trip.status))) throw new ApiError(409, "Only an unloading or completed trip can start a delivery record.");
        if (!trip.jobId) throw new ApiError(409, "The trip is not linked to a Job.");
        const jobRef = db.doc(`organizations/${orgId}/jobs/${trip.jobId}`);
        const jobSnap = await tx.get(jobRef);
        if (!jobSnap.exists || jobSnap.data()?.environment !== "LIVE") throw new ApiError(404, "Live Job not found.");
        const job = jobSnap.data()!;
        if (!job.customerId) throw new ApiError(409, "The linked Job is not assigned to a Customer.");
        const customerRef = db.doc(`organizations/${orgId}/customers/${job.customerId}`);
        const customerSnap = await tx.get(customerRef);
        if (!customerSnap.exists || customerSnap.data()?.environment !== "LIVE") throw new ApiError(404, "Live Customer not found for the linked Job.");
        const customer = customerSnap.data()!;
        const existing = await tx.get(db.collection(`organizations/${orgId}/deliveries`).where("environment", "==", "LIVE").where("tripId", "==", tripId).where("deletedAt", "==", null));
        if (!existing.empty) throw new ApiError(409, "This trip already has a delivery record.");
        const now = FieldValue.serverTimestamp();
        tx.set(deliveryRef, {
          orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null,
          tripId, jobId: trip.jobId, status: "pending", deliveredAt: null, receivedByName: "", podFileUrl: null, signatureUrl: null,
          exceptionReason: null, deliveryNoteId: noteRef.id, arrivalAt: null, arrivalBy: null, departureAt: null, departureBy: null,
          acknowledgements: [], evidenceRefs: [], exceptionIds: [], podState: "not_started",
        });
        tx.set(noteRef, {
          orgId, environment: "LIVE", createdAt: now, createdBy: user.uid, updatedAt: now, updatedBy: user.uid, deletedAt: null,
          noteReference: `DN-${deliveryRef.id.slice(0, 8).toUpperCase()}`, noteDateTime: Timestamp.now(), jobId: trip.jobId, tripId,
          deliveryId: deliveryRef.id, suppliedTo: "", customerName: String(customer.name ?? ""), vehicleRegistration: trip.truckRegistration ?? "", deliveryLocation: "",
          driverId: trip.driverId, driverName: trip.driverName, orderReference: null, podReference: null, loadingPoint: null,
          receivedByName: "", receivedByRole: null, notes: "", materialLines: [{ id: crypto.randomUUID(), description: "", materialCode: null, quantity: 0, unit: "", expectedQuantity: null, notes: "" }],
          arrivalAt: null, arrivalBy: null, departureAt: null, departureBy: null, acknowledgements: [], evidenceRefs: [], exceptionIds: [], podState: "not_started",
        });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: memberRole, action: "create", entityType: "delivery", entityId: deliveryRef.id, summary: `Created delivery record for trip ${tripId.slice(0, 8)}.`, metadata: { tripId, deliveryNoteId: noteRef.id, customerId: job.customerId }, transaction: tx });
      });
      return NextResponse.json({ ok: true, action, deliveryId: deliveryRef.id, deliveryNoteId: noteRef.id });
    }

    const deliveryRef = db.doc(`organizations/${orgId}/deliveries/${deliveryId}`);
    const noteRef = db.doc(`organizations/${orgId}/deliveryNotes/${deliveryNoteId}`);
    const now = Timestamp.now();
    const result = await db.runTransaction(async (tx) => {
      const [deliverySnap, noteSnap] = await Promise.all([tx.get(deliveryRef), tx.get(noteRef)]);
      if (!deliverySnap.exists || !noteSnap.exists) throw new ApiError(404, "Delivery record not found.");
      const delivery = deliverySnap.data()!;
      const note = noteSnap.data()!;
      if (delivery.deliveryNoteId !== deliveryNoteId || note.deliveryId !== deliveryId) throw new ApiError(409, "Delivery and Delivery Note do not match.");

      if (action === "arrive") {
        if (delivery.arrivalAt || note.arrivalAt) throw new ApiError(409, "Arrival has already been recorded.");
        tx.update(deliveryRef, { arrivalAt: now, arrivalBy: user.uid, updatedAt: now, updatedBy: user.uid });
        tx.update(noteRef, { arrivalAt: now, arrivalBy: user.uid, podState: "incomplete", updatedAt: now, updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: memberRole, action: "status_change", entityType: "delivery", entityId: deliveryId, summary: `Recorded arrival for Delivery Note ${deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryNoteId }, transaction: tx });
        return { ok: true, action };
      }

      if (action === "depart") {
        if (!delivery.arrivalAt || !note.arrivalAt) throw new ApiError(409, "Mark arrival before departure.");
        if (delivery.departureAt || note.departureAt) throw new ApiError(409, "Departure has already been recorded.");
        tx.update(deliveryRef, { departureAt: now, departureBy: user.uid, updatedAt: now, updatedBy: user.uid });
        tx.update(noteRef, { departureAt: now, departureBy: user.uid, podState: "incomplete", updatedAt: now, updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: memberRole, action: "status_change", entityType: "delivery", entityId: deliveryId, summary: `Recorded departure for Delivery Note ${deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryNoteId }, transaction: tx });
        return { ok: true, action };
      }

      if (action === "acknowledge") {
        const role = String(body.role ?? "") as "driver" | "foreman" | "receiver";
        const name = String(body.name ?? "").trim();
        if (!["driver", "foreman", "receiver"].includes(role) || !name) throw new ApiError(400, "Valid acknowledgement role and name are required.");
        if (!delivery.arrivalAt || !note.arrivalAt) throw new ApiError(409, "Mark arrival before receiver acknowledgement.");
        if (Array.isArray(note.acknowledgements) && note.acknowledgements.some((item: { role?: string }) => item.role === role)) throw new ApiError(409, "This acknowledgement has already been recorded.");
        const acknowledgement = { uid: user.uid, role, name, acknowledgedAt: now, acknowledgedBy: user.uid };
        const acknowledgements = [...(Array.isArray(note.acknowledgements) ? note.acknowledgements : []), acknowledgement];
        const patch = { acknowledgements, receivedByName: role === "receiver" ? name : delivery.receivedByName, receivedByRole: role === "receiver" ? role : note.receivedByRole, updatedAt: now, updatedBy: user.uid };
        tx.update(deliveryRef, patch);
        tx.update(noteRef, { acknowledgements, receivedByName: role === "receiver" ? name : note.receivedByName, receivedByRole: role === "receiver" ? role : note.receivedByRole, podState: "incomplete", updatedAt: now, updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: memberRole, action: "status_change", entityType: "delivery", entityId: deliveryId, summary: `Recorded ${role} acknowledgement for Delivery Note ${deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryNoteId, role, name }, transaction: tx });
        return { ok: true, action, role };
      }

      if (action === "complete") {
        const exceptionsSnap = await tx.get(db.collection(`organizations/${orgId}/deliveryExceptions`).where("deliveryId", "==", deliveryId));
        const exceptions = exceptionsSnap.docs.map((doc) => doc.data());
        const receiverAcknowledged = Array.isArray(note.acknowledgements) && note.acknowledgements.some((item: { role?: string }) => item.role === "receiver");
        const evidence = (note.evidenceRefs ?? []) as DeliveryEvidenceRef[];
        const approvedRequiredPod = evidence.some((item) => item.required && item.kind === "pod" && item.status === "approved");
        const hasActiveEvidence = evidence.some((item) => !["replaced", "rejected"].includes(item.status ?? "active"));
        const openException = exceptions.some((item) => item.status === "open");
        if (!delivery.arrivalAt || !delivery.departureAt || !receiverAcknowledged || !hasActiveEvidence || !approvedRequiredPod || openException) throw new ApiError(409, "Delivery requires arrival, departure, receiver acknowledgement, an approved required POD, active evidence and no open exceptions before completion.");
        tx.update(deliveryRef, { status: "delivered", deliveredAt: now, podState: "complete", updatedAt: now, updatedBy: user.uid });
        tx.update(noteRef, { podState: "complete", updatedAt: now, updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: memberRole, action: "complete", entityType: "delivery", entityId: deliveryId, summary: `Delivery Note ${deliveryNoteId.slice(0, 8)} completed after POD validation.`, metadata: { deliveryNoteId, approvedRequiredPod: true }, transaction: tx });
        return { ok: true, action };
      }

      if (action === "approve_evidence" || action === "reject_evidence") {
        const evidenceId = String(body.evidenceId ?? "");
        if (!evidenceId) throw new ApiError(400, "Evidence ID is required.");
        const refs = ((note.evidenceRefs ?? []) as DeliveryEvidenceRef[]).map((item) => ({ ...item }));
        const evidence = refs.find((item) => item.id === evidenceId);
        if (!evidence) throw new ApiError(404, "Evidence not found on this delivery.");
        if ((evidence.status ?? "active") === "replaced") throw new ApiError(409, "Replaced evidence cannot be reviewed.");
        const rejectionReason = String(body.rejectionReason ?? "").trim();
        if (action === "reject_evidence" && !rejectionReason) throw new ApiError(400, "A rejection reason is required.");
        evidence.status = action === "approve_evidence" ? "approved" : "rejected";
        evidence.reviewedBy = user.uid;
        evidence.reviewedAt = now as unknown as DeliveryEvidenceRef["reviewedAt"];
        evidence.rejectionReason = action === "reject_evidence" ? rejectionReason : null;
        tx.update(deliveryRef, { evidenceRefs: refs, podState: "incomplete", updatedAt: now, updatedBy: user.uid });
        tx.update(noteRef, { evidenceRefs: refs, podState: "incomplete", updatedAt: now, updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: memberRole, action: action === "approve_evidence" ? "approve" : "reject", entityType: "deliveryEvidence", entityId: evidenceId, summary: `${action === "approve_evidence" ? "Approved" : "Rejected"} evidence ${evidenceId.slice(0, 8)} on Delivery Note ${deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryId, deliveryNoteId, evidenceKind: evidence.kind, rejectionReason: action === "reject_evidence" ? rejectionReason : null }, transaction: tx });
        return { ok: true, action, evidenceId, rejected: action === "reject_evidence", rejectionReason };
      }

      const exceptionId = String(body.exceptionId ?? "");
      if (!exceptionId) throw new ApiError(400, "Exception ID is required.");
      const exceptionRef = db.doc(`organizations/${orgId}/deliveryExceptions/${exceptionId}`);
      const exceptionSnap = await tx.get(exceptionRef);
      if (!exceptionSnap.exists) throw new ApiError(404, "Delivery exception not found.");
      const exception = exceptionSnap.data()!;
      if (exception.deliveryId !== deliveryId || exception.deliveryNoteId !== deliveryNoteId) throw new ApiError(409, "Exception is not linked to this delivery.");
      if (exception.status !== "open") throw new ApiError(409, "This delivery exception is already closed.");
      const remainingSnap = await tx.get(db.collection(`organizations/${orgId}/deliveryExceptions`).where("deliveryId", "==", deliveryId));
      const hasOpen = remainingSnap.docs.some((doc) => doc.id !== exceptionId && doc.data().status === "open");
      const status = action === "resolve_exception" ? "resolved" : "void";
      const resolutionNotes = String(body.resolutionNotes ?? "").trim();
      tx.update(exceptionRef, { status, resolutionNotes: resolutionNotes || null, resolvedBy: user.uid, resolvedAt: now, updatedAt: now, updatedBy: user.uid });
      if (!hasOpen) {
        tx.update(deliveryRef, { status: delivery.status === "exception" ? "pending" : delivery.status, updatedAt: now, updatedBy: user.uid });
        tx.update(noteRef, { updatedAt: now, updatedBy: user.uid });
      }
      recordAuditEvent({ orgId, actorUid: user.uid, actorRole: memberRole, action: "resolve", entityType: "deliveryException", entityId: exceptionId, summary: `${status === "resolved" ? "Resolved" : "Voided"} delivery exception ${exceptionId.slice(0, 8)}.`, metadata: { deliveryId, deliveryNoteId, status, resolutionNotes: resolutionNotes || null }, transaction: tx });
      return { ok: true, action, status, exceptionId, resolutionNotes };
    });

    if ("rejected" in result && result.rejected) {
      await notifyOrgRoles({ orgId, roles: ["owner", "operations_manager", "dispatcher"], type: "pod_rejected", severity: "warning", title: "POD rejected", message: `Evidence for delivery ${deliveryNoteId.slice(0, 8)} was rejected: ${result.rejectionReason}`, href: `/${orgId}/deliveries?deliveryNoteId=${encodeURIComponent(deliveryNoteId)}`, sourceId: deliveryId, sourceType: "delivery" });
    }
    return NextResponse.json(result);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Delivery workflow action failed." }, { status });
  }
}
