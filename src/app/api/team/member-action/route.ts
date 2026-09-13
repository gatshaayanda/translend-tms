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
    const [actorSnap, targetSnap, orgSnap] = await Promise.all([actorRef.get(), targetRef.get(), orgRef.get()]);
    const actor = actorSnap.data(); const target = targetSnap.data();
    if (!actorSnap.exists || actor?.status !== "active" || !["owner", "operations_manager"].includes(actor.role)) return NextResponse.json({ error: "Workspace member management access required." }, { status: 403 });
    if (!targetSnap.exists || target?.status === undefined) return NextResponse.json({ error: "Workspace member not found." }, { status: 404 });
    if (memberUid === user.uid) return NextResponse.json({ error: "You cannot change your own workspace access from this screen." }, { status: 409 });
    if (action === "transfer_owner") {
      if (actor.role !== "owner") return NextResponse.json({ error: "Only the current workspace owner can transfer ownership." }, { status: 403 });
      if (target.role === "owner") return NextResponse.json({ error: "That member is already the workspace owner." }, { status: 409 });
      if (target.status !== "active") return NextResponse.json({ error: "Ownership can only be transferred to an active member." }, { status: 409 });
      const batch = db.batch(); const now = Timestamp.now();
      batch.update(orgRef, { ownerUid: memberUid, updatedAt: now });
      batch.update(actorRef, { role: "operations_manager", updatedAt: now, updatedBy: user.uid });
      batch.update(targetRef, { role: "owner", updatedAt: now, updatedBy: user.uid });
      await batch.commit();
      await recordAuditEvent({ orgId, actorUid: user.uid, actorRole: "owner", action: "update", entityType: "organization", entityId: orgId, summary: `Workspace ownership transferred to ${memberUid.slice(0, 8)}.`, metadata: { previousOwnerUid: user.uid, newOwnerUid: memberUid } });
      await notifyUsers({ orgId, recipientUids: [memberUid, user.uid], type: "driver_reminder", severity: "urgent", title: "Workspace ownership changed", message: memberUid === user.uid ? "You are now the workspace owner." : "Workspace ownership has been transferred to you; your previous owner access is now Operations Manager.", href: `/${orgId}/control-tower`, sourceId: orgId, sourceType: "organization" });
      return NextResponse.json({ ok: true, action });
    }
    if (target.role === "owner") return NextResponse.json({ error: "The workspace owner cannot be changed by this action." }, { status: 409 });
    if (action === "change_role" && role === "owner") return NextResponse.json({ error: "Use the controlled owner transfer action." }, { status: 409 });
    if (actor.role === "operations_manager" && target.role === "operations_manager") return NextResponse.json({ error: "Only the workspace owner can change another operations manager." }, { status: 403 });

    const now = Timestamp.now();
    if (action === "change_role") await targetRef.update({ role, updatedAt: now, updatedBy: user.uid });
    else if (action === "suspend") await targetRef.update({ status: "suspended", updatedAt: now, updatedBy: user.uid });
    else await targetRef.update({ status: "active", updatedAt: now, updatedBy: user.uid });

    await recordAuditEvent({ orgId, actorUid: user.uid, actorRole: actor.role, action: "update", entityType: "orgMember", entityId: memberUid, summary: `${action.replaceAll("_", " ")} for workspace member ${memberUid.slice(0, 8)}.`, metadata: { memberUid, action, role: role ?? target.role } });
    await notifyUsers({ orgId, recipientUids: [memberUid], type: "driver_reminder", severity: action === "suspend" ? "urgent" : "info", title: action === "suspend" ? "Workspace access suspended" : action === "restore" ? "Workspace access restored" : "Workspace role changed", message: action === "change_role" ? `Your Translend workspace role is now ${role}.` : action === "suspend" ? "Your access to this workspace has been suspended." : "Your access to this workspace has been restored.", href: `/${orgId}/control-tower`, sourceId: memberUid, sourceType: "orgMember" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Workspace member action failed." }, { status: 400 });
  }
}
