import type { Timestamp } from "firebase/firestore";
import type { BaseRecord } from "@/types/core";

export type LocationSource = "driver_gps" | "telematics";
export type TelemetryStatus = "moving" | "idle" | "stopped" | "unknown";

export interface TruckLocationEvent extends BaseRecord {
  truckId: string;
  tripId: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  speedKph: number | null;
  headingDegrees: number | null;
  capturedAt: Timestamp;
  source: LocationSource;
  status: TelemetryStatus;
  provider?: string | null;
  providerVehicleId?: string | null;
  providerEventId?: string | null;
}

/** Normalized event produced by a provider adapter before persistence. */
export interface NormalizedTelematicsEvent {
  orgId: string;
  provider: string;
  providerVehicleId: string;
  providerEventId: string | null;
  truckId: string;
  tripId: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  speedKph: number | null;
  headingDegrees: number | null;
  capturedAt: string;
  status: TelemetryStatus;
}

/** Maps a provider's vehicle/device identifier to a Translend truck. */
export interface TelematicsVehicleMapping extends BaseRecord {
  provider: string;
  providerVehicleId: string;
  truckId: string;
  active: boolean;
  lastEventAt: Timestamp | null;
}

export interface TelematicsIngestPayload {
  orgId: string;
  provider: string;
  providerVehicleId: string;
  providerEventId?: string | null;
  truckId?: string;
  tripId?: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  speedKph?: number | null;
  headingDegrees?: number | null;
  capturedAt?: string;
  status?: TelemetryStatus;
}
