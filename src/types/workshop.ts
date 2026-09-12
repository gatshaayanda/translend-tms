import type { Timestamp } from "firebase/firestore";
import type { BaseRecord } from "@/types/core";

export type WorkOrderLifecycleStatus = "open" | "scheduled" | "in_progress" | "completed" | "cancelled";

export interface MaintenanceSchedule extends BaseRecord {
  truckId: string;
  truckRegistration: string;
  serviceType: string;
  intervalKm: number | null;
  intervalDays: number | null;
  nextDueKm: number | null;
  nextDueAt: Timestamp | null;
  lastCompletedKm: number | null;
  lastCompletedAt: Timestamp | null;
  status: "active" | "paused" | "completed";
  notes: string;
}

export interface VehicleInspection extends BaseRecord {
  truckId: string;
  truckRegistration: string;
  inspectionDate: Timestamp;
  inspectionType: "pre_trip" | "periodic" | "roadworthy" | "post_repair";
  result: "pass" | "attention" | "fail";
  odometerKm: number;
  findings: string;
  inspectorName: string;
  nextDueAt: Timestamp | null;
}

export interface TyreRecord extends BaseRecord {
  truckId: string;
  truckRegistration: string;
  position: string;
  serialNumber: string;
  brand: string;
  size: string;
  fittedAt: Timestamp;
  fittedOdometerKm: number;
  currentOdometerKm: number;
  status: "fitted" | "spare" | "removed" | "retired";
  notes: string;
}
