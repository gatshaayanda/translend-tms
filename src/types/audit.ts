import type { Timestamp } from "firebase/firestore";
import type { BaseRecord } from "@/types/core";

export type AuditAction = "create" | "update" | "status_change" | "upload" | "approve" | "reject" | "complete" | "resolve" | "reverse";

export interface AuditEvent extends BaseRecord {
  actorUid: string;
  actorRole: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  summary: string;
  metadata: Record<string, string | number | boolean | null>;
  occurredAt: Timestamp;
}
