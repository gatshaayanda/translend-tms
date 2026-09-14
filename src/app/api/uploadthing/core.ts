import { createUploadthing } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import type { FileRouter } from "uploadthing/next";
import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { DeliveryEvidenceRef, OrgRole } from "@/types/core";
import { ROLE_PERMISSIONS } from "@/types/core";
import { notifyOrgRoles } from "@/lib/notifications/server";
import { recordAuditEvent } from "@/lib/audit/server";

const f = createUploadthing();
const evidenceInput = z.object({ orgId: z.string().min(1), deliveryId: z.string().min(1), deliveryNoteId: z.string().min(1), kind: z.enum(["pod", "photo", "document", "other"]), required: z.boolean().default(false), replacesEvidenceId: z.string().min(1).optional() });
const fuelReceiptInput = z.object({ orgId: z.string().min(1), fuelLogId: z.string().min(1) });

async function authenticateRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new UploadThingError("Unauthorized");
  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken) throw new UploadThingError("Unauthorized");
  try { return await getAdminAuth().verifyIdToken(idToken); } catch { throw new UploadThingError("Invalid authentication token"); }
}

async function verifyOrganizationMembership(orgId: string, uid: string, finance = false): Promise<OrgRole> {
  const db = getAdminDb(); const membershipSnap = await db.doc(`organizations/${orgId}/members/${uid}`).get();
  if (!membershipSnap.exists) throw new UploadThingError("Organization membership not found");
  const membership = membershipSnap.data(); if (membership?.status !== "active") throw new UploadThingError("Organization membership is not active");
  const role = membership.role as OrgRole; if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) throw new UploadThingError("Invalid organization membership");
  const allowed = finance ? ROLE_PERMISSIONS[role].editFinance : ROLE_PERMISSIONS[role].editOperations;
  if (!allowed) throw new UploadThingError("Insufficient organization permissions"); return role;
}

async function verifyEvidenceAccess(orgId: string, uid: string, deliveryId: string, deliveryNoteId: string): Promise<OrgRole> {
  const db = getAdminDb(); const membershipSnap = await db.doc(`organizations/${orgId}/members/${uid}`).get();
  if (!membershipSnap.exists || membershipSnap.data()?.status !== "active") throw new UploadThingError("Organization membership is not active");
  const role = membershipSnap.data()?.role as OrgRole; if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) throw new UploadThingError("Invalid organization membership");
  if (ROLE_PERMISSIONS[role].editOperations) return role;
  if (role !== "driver") throw new UploadThingError("Insufficient organization permissions");
  const [driverSnap, noteSnap, deliverySnap] = await Promise.all([db.collection(`organizations/${orgId}/drivers`).where("linkedUid", "==", uid).limit(1).get(), db.doc(`organizations/${orgId}/deliveryNotes/${deliveryNoteId}`).get(), db.doc(`organizations/${orgId}/deliveries/${deliveryId}`).get()]);
  if (driverSnap.empty || !noteSnap.exists || !deliverySnap.exists) throw new UploadThingError("Driver delivery access could not be verified");
  if (deliverySnap.data()?.deliveryNoteId !== deliveryNoteId) throw new UploadThingError("Delivery and Delivery Note do not match");
  const tripSnap = await db.doc(`organizations/${orgId}/trips/${noteSnap.data()?.tripId}`).get();
  if (!tripSnap.exists || tripSnap.data()?.driverId !== driverSnap.docs[0].id) throw new UploadThingError("This delivery is not assigned to you");
  return role;
}

