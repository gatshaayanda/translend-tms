import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { createHash, randomBytes } from "node:crypto";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { OrgRole } from "@/types/core";

const INVITABLE_ROLES: OrgRole[] = ["operations_manager", "dispatcher", "fleet_manager", "finance", "driver", "viewer"];

type InviteRecord = {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  status: string;
  expiresAt?: { toMillis?: () => number };
  createdAt?: { toMillis?: () => number };
  tokenHash?: string;
  [key: string]: unknown;
};

async function authenticate(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("Authentication required.");
  return getAdminAuth().verifyIdToken(header.slice(7));
}

async function requireManager(uid: string, orgId: string) {
  const db = getAdminDb();
  const member = await db.doc(`organizations/${orgId}/members/${uid}`).get();
  if (!member.exists || !["owner", "operations_manager"].includes(member.data()?.role) || member.data()?.status !== "active") throw new Error("You do not have permission to manage this workspace.");
  return member.data()!;
}

export async function GET(request: Request) {
  try {
    const auth = await authenticate(request);
    const orgId = new URL(request.url).searchParams.get("orgId");
    if (!orgId) return NextResponse.json({ error: "orgId is required." }, { status: 400 });
    await requireManager(auth.uid, orgId);
    const db = getAdminDb();
    const snap = await db.collection("workspaceInvites").where("orgId", "==", orgId).get();
    const now = Date.now();
    const invites = snap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) }) as InviteRecord)
      .filter((invite) => invite.status === "pending" && (invite.expiresAt?.toMillis?.() ?? 0) > now)
      .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0))
      .map(({ tokenHash: _tokenHash, ...safe }) => safe);
    return NextResponse.json({ invites });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load invitations." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = String(body.role ?? "") as OrgRole;
    if (!orgId || !email || !email.includes("@") || !INVITABLE_ROLES.includes(role)) return NextResponse.json({ error: "A valid email and role are required." }, { status: 400 });
    const manager = await requireManager(auth.uid, orgId);
    const db = getAdminDb();
    const org = await db.doc(`organizations/${orgId}`).get();
    if (!org.exists) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    const existingMember = await db.collection(`organizations/${orgId}/members`).where("email", "==", email).limit(1).get();
    if (!existingMember.empty && existingMember.docs[0].data().status === "active") return NextResponse.json({ error: "That email is already an active workspace member." }, { status: 409 });
    const pending = await db.collection("workspaceInvites").where("orgId", "==", orgId).get();
    const batch = db.batch();
    pending.docs.filter((d) => d.data().status === "pending" && d.data().email === email).forEach((d) => batch.update(d.ref, { status: "revoked", updatedAt: FieldValue.serverTimestamp() }));
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const inviteRef = db.collection("workspaceInvites").doc();
    const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
    batch.set(inviteRef, { orgId, email, role, invitedBy: auth.uid, invitedByName: manager.displayName ?? auth.name ?? auth.email ?? "Workspace manager", tokenHash, createdAt: FieldValue.serverTimestamp(), expiresAt, status: "pending", acceptedByUid: null, acceptedAt: null });
    await batch.commit();
    return NextResponse.json({ id: inviteRef.id, email, role, expiresAt: expiresAt.toDate().toISOString(), delivery: "pending" }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create invitation." }, { status: 401 });
  }
}
