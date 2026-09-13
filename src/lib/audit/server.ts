import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { AuditAction } from "@/types/audit";

export async function recordAuditEvent({ orgId, actorUid, actorRole, action, entityType, entityId, summary, metadata = {} }: {
  orgId: string; actorUid: string; actorRole: string; action: AuditAction; entityType: string; entityId: string; summary: string; metadata?: Record<string, string | number | boolean | null>;
}) {
  const now = Timestamp.now();
  await getAdminDb().collection(`organizations/${orgId}/auditEvents`).add({ orgId, environment: "LIVE", createdAt: now, createdBy: actorUid, updatedAt: now, updatedBy: actorUid, deletedAt: null, actorUid, actorRole, action, entityType, entityId, summary, metadata, occurredAt: now });
}
