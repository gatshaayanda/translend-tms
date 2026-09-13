import type { Timestamp } from "firebase/firestore";
import type { OrgRole } from "./core";

export type WorkspaceInviteStatus = "pending" | "accepted" | "revoked" | "expired";

export interface WorkspaceInvite {
  id: string;
  orgId: string;
  email: string;
  role: Exclude<OrgRole, "owner">;
  invitedBy: string;
  invitedByName: string;
  tokenHash: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  status: WorkspaceInviteStatus;
  acceptedByUid: string | null;
  acceptedAt: Timestamp | null;
}
