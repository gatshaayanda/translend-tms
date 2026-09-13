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
        const mappingData = mappingSnap.data();
        if (!mappingData) throw new Error("Telematics vehicle mapping could not be read.");
        if (mappingData.active === false) throw new Error("This telematics vehicle mapping is inactive.");
        if (mappingData.truckId && truckId && mappingData.truckId !== truckId) {
          throw new Error("Telematics vehicle is mapped to a different Translend truck.");
        }
        truckId = mappingData.truckId;
      }

      if (!truckId) throw new Error("No Translend truck mapping exists for this provider vehicle.");

      const truckRef = orgRef.collection("trucks").doc(truckId);
      const truckSnap = await transaction.get(truckRef);
      if (!truckSnap.exists || truckSnap.data()?.deletedAt) throw new Error("The mapped Translend truck does not exist or is inactive.");

      const eventKey = event.providerEventId
        ? createHash("sha256").update(`${event.provider}:${event.providerVehicleId}:${event.providerEventId}`).digest("hex")
        : fallbackEventId({ ...event, truckId });
      const eventRef = truckEventsRef.doc(eventKey);
      const existing = await transaction.get(eventRef);
      if (existing.exists) return { duplicate: true, eventId: eventKey, truckId };

      const capturedAt = Timestamp.fromDate(new Date(event.capturedAt));
      if (!mappingSnap.exists) {
        transaction.set(mappingRef, {
          orgId: event.orgId,
          provider: event.provider,
          providerVehicleId: event.providerVehicleId,
          truckId,
          active: true,
          lastEventAt: capturedAt,
          environment: "LIVE",
          createdAt: FieldValue.serverTimestamp(),
          createdBy: "telematics",
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: "telematics",
          deletedAt: null,
        });
      } else {
        const previousLastEvent = mappingSnap.data()?.lastEventAt as Timestamp | undefined;
        if (!previousLastEvent || capturedAt.toMillis() >= previousLastEvent.toMillis()) {
          transaction.update(mappingRef, {
            lastEventAt: capturedAt,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: "telematics",
          });
        }
      }

      transaction.create(eventRef, {
        orgId: event.orgId,
        truckId,
        tripId: event.tripId,
        latitude: event.latitude,
        longitude: event.longitude,
        accuracyMeters: event.accuracyMeters,
        speedKph: event.speedKph,
        headingDegrees: event.headingDegrees,
        capturedAt,
        source: "telematics",
        status: event.status,
        provider: event.provider,
        providerVehicleId: event.providerVehicleId,
      });

      return { duplicate: false, eventId: eventKey, truckId };
    });

    return NextResponse.json(result, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to ingest telematics event.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
