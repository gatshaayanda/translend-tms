import type { Timestamp } from "firebase/firestore";
import type { BaseRecord } from "@/types/core";

/** Persisted operational telemetry for a trip. GPS remains optional until a live provider is connected. */
export interface TripMetrics extends BaseRecord {
  tripId: string;
  truckId: string;
  truckRegistration: string;
  loadedKm: number;
  emptyKm: number;
  plannedKm: number;
  routeVarianceKm: number;
  routeProgressPct: number;
  fuelLitres: number;
  fuelCost: number;
  revenueAmount: number;
  measuredAt: Timestamp;
  source: "manual" | "gps" | "import";
  notes: string;
}