export const ourFileRouter = {
  podEvidence: f({ image: { maxFileSize: "8MB", maxFileCount: 1 }, pdf: { maxFileSize: "8MB", maxFileCount: 1 } }).input(evidenceInput).middleware(async ({ req, input }) => {
    const user = await authenticateRequest(req); const role = await verifyEvidenceAccess(input.orgId, user.uid, input.deliveryId, input.deliveryNoteId); const db = getAdminDb();
    const [deliverySnap, noteSnap] = await Promise.all([db.doc(`organizations/${input.orgId}/deliveries/${input.deliveryId}`).get(), db.doc(`organizations/${input.orgId}/deliveryNotes/${input.deliveryNoteId}`).get()]);
    if (!deliverySnap.exists || !noteSnap.exists) throw new UploadThingError("Delivery record not found");
    const delivery = deliverySnap.data(); const note = noteSnap.data();
    if (delivery?.deliveryNoteId !== input.deliveryNoteId || note?.deliveryId !== input.deliveryId) throw new UploadThingError("Delivery and Delivery Note do not match");
    if (input.replacesEvidenceId) {
      const refs = (note.evidenceRefs ?? []) as DeliveryEvidenceRef[]; const previous = refs.find((item) => item.id === input.replacesEvidenceId && (item.status ?? "active") !== "replaced");
      if (!previous) throw new UploadThingError("The evidence selected for replacement was not found or has already been replaced.");
    }
    return { uid: user.uid, orgId: input.orgId, role, deliveryId: input.deliveryId, deliveryNoteId: input.deliveryNoteId, kind: input.kind, required: input.required, replacesEvidenceId: input.replacesEvidenceId ?? null };
  }).onUploadComplete(async ({ metadata, file }) => {
    const uploadedAt = Timestamp.now(); const db = getAdminDb();
    const deliveryRef = db.doc(`organizations/${metadata.orgId}/deliveries/${metadata.deliveryId}`);
    const noteRef = db.doc(`organizations/${metadata.orgId}/deliveryNotes/${metadata.deliveryNoteId}`);
    let applied = false;
    let version = 1;
    await db.runTransaction(async (tx) => {
      const [deliverySnap, noteSnap] = await Promise.all([tx.get(deliveryRef), tx.get(noteRef)]);
      if (!deliverySnap.exists || !noteSnap.exists) throw new UploadThingError("Delivery record disappeared before evidence was finalized.");
      const delivery = deliverySnap.data()!; const note = noteSnap.data()!;
      if (delivery.deliveryNoteId !== metadata.deliveryNoteId || note.deliveryId !== metadata.deliveryId) throw new UploadThingError("Delivery and Delivery Note do not match.");
      const existing = ((note.evidenceRefs ?? []) as DeliveryEvidenceRef[]).map((item) => ({ ...item }));
      const sameFile = existing.find((item) => item.id === file.key);
      if (sameFile) {
        version = sameFile.version ?? 1;
        return;
      }
      const previous = metadata.replacesEvidenceId ? existing.find((item) => item.id === metadata.replacesEvidenceId && (item.status ?? "active") !== "replaced") : null;
      version = previous ? (previous.version ?? 1) + 1 : Math.max(0, ...existing.filter((item) => item.kind === metadata.kind).map((item) => item.version ?? 1)) + 1;
      if (previous) previous.status = "replaced";
      const evidence: DeliveryEvidenceRef = { id: file.key, key: file.key, url: file.ufsUrl, kind: metadata.kind, uploadedBy: metadata.uid, uploadedAt: uploadedAt as unknown as DeliveryEvidenceRef["uploadedAt"], required: metadata.required, status: "active", version, replacesEvidenceId: previous?.id ?? null, reviewedBy: null, reviewedAt: null, rejectionReason: null };
      const nextRefs = [...existing.filter((item) => item.id !== evidence.id), evidence];
      tx.update(deliveryRef, { evidenceRefs: nextRefs, podState: "incomplete", updatedAt: uploadedAt, updatedBy: metadata.uid });
      tx.update(noteRef, { evidenceRefs: nextRefs, podState: "incomplete", updatedAt: uploadedAt, updatedBy: metadata.uid });
      recordAuditEvent({ orgId: metadata.orgId, actorUid: metadata.uid, actorRole: metadata.role, action: "upload", entityType: "deliveryEvidence", entityId: file.key, summary: `Uploaded ${metadata.kind} evidence for delivery ${metadata.deliveryNoteId.slice(0, 8)}.`, metadata: { deliveryId: metadata.deliveryId, deliveryNoteId: metadata.deliveryNoteId, version }, transaction: tx });
      applied = true;
    });

    if (applied) {
      await notifyOrgRoles({ orgId: metadata.orgId, roles: ["owner", "operations_manager", "dispatcher"], type: "missing_pod", severity: "info", title: "Delivery evidence uploaded", message: `${metadata.kind.toUpperCase()} evidence was uploaded for delivery ${metadata.deliveryNoteId.slice(0, 8)} and is ready for review.`, href: `/${metadata.orgId}/deliveries`, sourceId: metadata.deliveryId, sourceType: "delivery" });
    }
    return { uploadedBy: metadata.uid, organizationId: metadata.orgId, role: metadata.role, deliveryId: metadata.deliveryId, deliveryNoteId: metadata.deliveryNoteId, url: file.ufsUrl, key: file.key, kind: metadata.kind, version };
  }),
  financeReceipt: f({ image: { maxFileSize: "8MB", maxFileCount: 1 }, pdf: { maxFileSize: "8MB", maxFileCount: 1 } }).input(fuelReceiptInput).middleware(async ({ req, input }) => {
    const user = await authenticateRequest(req); const role = await verifyOrganizationMembership(input.orgId, user.uid, true); const db = getAdminDb();
    if (!(await db.doc(`organizations/${input.orgId}/fuelLogs/${input.fuelLogId}`).get()).exists) throw new UploadThingError("Fuel log not found");
    return { uid: user.uid, orgId: input.orgId, role, fuelLogId: input.fuelLogId };
  }).onUploadComplete(async ({ metadata, file }) => {
    const uploadedAt = Timestamp.now(); await getAdminDb().doc(`organizations/${metadata.orgId}/fuelLogs/${metadata.fuelLogId}`).update({ receiptUrl: file.ufsUrl, receiptKey: file.key, updatedAt: uploadedAt, updatedBy: metadata.uid });
    return { uploadedBy: metadata.uid, organizationId: metadata.orgId, fuelLogId: metadata.fuelLogId, url: file.ufsUrl, key: file.key };
  }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
