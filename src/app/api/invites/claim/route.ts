import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { OrgRole } from "@/types/core";

async function authenticate(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("Authentication required.");
  return getAdminAuth().verifyIdToken(header.slice(7));
}

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    if (!auth.email || auth.email_verified === false) return NextResponse.json({ claimed: false, reason: "A verified Google email is required." }, { status: 403 });
    const db = getAdminDb();
    const email = auth.email.trim().toLowerCase();
    const snap = await db.collection("workspaceInvites").where("email", "==", email).get();
    const now = Date.now();
    const candidate = snap.docs.filter((doc) => doc.data().status === "pending" && doc.data().expiresAt?.toMillis?.() > now).sort((a, b) => b.data().createdAt.toMillis() - a.data().createdAt.toMillis())[0];
    if (!candidate) return NextResponse.json({ claimed: false });
    const invite = candidate.data();
    const orgRef = db.doc(`organizations/${invite.orgId}`);
    const memberRef = db.doc(`organizations/${invite.orgId}/members/${auth.uid}`);
    const userRef = db.doc(`users/${auth.uid}`);
    await db.runTransaction(async (tx) => {
      const orgSnap = await tx.get(orgRef);
      const memberSnap = await tx.get(memberRef);
      if (!orgSnap.exists) throw new Error("The invited workspace no longer exists.");
      if (memberSnap.exists && memberSnap.data()?.status === "active") {
        tx.update(candidate.ref, { status: "accepted", acceptedByUid: auth.uid, acceptedAt: FieldValue.serverTimestamp() });
        return;
      }
      if (memberSnap.exists && memberSnap.data()?.status === "suspended") throw new Error("Your existing workspace membership is suspended.");
      tx.set(memberRef, { uid: auth.uid, orgId: invite.orgId, role: invite.role as OrgRole, email, displayName: auth.name ?? email, invitedBy: invite.invitedBy, joinedAt: FieldValue.serverTimestamp(), status: "active" });
      tx.update(orgRef, { memberCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
      tx.update(candidate.ref, { status: "accepted", acceptedByUid: auth.uid, acceptedAt: FieldValue.serverTimestamp() });
      tx.set(userRef, { uid: auth.uid, email, displayName: auth.name ?? email, photoURL: auth.picture ?? null, lastActiveOrgId: invite.orgId, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() }, { merge: true });
    });
    return NextResponse.json({ claimed: true, orgId: invite.orgId });
  } catch (error) {
    return NextResponse.json({ claimed: false, error: error instanceof Error ? error.message : "Invitation could not be accepted." }, { status: 401 });
  }
}
