// =============================================================
// Translend TMS · Truck Division v19
// Core shared domain types
// =============================================================
// These types are the single source of truth for Firestore
// document shapes. Every read/write in lib/firebase/* should be
// typed against these. Keep this file framework-agnostic (no
// React, no Next.js imports) so it can be shared by scripts,
// cloud functions, and the client app alike.

import type { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------
// Environment / record hygiene
// ---------------------------------------------------------------
// Every business record must declare which "lane" it belongs to.
// This is how we guarantee demo/seed data can NEVER leak into a
// real customer workspace, and vice versa.
export type RecordEnvironment = "LIVE" | "DEMO" | "SEED" | "FIXTURE";

export interface BaseRecord {
  id: string;
  orgId: string;
  environment: RecordEnvironment;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt: Timestamp;
  updatedBy: string;
  /** Soft delete. Never hard-delete operational records. */
  deletedAt: Timestamp | null;
}

// ---------------------------------------------------------------
// Users & Organizations (workspaces)
// ---------------------------------------------------------------
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  /** The org the user last worked in. Used to skip the picker on
   * next sign-in. Not a source of truth for access control. */
  lastActiveOrgId: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type OrgRole =
  | "owner"
  | "operations_manager"
  | "dispatcher"
  | "fleet_manager"
  | "finance"
  | "driver"
  | "viewer";

export const ORG_ROLES: OrgRole[] = [
  "owner",
  "operations_manager",
  "dispatcher",
  "fleet_manager",
  "finance",
  "driver",
  "viewer",
];

export const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  operations_manager: "Operations Manager",
  dispatcher: "Dispatcher",
  fleet_manager: "Fleet Manager",
  finance: "Finance",
  driver: "Driver",
  viewer: "Viewer",
};

export interface Organization {
  id: string;
  name: string;
  country: string;
  currency: string; // ISO 4217, e.g. "BWP", "ZAR", "USD"
  timezone: string; // IANA tz, e.g. "Africa/Gaborone"
  ownerUid: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Denormalized so security rules and UI don't need a members
   * query just to check "does this org have anyone in it yet". */
  memberCount: number;
}

export interface OrgMember {
  uid: string;
  orgId: string;
  role: OrgRole;
  email: string;
  displayName: string;
  invitedBy: string | null;
  joinedAt: Timestamp;
  status: "active" | "invited" | "suspended";
}

// Permission matrix — deliberately explicit rather than clever,
// so it's auditable at a glance and cheap to extend per-module.
export const ROLE_PERMISSIONS: Record<
  OrgRole,
  { manageOrg: boolean; manageMembers: boolean; editOperations: boolean; editFinance: boolean; driverAppOnly: boolean }
> = {
  owner: { manageOrg: true, manageMembers: true, editOperations: true, editFinance: true, driverAppOnly: false },
  operations_manager: { manageOrg: false, manageMembers: true, editOperations: true, editFinance: false, driverAppOnly: false },
  dispatcher: { manageOrg: false, manageMembers: false, editOperations: true, editFinance: false, driverAppOnly: false },
  fleet_manager: { manageOrg: false, manageMembers: false, editOperations: true, editFinance: false, driverAppOnly: false },
  finance: { manageOrg: false, manageMembers: false, editOperations: false, editFinance: true, driverAppOnly: false },
  driver: { manageOrg: false, manageMembers: false, editOperations: false, editFinance: false, driverAppOnly: true },
  viewer: { manageOrg: false, manageMembers: false, editOperations: false, editFinance: false, driverAppOnly: false },
};

// ---------------------------------------------------------------
// Commercial — Customers
// ---------------------------------------------------------------
export interface Customer extends BaseRecord {
  name: string;
  billingAddress: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  paymentTermsDays: number;
  status: "active" | "inactive" | "prospect";
  notes: string;
  /** Denormalized rollups, recomputed by a backend job — never
   * hand-edited from the client. */
  stats: {
    openJobs: number;
    activeTrips: number;
    outstandingBalance: number;
    lastActivityAt: Timestamp | null;
  };
}

// ---------------------------------------------------------------
// Fleet — Trucks
// ---------------------------------------------------------------
export type TruckStatus = "available" | "on_trip" | "in_maintenance" | "out_of_service";

export interface Truck extends BaseRecord {
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  vinNumber: string;
  capacityTons: number;
  fuelType: "diesel" | "petrol" | "electric" | "hybrid";
  status: TruckStatus;
  odometerKm: number;
  assignedDriverId: string | null;
  complianceExpiryDates: {
    licenseDisc: Timestamp | null;
    roadworthy: Timestamp | null;
    insurance: Timestamp | null;
  };
  notes: string;
}

// ---------------------------------------------------------------
// Fleet — Drivers
// ---------------------------------------------------------------
export type DriverStatus = "available" | "on_trip" | "on_leave" | "suspended";

export interface Driver extends BaseRecord {
  fullName: string;
  phone: string;
  email: string;
  licenseNumber: string;
  licenseClass: string;
  licenseExpiry: Timestamp | null;
  status: DriverStatus;
  assignedTruckId: string | null;
  linkedUid: string | null; // if the driver also has app login access
  notes: string;
}

// ---------------------------------------------------------------
// Operations — Jobs, Trips
// ---------------------------------------------------------------
export type JobStatus = "draft" | "confirmed" | "dispatched" | "in_progress" | "completed" | "cancelled";

export interface Job extends BaseRecord {
  jobNumber: string;
  customerId: string;
  customerName: string; // denormalized for list rendering
  origin: string;
  destination: string;
  cargoDescription: string;
  cargoWeightTons: number;
  requestedPickupDate: Timestamp;
  requestedDeliveryDate: Timestamp;
  rate: number;
  currency: string;
  status: JobStatus;
  notes: string;
}

export type TripStatus = "planned" | "en_route_pickup" | "loading" | "in_transit" | "unloading" | "completed" | "exception";

export interface Trip extends BaseRecord {
  jobId: string;
  jobNumber: string;
  truckId: string;
  truckRegistration: string;
  driverId: string;
  driverName: string;
  status: TripStatus;
  plannedStart: Timestamp;
  plannedEnd: Timestamp;
  actualStart: Timestamp | null;
  actualEnd: Timestamp | null;
  currentLocation: string | null;
  lastCheckpointAt: Timestamp | null;
}

// ---------------------------------------------------------------
// Delivery — POD & Exceptions
// ---------------------------------------------------------------
export type DeliveryStatus = "pending" | "delivered" | "partial" | "exception";

export interface Delivery extends BaseRecord {
  tripId: string;
  jobId: string;
  status: DeliveryStatus;
  deliveredAt: Timestamp | null;
  receivedByName: string;
  podFileUrl: string | null; // Firebase Storage download URL
  signatureUrl: string | null;
  exceptionReason: string | null;
}

// ---------------------------------------------------------------
// Control Tower aggregation shape (client-computed for now;
// intended to migrate to a scheduled aggregation job later)
// ---------------------------------------------------------------
export interface ControlTowerSnapshot {
  activeTrips: number;
  jobsAwaitingDispatch: number;
  jobsDelayed: number;
  trucksAvailable: number;
  trucksInMaintenance: number;
  driversAvailable: number;
  deliveriesExceptionCount: number;
  generatedAt: Timestamp;
}
