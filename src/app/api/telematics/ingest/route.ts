import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { TelematicsIngestPayload } from "@/types/location";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.TELEMATICS_INGEST_SECRET;
    if (!secret) return NextResponse.json({ error: "Telematics ingestion is not configured." }, { status: 503 });
    if (request.headers.get("x-translend-telematics-secret") !== secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const body = await request.json() as TelematicsIngestPayload;
    if (!body.orgId || !body.truckId || !Number.isFinite(body.latitude) || !Number.isFinite(body.longitude)) {
      return NextResponse.json({ error: "orgId, truckId, latitude and longitude are required." }, { status: 400 });
    }
    const capturedAt = body.capturedAt ? Timestamp.fromDate(new Date(body.capturedAt)) : Timestamp.now();
    await adminDb.collection("organizations").doc(body.orgId).collection("truckLocationEvents").add({
      orgId: body.orgId, truckId: body.truckId, tripId: body.tripId ?? null,
      latitude: body.latitude, longitude: body.longitude,
      accuracyMeters: body.accuracyMeters ?? null, speedKph: body.speedKph ?? null, headingDegrees: body.headingDegrees ?? null,
      capturedAt, source: "telematics", status: body.status ?? "unknown",
      environment: "LIVE", createdAt: FieldValue.serverTimestamp(), createdBy: "telematics", updatedAt: FieldValue.serverTimestamp(), updatedBy: "telematics", deletedAt: null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Telematics ingestion failed." }, { status: 500 });
  }
}
