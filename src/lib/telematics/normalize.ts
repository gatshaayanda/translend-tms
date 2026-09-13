import { createHash } from "node:crypto";
import type { NormalizedTelematicsEvent, TelematicsIngestPayload, TelemetryStatus } from "@/types/location";

const PROVIDER_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/i;

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function optionalFinite(value: unknown): number | null {
  return value == null ? null : finite(value) ? value : NaN;
}

function normalizeStatus(status: unknown, speedKph: number | null): TelemetryStatus {
  if (status === "moving" || status === "idle" || status === "stopped") return status;
  if (speedKph != null) return speedKph > 3 ? "moving" : "idle";
  return "unknown";
}

export function normalizeTelematicsPayload(body: TelematicsIngestPayload): NormalizedTelematicsEvent {
  if (!body.orgId?.trim()) throw new Error("orgId is required.");
  if (!body.provider || !PROVIDER_PATTERN.test(body.provider)) throw new Error("A valid provider name is required.");
  if (!body.providerVehicleId?.trim()) throw new Error("providerVehicleId is required.");
  if (!finite(body.latitude) || body.latitude < -90 || body.latitude > 90) throw new Error("latitude must be between -90 and 90.");
  if (!finite(body.longitude) || body.longitude < -180 || body.longitude > 180) throw new Error("longitude must be between -180 and 180.");

  const accuracyMeters = optionalFinite(body.accuracyMeters);
  const speedKph = optionalFinite(body.speedKph);
  const headingDegrees = optionalFinite(body.headingDegrees);
  if (Number.isNaN(accuracyMeters) || Number.isNaN(speedKph) || Number.isNaN(headingDegrees)) throw new Error("Telemetry measurements must be valid numbers.");
  if (accuracyMeters != null && accuracyMeters < 0) throw new Error("accuracyMeters cannot be negative.");
  if (speedKph != null && speedKph < 0) throw new Error("speedKph cannot be negative.");
  if (headingDegrees != null && (headingDegrees < 0 || headingDegrees >= 360)) throw new Error("headingDegrees must be from 0 to less than 360.");

  const date = body.capturedAt ? new Date(body.capturedAt) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("capturedAt must be a valid ISO date.");
  if (date.getTime() > Date.now() + 5 * 60 * 1000) throw new Error("capturedAt cannot be more than five minutes in the future.");

  return {
    orgId: body.orgId.trim(),
    provider: body.provider.trim().toLowerCase(),
    providerVehicleId: body.providerVehicleId.trim(),
    providerEventId: body.providerEventId?.trim() || null,
    truckId: body.truckId?.trim() || "",
    tripId: body.tripId?.trim() || null,
    latitude: body.latitude,
    longitude: body.longitude,
    accuracyMeters,
    speedKph,
    headingDegrees,
    capturedAt: date.toISOString(),
    status: normalizeStatus(body.status, speedKph),
  };
}

export function fallbackEventId(event: NormalizedTelematicsEvent): string {
  return createHash("sha256")
    .update([
      event.provider,
      event.providerVehicleId,
      event.capturedAt,
      event.latitude.toFixed(6),
      event.longitude.toFixed(6),
      event.speedKph ?? "",
      event.headingDegrees ?? "",
    ].join("|"))
    .digest("hex");
}
