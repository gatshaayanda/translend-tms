import { createUploadthing } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import type { FileRouter } from "uploadthing/next";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { z } from "zod";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { OrgRole } from "@/types/core";
import { ROLE_PERMISSIONS } from "@/types/core";

const f = createUploadthing();

const evidenceInput = z.object({
  orgId: z.string().min(1), deliveryId: z.string().min(1), deliveryNoteId: z.string().min(1), kind: z.enum(["pod", "photo", "document", "other"]),
});
const fuelReceiptInput = z.object({ orgId: z.string().min(1), fuelLogId: z.string().min(1) });

async function authenticateRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new UploadThingError("Unauthorized");
  const idToken = authorization.slice("Bearer ".length).trim();
  if (!idToken) throw new UploadThingError("Unauthorized");
  try { return await adminAuth.verifyIdToken(idToken); } catch { throw new UploadThingError("Invalid authentication token"); }
}

async function verifyOrganizationMembership(orgId: string, uid: string, finance = false): Promise<OrgRole> {
  const membershipSnap = await adminDb.doc(`organizations/${orgId}/members/${uid}`).get();
  if (!membershipSnap.exists) throw new UploadThingError("Organization membership not found");
  const membership = membershipSnap.data();
  if (membership?.status !== "active") throw new UploadThingError("Organization membership is not active");
  const role = membership.role as OrgRole;
  if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) throw new UploadThingError("Invalid organization membership");
  const allowed = finance ? ROLE_PERMISSIONS[role].editFinance : ROLE_PERMISSIONS[role].editOperations;
  if (!allowed) throw new UploadThingError("Insufficient organization permissions");
  return role;
}

export const ourFileRouter = {
  podEvidence: f({ image: { maxFileSize: "8MB", maxFileCount: 1 }, pdf: { maxFileSize: "8MB", maxFileCount: 1 } })
    .input(evidenceInput)
    .middleware(async ({ req, input }) => {
      const user = await authenticateRequest(req);
      const role = await verifyOrganizationMembership(input.orgId, user.uid);
      const [deliverySnap, noteSnap] = await Promise.all([
        adminDb.doc(`organizations/${input.orgId}/deliveries/${input.deliveryId}`).get(),
        adminDb.doc(`organizations/${input.orgId}/deliveryNotes/${input.deliveryNoteId}`).get(),
      ]);
      if (!deliverySnap.exists || !noteSnap.exists) throw new UploadThingError("Delivery record not found");
      const delivery = deliverySnap.data(); const note = noteSnap.data();
      if (delivery?.deliveryNoteId !== input.deliveryNoteId || note?.deliveryId !== input.deliveryId) throw new UploadThingError("Delivery and Delivery Note do not match");
      return { uid: user.uid, orgId: input.orgId, role, deliveryId: input.deliveryId, deliveryNoteId: input.deliveryNoteId, kind: input.kind };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const uploadedAt = Timestamp.now();
      const evidence = { id: file.key, key: file.key, url: file.ufsUrl, kind: metadata.kind, uploadedBy: metadata.uid, uploadedAt };
      await Promise.all([
        adminDb.doc(`organizations/${metadata.orgId}/deliveries/${metadata.deliveryId}`).update({ evidenceRefs: FieldValue.arrayUnion(evidence), podState: "incomplete", updatedAt: uploadedAt, updatedBy: metadata.uid }),
        adminDb.doc(`organizations/${metadata.orgId}/deliveryNotes/${metadata.deliveryNoteId}`).update({ evidenceRefs: FieldValue.arrayUnion(evidence), podState: "incomplete", updatedAt: uploadedAt, updatedBy: metadata.uid }),
      ]);
      return { uploadedBy: metadata.uid, organizationId: metadata.orgId, role: metadata.role, deliveryId: metadata.deliveryId, deliveryNoteId: metadata.deliveryNoteId, url: file.ufsUrl, key: file.key, kind: metadata.kind };
    }),

  financeReceipt: f({ image: { maxFileSize: "8MB", maxFileCount: 1 }, pdf: { maxFileSize: "8MB", maxFileCount: 1 } })
    .input(fuelReceiptInput)
    .middleware(async ({ req, input }) => {
      const user = await authenticateRequest(req);
      const role = await verifyOrganizationMembership(input.orgId, user.uid);
      const fuelRef = adminDb.doc(`organizations/${input.orgId}/fuelLogs/${input.fuelLogId}`);
      if (!(await fuelRef.get()).exists) throw new UploadThingError("Fuel log not found");
      return { uid: user.uid, orgId: input.orgId, role, fuelLogId: input.fuelLogId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const uploadedAt = Timestamp.now();
      await adminDb.doc(`organizations/${metadata.orgId}/fuelLogs/${metadata.fuelLogId}`).update({ receiptUrl: file.ufsUrl, receiptKey: file.key, updatedAt: uploadedAt, updatedBy: metadata.uid });
      return { uploadedBy: metadata.uid, organizationId: metadata.orgId, fuelLogId: metadata.fuelLogId, url: file.ufsUrl, key: file.key };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
