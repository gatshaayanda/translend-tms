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
}

export interface TelematicsIngestPayload {
  orgId: string;
  truckId: string;
  tripId?: string | null;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  speedKph?: number | null;
  headingDegrees?: number | null;
  capturedAt?: string;
  status?: TelemetryStatus;
}
