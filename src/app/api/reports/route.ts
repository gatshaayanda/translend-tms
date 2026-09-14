import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import type { OrgRole } from "@/types/core";

const ALLOWED_ROLES: OrgRole[] = ["owner", "operations_manager", "finance"];
const COLLECTIONS = [
  "customers", "trucks", "drivers", "jobs", "trips", "deliveries", "fuelLogs", "workOrders",
  "maintenanceSchedules", "vehicleInspections", "invoices", "supplierPOs", "supplierBills", "invoicePayments", "journalEntries",
] as const;

class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function serialize(value: unknown): unknown {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === "object") {
    const candidate = value as { toMillis?: () => number };
    if (typeof candidate.toMillis === "function") return candidate.toMillis();
    if (Array.isArray(value)) return value.map(serialize);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialize(item)]));
  }
  return value;
}

export async function GET(request: Request) {
  try {
    const header = request.headers.get("authorization");
    if (!header?.startsWith("Bearer ")) throw new ApiError(401, "Authentication required.");
    const user = await getAdminAuth().verifyIdToken(header.slice(7));
    const orgId = new URL(request.url).searchParams.get("orgId")?.trim() ?? "";
    if (!orgId) throw new ApiError(400, "Workspace is required.");

    const db = getAdminDb();
    const member = await db.doc(`organizations/${orgId}/members/${user.uid}`).get();
    if (!member.exists || member.data()?.status !== "active") throw new ApiError(403, "Active workspace membership required.");
    const role = String(member.data()?.role ?? "") as OrgRole;
    if (!ALLOWED_ROLES.includes(role)) throw new ApiError(403, "Reporting access is not permitted for this workspace role.");

    const snapshots = await Promise.all(COLLECTIONS.map((name) => db.collection(`organizations/${orgId}/${name}`).get()));
    const data = Object.fromEntries(COLLECTIONS.map((name, index) => [
      name,
      snapshots[index].docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((record) => record.environment === "LIVE" && record.deletedAt == null)
        .map(serialize),
    ]));

    return NextResponse.json({ data });
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Reports could not be loaded." }, { status });
  }
}
