import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { OrgRole } from "@/types/core";

const MANAGER_ROLES: OrgRole[] = ["owner", "operations_manager", "fleet_manager"];

async function authenticate(request: Request) {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new Error("Authentication required.");
  return getAdminAuth().verifyIdToken(header.slice(7));
}

async function requireManager(uid: string, orgId: string) {
  const db = getAdminDb();
  const member = await db.doc(`organizations/${orgId}/members/${uid}`).get();
  if (!member.exists || !MANAGER_ROLES.includes(member.data()?.role) || member.data()?.status !== "active") {
    throw new Error("You do not have permission to manage telematics mappings.");
  }
}

function mappingId(provider: string, providerVehicleId: string) {
  return createHash("sha256").update(`${provider}:${providerVehicleId}`).digest("hex");
}

export async function GET(request: Request) {
  try {
    const auth = await authenticate(request);
    const orgId = new URL(request.url).searchParams.get("orgId")?.trim();
    if (!orgId) return NextResponse.json({ error: "orgId is required." }, { status: 400 });
    await requireManager(auth.uid, orgId);
    const snap = await getAdminDb().collection(`organizations/${orgId}/telematicsVehicleMappings`).where("deletedAt", "==", null).get();
    const mappings = snap.docs.map((doc) => ({ id: doc.id, ...doc.data(), tokenHash: undefined })).map(({ tokenHash: _tokenHash, ...mapping }) => mapping);
    return NextResponse.json({ mappings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load telematics mappings." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await authenticate(request);
    const body = await request.json() as { orgId?: string; provider?: string; providerVehicleId?: string; truckId?: string };
    const orgId = body.orgId?.trim() ?? "";
    const provider = body.provider?.trim().toLowerCase() ?? "";
    const providerVehicleId = body.providerVehicleId?.trim() ?? "";
    const truckId = body.truckId?.trim() ?? "";
    if (!orgId || !provider || !providerVehicleId || !truckId) return NextResponse.json({ error: "orgId, provider, providerVehicleId and truckId are required." }, { status: 400 });
    await requireManager(auth.uid, orgId);
    const db = getAdminDb();
    const truckRef = db.doc(`organizations/${orgId}/trucks/${truckId}`);
    const truck = await truckRef.get();
    if (!truck.exists || truck.data()?.deletedAt) return NextResponse.json({ error: "Truck not found." }, { status: 404 });
    const ref = db.doc(`organizations/${orgId}/telematicsVehicleMappings/${mappingId(provider, providerVehicleId)}`);
    const existing = await ref.get();
    if (existing.exists && existing.data()?.deletedAt == null && existing.data()?.truckId !== truckId) return NextResponse.json({ error: "That provider vehicle is already mapped to another truck." }, { status: 409 });
    const data = {
      orgId,
      provider,
      providerVehicleId,
      truckId,
      active: true,
      lastEventAt: existing.exists ? existing.data()?.lastEventAt ?? null : null,
      environment: "LIVE" as const,
      createdAt: existing.exists ? existing.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      createdBy: existing.exists ? existing.data()?.createdBy ?? auth.uid : auth.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: auth.uid,
      deletedAt: null,
    };
    await ref.set(data);
    return NextResponse.json({ ok: true, mapping: { id: ref.id, ...data } }, { status: existing.exists ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save telematics mapping." }, { status: 401 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authenticate(request);
    const body = await request.json() as { orgId?: string; provider?: string; providerVehicleId?: string; active?: boolean };
    const orgId = body.orgId?.trim() ?? "";
    const provider = body.provider?.trim().toLowerCase() ?? "";
    const providerVehicleId = body.providerVehicleId?.trim() ?? "";
    if (!orgId || !provider || !providerVehicleId || typeof body.active !== "boolean") return NextResponse.json({ error: "orgId, provider, providerVehicleId and active are required." }, { status: 400 });
    await requireManager(auth.uid, orgId);
    const ref = getAdminDb().doc(`organizations/${orgId}/telematicsVehicleMappings/${mappingId(provider, providerVehicleId)}`);
    if (!(await ref.get()).exists) return NextResponse.json({ error: "Telematics mapping not found." }, { status: 404 });
    await ref.update({ active: body.active, updatedAt: FieldValue.serverTimestamp(), updatedBy: auth.uid });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update telematics mapping." }, { status: 401 });
  }
}
