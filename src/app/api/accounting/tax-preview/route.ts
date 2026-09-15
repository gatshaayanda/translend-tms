import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { calculateTax, type TaxSettings } from "@/lib/accounting/tax";

const ROLES = new Set(["owner", "finance"]);

export async function POST(request: Request) {
  try {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const user = await getAdminAuth().verifyIdToken(header.slice(7));
    const body = await request.json();
    const orgId = String(body.orgId ?? "");
    const amount = Number(body.amount);
    if (!orgId || !Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: "Organisation and a non-negative amount are required." }, { status: 400 });

    const db = getAdminDb();
    const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!member.exists || member.data()?.status !== "active" || !ROLES.has(String(member.data()?.role))) return NextResponse.json({ error: "Finance access required." }, { status: 403 });

    const snap = await db.doc(`organizations/${orgId}/taxSettings/default`).get();
    const raw = snap.exists ? snap.data() ?? {} : {};
    const settings: TaxSettings = {
      enabled: Boolean(raw.enabled),
      standardRate: Number(raw.standardRate ?? 0),
      mode: raw.mode === "inclusive" ? "inclusive" : "exclusive",
      taxCode: String(raw.taxCode ?? "VAT").trim() || "VAT",
      registrationNumber: String(raw.registrationNumber ?? "").trim(),
      legalName: String(raw.legalName ?? "").trim(),
    };
    return NextResponse.json({ ok: true, settings, breakdown: calculateTax(amount, settings) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Tax preview failed." }, { status: 500 });
  }
}
