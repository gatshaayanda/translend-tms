import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { DeliveryEvidenceRef, OrgRole } from "@/types/core";
import { notifyOrgRoles } from "@/lib/notifications/server";
import { recordAuditEvent } from "@/lib/audit/server";

const EDIT_ROLES: OrgRole[] = ["owner", "operations_manager", "dispatcher", "fleet_manager"];

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) throw new Error("Authentication required.");
    const user = await getAdminAuth().verifyIdToken(authorization.slice(7).trim());
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const action = String(body.action ?? "");
    const deliveryId = String(body.deliveryId ?? "");
    const deliveryNoteId = String(body.deliveryNoteId ?? "");
    if (!orgId || !deliveryId || !deliveryNoteId || !["complete", "resolve_exception", "void_exception", "approve_evidence", "reject_evidence"].includes(action)) return NextResponse.json({ error: "Organization, delivery, delivery note and valid action are required." }, { status: 400 });

    const db = getAdminDb();
    const memberSnap = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    const memberRole = memberSnap.data()?.role as OrgRole | undefined;
    if (!memberSnap.exists || memberSnap.data()?.status !== "active" || !memberRole || !EDIT_ROLES.includes(memberRole)) return NextResponse.json({ error: "Delivery operations access required." }, { status: 403 });

    const deliveryRef = db.doc(`organizations/${orgId}/deliveries/${deliveryId}`);
    const noteRef = db.doc(`organizations/${orgId}/deliveryNotes/${deliveryNoteId}`);
    const now = Timestamp.now();
    const result = await db.runTransaction(async (tx) => {
      const [deliverySnap, noteSnap] = await Promise.all([tx.get(deliveryRef), tx.get(noteRef)]);
      if (!deliverySnap.exists || !noteSnap.exists) throw new Error("Delivery record not found.");
      const delivery = deliverySnap.data()!;
      const note = noteSnap.data()!;
      if (delivery.deliveryNoteId !== deliveryNoteId || note.deliveryId !== deliveryId) throw new Error("Delivery and Delivery Note do not match.");

      if (action === "complete") {
        const exceptionsSnap = await tx.get(db.collection(`organizations/${orgId}/deliveryExceptions`).where("deliveryId", "==", deliveryId));
        const exceptions = exceptionsSnap.docs.map((doc) => doc.data());
        const receiverAcknowledged = Array.isArray(note.acknowledgements) && note.acknowledgements.some((item: { role?: string }) => item.role === "receiver");
        const evidence = (note.evidenceRefs ?? []) as DeliveryEvidenceRef[];
        const approvedRequiredPod = evidence.some((item) => item.required && item.kind === "pod" && item.status === "approved");
        const hasActiveEvidence = evidence.some((item) => !["replaced", "rejected"].includes(item.status ?? "active"));
        const openException = exceptions.some((item) => item.status === "open");
        if (!delivery.arrivalAt || !delivery.departureAt || !receiverAcknowledged || !hasActiveEvidence || !approvedRequiredPod || openException) throw new Error("Delivery requires arrival, departure, receiver acknowledgement, an approved required POD, active evidence and no open exceptions before completion.");
        tx.update(deliveryRef, { status: "delivered", deliveredAt: now, podState: "complete", updatedAt: now, updatedBy: user.uid });
        tx.update(noteRef, { podState: "complete", updatedAt: now, updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: memberRole, action: "complete", entityType: "delivery", entityId: deliveryId, summary: `Delivery Note ${deliveryNoteId.slice(0, 8)} completed after POD validation.`, metadata: { deliveryNoteId, approvedRequiredPod: true }, transaction: tx });
        return { ok: true, action };
      }

      if (action === "approve_evidence" || action === "reject_evidence") {
        const evidenceId = String(body.evidenceId ?? "");
        if (!evidenceId) throw new Error("Evidence ID is required.");
        const refs = ((note.evidenceRefs ?? []) as DeliveryEvidenceRef[]).map((item) => ({ ...item }));
        const evidence = refs.find((item) => item.id === evidenceId);
        if (!evidence) throw new Error("Evidence not found on this delivery.");
        if ((evidence.status ?? "active") === "replaced") throw new Error("Replaced evidence cannot be reviewed.");
        const rejectionReason = String(body.rejectionReason ?? "").trim();
        if (action === "reject_evidence" && !rejectionReason) throw new Error("A rejection reason is required.");
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
      if (!exceptionId) throw new Error("Exception ID is required.");
      const exceptionRef = db.doc(`organizations/${orgId}/deliveryExceptions/${exceptionId}`);
      const exceptionSnap = await tx.get(exceptionRef);
      if (!exceptionSnap.exists) throw new Error("Delivery exception not found.");
      const exception = exceptionSnap.data()!;
      if (exception.deliveryId !== deliveryId || exception.deliveryNoteId !== deliveryNoteId) throw new Error("Exception is not linked to this delivery.");
      if (exception.status !== "open") throw new Error("This delivery exception is already closed.");
      const status = action === "resolve_exception" ? "resolved" : "void";
      const resolutionNotes = String(body.resolutionNotes ?? "").trim();
      tx.update(exceptionRef, { status, resolutionNotes: resolutionNotes || null, resolvedBy: user.uid, resolvedAt: now, updatedAt: now, updatedBy: user.uid });
      const remainingSnap = await tx.get(db.collection(`organizations/${orgId}/deliveryExceptions`).where("deliveryId", "==", deliveryId));
      const hasOpen = remainingSnap.docs.some((doc) => doc.id !== exceptionId && doc.data().status === "open");
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Delivery workflow action failed." }, { status: 400 });
  }
}
