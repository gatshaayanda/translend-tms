import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

const ROLES = new Set(["owner", "finance"]);
async function context(request: Request, orgId: string) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  let user;
  try { user = await getAdminAuth().verifyIdToken(header.slice(7)); } catch { return { error: NextResponse.json({ error: "Invalid authentication token." }, { status: 401 }) }; }
  const db = getAdminDb(); const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
  if (!member.exists || member.data()?.status !== "active" || !ROLES.has(String(member.data()?.role))) return { error: NextResponse.json({ error: "Finance access required." }, { status: 403 }) };
  return { user, db };
}
export async function GET(request: Request) {
  const orgId = new URL(request.url).searchParams.get("orgId") ?? "";
  if (!orgId) return NextResponse.json({ error: "Organisation is required." }, { status: 400 });
  const ctx = await context(request, orgId); if (ctx.error) return ctx.error;
  const snap = await ctx.db.doc(`organizations/${orgId}/taxSettings/default`).get();
  return NextResponse.json({ ok: true, settings: snap.exists ? snap.data() : { enabled: false, standardRate: 0, mode: "exclusive", taxCode: "VAT", registrationNumber: "", legalName: "" } });
}
export async function PUT(request: Request) {
  try {
    const body = await request.json(); const orgId = String(body.orgId ?? "");
    if (!orgId) return NextResponse.json({ error: "Organisation is required." }, { status: 400 });
    const ctx = await context(request, orgId); if (ctx.error) return ctx.error;
    const enabled = Boolean(body.enabled); const standardRate = Number(body.standardRate); const mode = String(body.mode ?? "exclusive");
    if (!Number.isFinite(standardRate) || standardRate < 0 || standardRate > 100) return NextResponse.json({ error: "Tax rate must be between 0 and 100%." }, { status: 400 });
    if (!["exclusive", "inclusive"].includes(mode)) return NextResponse.json({ error: "Tax mode must be exclusive or inclusive." }, { status: 400 });
    const ref = ctx.db.doc(`organizations/${orgId}/taxSettings/default`);
    await ref.set({ orgId, environment: "LIVE", enabled, standardRate, mode, taxCode: String(body.taxCode ?? "VAT").trim() || "VAT", registrationNumber: String(body.registrationNumber ?? "").trim(), legalName: String(body.legalName ?? "").trim(), updatedAt: FieldValue.serverTimestamp(), updatedBy: ctx.user.uid, createdAt: FieldValue.serverTimestamp(), createdBy: ctx.user.uid, deletedAt: null }, { merge: true });
    return NextResponse.json({ ok: true, message: "Tax configuration saved." });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Tax configuration failed." }, { status: 500 }); }
}
