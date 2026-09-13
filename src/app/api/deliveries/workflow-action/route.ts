import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { DeliveryEvidenceRef, OrgRole } from "@/types/core";

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
    if (!orgId || !deliveryId || !deliveryNoteId || !["complete", "resolve_exception", "void_exception", "approve_evidence", "reject_evidence"].includes(action)) {
      return NextResponse.json({ error: "Organization, delivery, delivery note and valid action are required." }, { status: 400 });
    }

    const db = getAdminDb();
    const memberSnap = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!memberSnap.exists || memberSnap.data()?.status !== "active" || !EDIT_ROLES.includes(memberSnap.data()?.role as OrgRole)) {
      return NextResponse.json({ error: "Delivery operations access required." }, { status: 403 });
    }
    const deliveryRef = db.doc(`organizations/${orgId}/deliveries/${deliveryId}`);
    const noteRef = db.doc(`organizations/${orgId}/deliveryNotes/${deliveryNoteId}`);
    const [deliverySnap, noteSnap] = await Promise.all([deliveryRef.get(), noteRef.get()]);
    if (!deliverySnap.exists || !noteSnap.exists) return NextResponse.json({ error: "Delivery record not found." }, { status: 404 });
    const delivery = deliverySnap.data()!;
    const note = noteSnap.data()!;
    if (delivery.deliveryNoteId !== deliveryNoteId || note.deliveryId !== deliveryId) return NextResponse.json({ error: "Delivery and Delivery Note do not match." }, { status: 409 });
    const now = Timestamp.now();

    if (action === "complete") {
      const exceptionsSnap = await db.collection(`organizations/${orgId}/deliveryExceptions`).where("deliveryId", "==", deliveryId).get();
      const exceptions = exceptionsSnap.docs.map((doc) => doc.data());
      const receiverAcknowledged = Array.isArray(note.acknowledgements) && note.acknowledgements.some((item: { role?: string }) => item.role === "receiver");
      const activeRequiredEvidence = ((note.evidenceRefs ?? []) as DeliveryEvidenceRef[]).some((item) => item.required && !["replaced", "rejected"].includes(item.status ?? "active"));
      const hasEvidence = ((note.evidenceRefs ?? []) as DeliveryEvidenceRef[]).some((item) => !["replaced", "rejected"].includes(item.status ?? "active"));
      const openException = exceptions.some((item) => item.status === "open");
      if (!delivery.arrivalAt || !delivery.departureAt || !receiverAcknowledged || !hasEvidence || !activeRequiredEvidence || openException) {
        return NextResponse.json({ error: "Delivery requires arrival, departure, receiver acknowledgement, an active required POD, other active evidence and no open exceptions before completion." }, { status: 409 });
      }
      await Promise.all([
        deliveryRef.update({ status: "delivered", deliveredAt: now, podState: "complete", updatedAt: now, updatedBy: user.uid }),
        noteRef.update({ podState: "complete", updatedAt: now, updatedBy: user.uid }),
      ]);
      return NextResponse.json({ ok: true, action });
    }

    if (action === "approve_evidence" || action === "reject_evidence") {
      const evidenceId = String(body.evidenceId ?? "");
      if (!evidenceId) return NextResponse.json({ error: "Evidence ID is required." }, { status: 400 });
      const refs = ((note.evidenceRefs ?? []) as DeliveryEvidenceRef[]).map((item) => ({ ...item }));
      const evidence = refs.find((item) => item.id === evidenceId);
      if (!evidence) return NextResponse.json({ error: "Evidence not found on this delivery." }, { status: 404 });
      if ((evidence.status ?? "active") === "replaced") return NextResponse.json({ error: "Replaced evidence cannot be reviewed." }, { status: 409 });
      const rejectionReason = String(body.rejectionReason ?? "").trim();
      if (action === "reject_evidence" && !rejectionReason) return NextResponse.json({ error: "A rejection reason is required." }, { status: 400 });
      evidence.status = action === "approve_evidence" ? "approved" : "rejected";
      evidence.reviewedBy = user.uid;
      evidence.reviewedAt = now;
      evidence.rejectionReason = action === "reject_evidence" ? rejectionReason : null;
      await Promise.all([
        deliveryRef.update({ evidenceRefs: refs, podState: "incomplete", updatedAt: now, updatedBy: user.uid }),
        noteRef.update({ evidenceRefs: refs, podState: "incomplete", updatedAt: now, updatedBy: user.uid }),
      ]);
      return NextResponse.json({ ok: true, action, evidenceId });
    }

    const exceptionId = String(body.exceptionId ?? "");
    if (!exceptionId) return NextResponse.json({ error: "Exception ID is required." }, { status: 400 });
    const exceptionRef = db.doc(`organizations/${orgId}/deliveryExceptions/${exceptionId}`);
    const exceptionSnap = await exceptionRef.get();
    if (!exceptionSnap.exists) return NextResponse.json({ error: "Delivery exception not found." }, { status: 404 });
    const exception = exceptionSnap.data()!;
    if (exception.deliveryId !== deliveryId || exception.deliveryNoteId !== deliveryNoteId) return NextResponse.json({ error: "Exception is not linked to this delivery." }, { status: 409 });
    const status = action === "resolve_exception" ? "resolved" : "void";
    const resolutionNotes = String(body.resolutionNotes ?? "").trim();
    await exceptionRef.update({ status, resolutionNotes: resolutionNotes || null, resolvedBy: user.uid, resolvedAt: now, updatedAt: now, updatedBy: user.uid });
    const remainingSnap = await db.collection(`organizations/${orgId}/deliveryExceptions`).where("deliveryId", "==", deliveryId).get();
    const hasOpen = remainingSnap.docs.some((doc) => doc.id !== exceptionId && doc.data().status === "open");
    if (!hasOpen) await Promise.all([
      deliveryRef.update({ status: delivery.status === "exception" ? "pending" : delivery.status, updatedAt: now, updatedBy: user.uid }),
      noteRef.update({ updatedAt: now, updatedBy: user.uid }),
    ]);
    return NextResponse.json({ ok: true, action, status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Delivery workflow action failed." }, { status: 401 });
  }
}
