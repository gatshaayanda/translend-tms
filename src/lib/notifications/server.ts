import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { NotificationSeverity, NotificationType } from "@/types/notifications";
import type { OrgRole } from "@/types/core";

export async function notifyOrgRoles({ orgId, roles, type, severity, title, message, href, sourceId, sourceType }: {
  orgId: string;
  roles: OrgRole[];
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  href?: string | null;
  sourceId?: string | null;
  sourceType?: string | null;
}) {
  if (!roles.length) return 0;
  const db = getAdminDb();
  const members = await db.collection(`organizations/${orgId}/members`).get();
  const recipients = members.docs.filter((member) => member.data().status === "active" && roles.includes(member.data().role as OrgRole));
  if (!recipients.length) return 0;
  const now = Timestamp.now();
  const batch = db.batch();
  recipients.forEach((member) => {
    const ref = db.collection(`organizations/${orgId}/notifications`).doc();
    batch.set(ref, { orgId, environment: "LIVE", createdAt: now, createdBy: "system", updatedAt: now, updatedBy: "system", deletedAt: null, recipientUid: member.id, type, severity, title, message, href: href ?? null, sourceId: sourceId ?? null, sourceType: sourceType ?? null, readAt: null, roles });
  });
  await batch.commit();
  return recipients.length;
}
