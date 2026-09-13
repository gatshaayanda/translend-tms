import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { fallbackEventId, normalizeTelematicsPayload } from "@/lib/telematics/normalize";
import type { TelematicsIngestPayload } from "@/types/location";

function mappingId(provider: string, providerVehicleId: string) {
  return createHash("sha256").update(`${provider}:${providerVehicleId}`).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.TELEMATICS_INGEST_SECRET;
    if (!secret) return NextResponse.json({ error: "Telematics ingestion is not configured." }, { status: 503 });
    if (request.headers.get("x-translend-telematics-secret") !== secret) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = (await request.json()) as TelematicsIngestPayload;
    const event = normalizeTelematicsPayload(body);
    const orgRef = adminDb.collection("organizations").doc(event.orgId);
    const truckEventsRef = orgRef.collection("truckLocationEvents");
    const mappingsRef = orgRef.collection("telematicsVehicleMappings");
    const mappingRef = mappingsRef.doc(mappingId(event.provider, event.providerVehicleId));

    let truckId = event.truckId;
    const result = await adminDb.runTransaction(async (transaction) => {
      const mappingSnap = await transaction.get(mappingRef);
      if (mappingSnap.exists) {
        const mapping = mappingSnap.data();
        if (mapping.active === false) throw new Error("This telematics vehicle mapping is inactive.");
        if (mapping.truckId && truckId && mapping.truckId !== truckId) {
          throw new Error("Telematics vehicle is mapped to a different Translend truck.");
        }
        truckId = mapping.truckId;
      }

      if (!truckId) throw new Error("No Translend truck mapping exists for this provider vehicle.");

      const truckRef = orgRef.collection("trucks").doc(truckId);
      const truckSnap = await transaction.get(truckRef);
      if (!truckSnap.exists || truckSnap.data()?.deletedAt) throw new Error("The mapped Translend truck does not exist or is inactive.");

      if (!mappingSnap.exists) {
        transaction.set(mappingRef, {
          orgId: event.orgId,
          provider: event.provider,
          providerVehicleId: event.providerVehicleId,
          truckId,
          active: true,
          lastEventAt: Timestamp.fromDate(new Date(event.capturedAt)),
          environment: "LIVE",
          createdAt: FieldValue.serverTimestamp(),
          createdBy: "telematics",
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "telematics",
          deletedAt: null,
        });
      } else {
        transaction.update(mappingRef, {
          lastEventAt: Timestamp.fromDate(new Date(event.capturedAt)),
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "telematics",
        });
      }

      const eventKey = event.providerEventId
        ? createHash("sha256").update(`${event.provider}:${event.providerVehicleId}:${event.providerEventId}`).digest("hex")
        : fallbackEventId({ ...event, truckId });
      const eventRef = truckEventsRef.doc(eventKey);
      const existing = await transaction.get(eventRef);
      if (existing.exists) return { duplicate: true, eventId: eventKey, truckId };

      transaction.create(eventRef, {
        orgId: event.orgId,
        truckId,
        tripId: event.tripId,
        latitude: event.latitude,
        longitude: event.longitude,
        accuracyMeters: event.accuracyMeters,
        speedKph: event.speedKph,
        headingDegrees: event.headingDegrees,
        capturedAt: Timestamp.fromDate(new Date(event.capturedAt)),
        source: "telematics",
        status: event.status,
        provider: event.provider,
        providerVehicleId: event.providerVehicleId,
        providerEventId: event.providerEventId,
        environment: "LIVE",
        createdAt: FieldValue.serverTimestamp(),
        createdBy: "telematics",
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: "telematics",
        deletedAt: null,
      });
      return { duplicate: false, eventId: eventKey, truckId };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Telematics ingestion failed.";
    const status = /required|valid|between|negative|cannot be|mapping|mapped|does not exist|inactive/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
