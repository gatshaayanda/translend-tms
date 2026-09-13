import type { Timestamp } from "firebase/firestore";
import type { BaseRecord, OrgRole } from "@/types/core";

export type NotificationType = "assignment" | "missing_pod" | "pod_rejected" | "route_variance" | "maintenance" | "inspection" | "finance_due" | "driver_reminder" | "exception";
export type NotificationSeverity = "info" | "warning" | "urgent";

export interface NotificationRecord extends BaseRecord {
  recipientUid: string;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  href: string | null;
  sourceId: string | null;
  sourceType: string | null;
  readAt: Timestamp | null;
  roles?: OrgRole[];
}
