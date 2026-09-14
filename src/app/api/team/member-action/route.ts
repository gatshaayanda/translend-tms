import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import type { OrgRole } from "@/types/core";
import { notifyUsers } from "@/lib/notifications/server";
import { recordAuditEvent } from "@/lib/audit/server";

const ROLES: OrgRole[] = ["owner", "operations_manager", "dispatcher", "fleet_manager", "finance", "driver", "viewer"];

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const user = await getAdminAuth().verifyIdToken(authorization.slice(7).trim());
    const { orgId, memberUid, action, role } = await request.json();
    if (!orgId || !memberUid || !["change_role", "suspend", "restore", "transfer_owner"].includes(action)) return NextResponse.json({ error: "Workspace, member and valid action are required." }, { status: 400 });
    if (action === "change_role" && (!role || !ROLES.includes(role))) return NextResponse.json({ error: "A valid role is required." }, { status: 400 });

    const db = getAdminDb();
    const actorRef = db.doc(`organizations/${orgId}/members/${user.uid}`);
    const targetRef = db.doc(`organizations/${orgId}/members/${memberUid}`);
    const orgRef = db.doc(`organizations/${orgId}`);
    const now = Timestamp.now();
    const result = await db.runTransaction(async (tx) => {
      const [actorSnap, targetSnap, orgSnap] = await Promise.all([tx.get(actorRef), tx.get(targetRef), tx.get(orgRef)]);
      const actor = actorSnap.data();
      const target = targetSnap.data();
      if (!actorSnap.exists || actor?.status !== "active" || !["owner", "operations_manager"].includes(actor.role)) throw new Error("Workspace member management access required.");
      if (!targetSnap.exists || target?.status === undefined) throw new Error("Workspace member not found.");
      if (!orgSnap.exists) throw new Error("Workspace not found.");
      if (memberUid === user.uid) throw new Error("You cannot change your own workspace access from this screen.");

      if (action === "transfer_owner") {
        if (actor.role !== "owner") throw new Error("Only the current workspace owner can transfer ownership.");
        if (target.role === "owner") throw new Error("That member is already the workspace owner.");
        if (target.status !== "active") throw new Error("Ownership can only be transferred to an active member.");
        tx.update(orgRef, { ownerUid: memberUid, updatedAt: now, updatedBy: user.uid });
        tx.update(actorRef, { role: "operations_manager", updatedAt: now, updatedBy: user.uid });
        tx.update(targetRef, { role: "owner", updatedAt: now, updatedBy: user.uid });
        recordAuditEvent({ orgId, actorUid: user.uid, actorRole: "owner", action: "update", entityType: "organization", entityId: orgId, summary: `Workspace ownership transferred to ${memberUid.slice(0, 8)}.`, metadata: { previousOwnerUid: user.uid, newOwnerUid: memberUid }, transaction: tx });
        return { action, recipientUids: [memberUid, user.uid], notificationType: "transfer" as const };
      }

      if (target.role === "owner") throw new Error("The workspace owner cannot be changed by this action.");
      if (action === "change_role" && role === "owner") throw new Error("Use the controlled owner transfer action.");
      if (actor.role === "operations_manager" && target.role === "operations_manager") throw new Error("Only the workspace owner can change another operations manager.");

      if (action === "change_role") tx.update(targetRef, { role, updatedAt: now, updatedBy: user.uid });
      else if (action === "suspend") tx.update(targetRef, { status: "suspended", updatedAt: now, updatedBy: user.uid });
      else tx.update(targetRef, { status: "active", updatedAt: now, updatedBy: user.uid });
      recordAuditEvent({ orgId, actorUid: user.uid, actorRole: actor.role, action: "update", entityType: "orgMember", entityId: memberUid, summary: `${action.replaceAll("_", " ")} for workspace member ${memberUid.slice(0, 8)}.`, metadata: { memberUid, action, role: role ?? target.role }, transaction: tx });
      return { action, recipientUids: [memberUid], notificationType: "member" as const };
    });

    if (result.notificationType === "transfer") {
      await notifyUsers({ orgId, recipientUids: result.recipientUids, type: "driver_reminder", severity: "urgent", title: "Workspace ownership changed", message: "Workspace ownership has been transferred to you; the previous owner is now Operations Manager.", href: `/${orgId}/control-tower`, sourceId: orgId, sourceType: "organization" });
    } else {
      const notificationAction = result.action;
      await notifyUsers({ orgId, recipientUids: result.recipientUids, type: "driver_reminder", severity: notificationAction === "suspend" ? "urgent" : "info", title: notificationAction === "suspend" ? "Workspace access suspended" : notificationAction === "restore" ? "Workspace access restored" : "Workspace role changed", message: notificationAction === "change_role" ? `Your Translend workspace role is now ${role}.` : notificationAction === "suspend" ? "Your access to this workspace has been suspended." : "Your access to this workspace has been restored.", href: `/${orgId}/control-tower`, sourceId: memberUid, sourceType: "orgMember" });
    }
    return NextResponse.json({ ok: true, action: result.action });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Workspace member action failed." }, { status: 400 });
  }
}
