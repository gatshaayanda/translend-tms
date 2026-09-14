import { Timestamp, type Transaction } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { AuditAction } from "@/types/audit";

export function recordAuditEvent({
  orgId,
  actorUid,
  actorRole,
  action,
  entityType,
  entityId,
  summary,
  metadata = {},
  transaction,
}: {
  orgId: string;
  actorUid: string;
  actorRole: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
  transaction?: Transaction;
}) {
  const now = Timestamp.now();
  const auditRef = getAdminDb().collection(`organizations/${orgId}/auditEvents`).doc();
  const data = {
    orgId,
    environment: "LIVE",
    createdAt: now,
    createdBy: actorUid,
    updatedAt: now,
    updatedBy: actorUid,
    deletedAt: null,
    actorUid,
    actorRole,
    action,
    entityType,
    entityId,
    summary,
    metadata,
    occurredAt: now,
  };

  if (transaction) {
    transaction.set(auditRef, data);
    return;
  }

  return auditRef.set(data);
}
