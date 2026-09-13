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

export type RecordEnvironment = "LIVE" | "DEMO" | "SEED" | "FIXTURE";
export interface BaseRecord { id: string; orgId: string; environment: RecordEnvironment; createdAt: Timestamp; createdBy: string; updatedAt: Timestamp; updatedBy: string; deletedAt: Timestamp | null; }
export interface UserProfile { uid: string; email: string; displayName: string; photoURL: string | null; lastActiveOrgId: string | null; createdAt: Timestamp; updatedAt: Timestamp; }
export type OrgRole = "owner" | "operations_manager" | "dispatcher" | "fleet_manager" | "finance" | "driver" | "viewer";
export const ORG_ROLES: OrgRole[] = ["owner", "operations_manager", "dispatcher", "fleet_manager", "finance", "driver", "viewer"];
export const ROLE_LABELS: Record<OrgRole, string> = { owner: "Owner", operations_manager: "Operations Manager", dispatcher: "Dispatcher", fleet_manager: "Fleet Manager", finance: "Finance", driver: "Driver", viewer: "Viewer" };
export const ROLE_PERMISSIONS: Record<OrgRole, { manageOrg: boolean; manageMembers: boolean; editOperations: boolean; editFinance: boolean; driverAppOnly: boolean }> = {
  owner: { manageOrg: true, manageMembers: true, editOperations: true, editFinance: true, driverAppOnly: false },
  operations_manager: { manageOrg: false, manageMembers: true, editOperations: true, editFinance: false, driverAppOnly: false },
  dispatcher: { manageOrg: false, manageMembers: false, editOperations: true, editFinance: false, driverAppOnly: false },
  fleet_manager: { manageOrg: false, manageMembers: false, editOperations: true, editFinance: false, driverAppOnly: false },
  finance: { manageOrg: false, manageMembers: false, editOperations: false, editFinance: true, driverAppOnly: false },
  driver: { manageOrg: false, manageMembers: false, editOperations: false, editFinance: false, driverAppOnly: true },
  viewer: { manageOrg: false, manageMembers: false, editOperations: false, editFinance: false, driverAppOnly: false },
};
export interface Organization { id: string; name: string; country: string; currency: string; timezone: string; ownerUid: string; createdAt: Timestamp; updatedAt: Timestamp; memberCount: number; }
export interface OrgMember { uid: string; orgId: string; role: OrgRole; email: string; displayName: string; invitedBy: string | null; joinedAt: Timestamp; status: "active" | "invited" | "suspended"; }
export interface Customer extends BaseRecord { name: string; billingAddress: string; country: string; contactName: string; contactEmail: string; contactPhone: string; currency: string; paymentTermsDays: number; status: "active" | "inactive" | "prospect"; notes: string; stats: { openJobs: number; activeTrips: number; outstandingBalance: number; lastActivityAt: Timestamp | null }; }
export type TruckStatus = "available" | "on_trip" | "in_maintenance" | "out_of_service";
export interface Truck extends BaseRecord { registrationNumber: string; make: string; model: string; year: number; vinNumber: string; capacityTons: number; fuelType: "diesel" | "petrol" | "electric" | "hybrid"; status: TruckStatus; odometerKm: number; assignedDriverId: string | null; complianceExpiryDates: { licenseDisc: Timestamp | null; roadworthy: Timestamp | null; insurance: Timestamp | null }; notes: string; }
export type DriverStatus = "available" | "on_trip" | "on_leave" | "suspended";
export interface Driver extends BaseRecord { fullName: string; phone: string; email: string; licenseNumber: string; licenseClass: string; licenseExpiry: Timestamp | null; status: DriverStatus; assignedTruckId: string | null; linkedUid: string | null; notes: string; }
export type JobStatus = "draft" | "confirmed" | "dispatched" | "in_progress" | "completed" | "cancelled";
export interface Job extends BaseRecord { jobNumber: string; customerId: string; customerName: string; origin: string; destination: string; cargoDescription: string; cargoWeightTons: number; requestedPickupDate: Timestamp; requestedDeliveryDate: Timestamp; rate: number; currency: string; status: JobStatus; notes: string; }
export type TripStatus = "planned" | "en_route_pickup" | "loading" | "in_transit" | "unloading" | "completed" | "exception";
export interface Trip extends BaseRecord { jobId: string; jobNumber: string; truckId: string; truckRegistration: string; driverId: string; driverName: string; status: TripStatus; plannedStart: Timestamp; plannedEnd: Timestamp; actualStart: Timestamp | null; actualEnd: Timestamp | null; currentLocation: string | null; lastCheckpointAt: Timestamp | null; }
export type DeliveryStatus = "pending" | "delivered" | "partial" | "exception";
export type DeliveryAcknowledgementRole = "driver" | "foreman" | "receiver";
export interface DeliveryAcknowledgement { role: DeliveryAcknowledgementRole; name: string; uid: string | null; acknowledgedAt: Timestamp; }
export type DeliveryEvidenceStatus = "active" | "approved" | "rejected" | "replaced";
export interface DeliveryEvidenceRef { id: string; key: string; url: string; kind: "pod" | "photo" | "document" | "other"; uploadedBy: string; uploadedAt: Timestamp; required?: boolean; status?: DeliveryEvidenceStatus; version?: number; replacesEvidenceId?: string | null; reviewedBy?: string | null; reviewedAt?: Timestamp | null; rejectionReason?: string | null; }
export type DeliveryPodState = "not_started" | "incomplete" | "complete";
export interface MaterialLine { id: string; description: string; materialCode: string | null; quantity: number; unit: string; expectedQuantity: number | null; notes: string; }
export interface DeliveryNote extends BaseRecord { noteReference: string; noteDateTime: Timestamp; jobId: string; tripId: string; deliveryId: string; suppliedTo: string; customerName: string; vehicleRegistration: string; deliveryLocation: string; driverId: string; driverName: string; orderReference: string | null; podReference: string | null; loadingPoint: string | null; receivedByName: string; receivedByRole: string | null; notes: string; materialLines: MaterialLine[]; arrivalAt: Timestamp | null; arrivalBy: string | null; departureAt: Timestamp | null; departureBy: string | null; acknowledgements: DeliveryAcknowledgement[]; evidenceRefs: DeliveryEvidenceRef[]; exceptionIds: string[]; podState: DeliveryPodState; }
export type DeliveryExceptionCategory = "shortage" | "damage" | "quantity_discrepancy" | "wrong_material" | "refused" | "site" | "vehicle" | "other";
export type DeliveryExceptionStatus = "open" | "resolved" | "void";
export interface DeliveryException extends BaseRecord { deliveryNoteId: string; deliveryId: string; category: DeliveryExceptionCategory; description: string; reportedBy: string; reportedAt: Timestamp; status: DeliveryExceptionStatus; evidenceRefs: DeliveryEvidenceRef[]; resolutionNotes: string | null; resolvedBy: string | null; resolvedAt: Timestamp | null; }
export interface Delivery extends BaseRecord { tripId: string; jobId: string; status: DeliveryStatus; deliveredAt: Timestamp | null; receivedByName: string; podFileUrl: string | null; signatureUrl: string | null; exceptionReason: string | null; deliveryNoteId?: string | null; arrivalAt?: Timestamp | null; arrivalBy?: string | null; departureAt?: Timestamp | null; departureBy?: string | null; acknowledgements?: DeliveryAcknowledgement[]; evidenceRefs?: DeliveryEvidenceRef[]; exceptionIds?: string[]; podState?: DeliveryPodState; }
export interface ControlTowerSnapshot { activeTrips: number; jobsAwaitingDispatch: number; jobsDelayed: number; trucksAvailable: number; trucksInMaintenance: number; driversAvailable: number; deliveriesExceptionCount: number; generatedAt: Timestamp; }
