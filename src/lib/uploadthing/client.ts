import type { User } from "firebase/auth";
import { genUploader } from "uploadthing/client";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

const { uploadFiles } = genUploader<OurFileRouter>();

export type DeliveryEvidenceKind = "pod" | "photo" | "document" | "other";

export async function uploadDeliveryEvidence({ user, orgId, deliveryId, deliveryNoteId, kind, file }: {
  user: User; orgId: string; deliveryId: string; deliveryNoteId: string; kind: DeliveryEvidenceKind; file: File;
}) {
  const token = await user.getIdToken();
  return uploadFiles("podEvidence", { files: [file], input: { orgId, deliveryId, deliveryNoteId, kind }, headers: { Authorization: `Bearer ${token}` } });
}

export async function uploadFuelReceipt({ user, orgId, fuelLogId, file }: { user: User; orgId: string; fuelLogId: string; file: File }) {
  const token = await user.getIdToken();
  return uploadFiles("financeReceipt", { files: [file], input: { orgId, fuelLogId }, headers: { Authorization: `Bearer ${token}` } });
}
