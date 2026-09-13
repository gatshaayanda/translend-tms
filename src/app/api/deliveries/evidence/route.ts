import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { OrgRole, DeliveryEvidenceRef } from "@/types/core";

const REVIEW_ROLES: OrgRole[] = ["owner", "operations_manager", "dispatcher", "fleet_manager", "finance", "viewer", "driver"];

export async function GET(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const user = await getAdminAuth().verifyIdToken(authorization.slice(7).trim());
    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId") ?? "";
    const deliveryId = url.searchParams.get("deliveryId") ?? "";
    const deliveryNoteId = url.searchParams.get("deliveryNoteId") ?? "";
    const evidenceId = url.searchParams.get("evidenceId") ?? "";
    if (!orgId || !deliveryId || !deliveryNoteId || !evidenceId) return NextResponse.json({ error: "Organization, delivery, delivery note and evidence are required." }, { status: 400 });

    const db = getAdminDb();
    const memberSnap = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!memberSnap.exists || memberSnap.data()?.status !== "active" || !REVIEW_ROLES.includes(memberSnap.data()?.role as OrgRole)) return NextResponse.json({ error: "Organization access required." }, { status: 403 });
    const [deliverySnap, noteSnap] = await Promise.all([
      db.doc(`organizations/${orgId}/deliveries/${deliveryId}`).get(),
      db.doc(`organizations/${orgId}/deliveryNotes/${deliveryNoteId}`).get(),
    ]);
    if (!deliverySnap.exists || !noteSnap.exists) return NextResponse.json({ error: "Delivery record not found." }, { status: 404 });
    if (deliverySnap.data()?.deliveryNoteId !== deliveryNoteId || noteSnap.data()?.deliveryId !== deliveryId) return NextResponse.json({ error: "Delivery and Delivery Note do not match." }, { status: 409 });
    const evidence = ((noteSnap.data()?.evidenceRefs ?? []) as DeliveryEvidenceRef[]).find((item) => item.id === evidenceId);
    if (!evidence || evidence.status === "replaced") return NextResponse.json({ error: "Evidence is not available." }, { status: 404 });
    if (!evidence.url) return NextResponse.json({ error: "Evidence file URL is missing." }, { status: 404 });

    const upstream = await fetch(evidence.url, { cache: "no-store" });
    if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "Evidence file could not be retrieved. Please retry." }, { status: 502 });
    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    const contentLength = upstream.headers.get("content-length");
    if (contentType) headers.set("content-type", contentType);
    if (contentLength) headers.set("content-length", contentLength);
    headers.set("content-disposition", `inline; filename="translend-${evidence.kind}-${evidence.version ?? 1}"`);
    headers.set("cache-control", "private, no-store");
    return new Response(upstream.body, { status: 200, headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Evidence access failed." }, { status: 401 });
  }
}
