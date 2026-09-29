import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { OrgMember } from "@/types/core";

async function authenticate(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("Authentication required.");
  return getAdminAuth().verifyIdToken(header.slice(7));
}

export async function GET(request: Request) {
  try {
    const auth = await authenticate(request);
    const db = getAdminDb();

    const snap = await db.collectionGroup("members")
      .where("uid", "==", auth.uid)
      .where("status", "==", "active")
      .get();

    const memberships = snap.docs.map((doc) => doc.data() as OrgMember);
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await db.doc(`organizations/${membership.orgId}`).get();
        return org.exists ? { id: org.id, ...org.data() } : null;
      }),
    );

    return NextResponse.json({
      memberships,
      organizations: organizations.filter(Boolean),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Workspace lookup failed." },
      { status: 401 },
    );
  }
}
