// =============================================================
// Firestore data layer — Users / Organizations / Membership
// =============================================================
// Collection layout:
//   /users/{uid}
//   /organizations/{orgId}
//   /organizations/{orgId}/members/{uid}
//
// This module is the ONLY place that touches those three
// collections directly. Contexts and pages call these functions;
// they never call Firestore SDK functions on these paths inline.

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  runTransaction,
  increment,
} from "firebase/firestore";
import { getFirebase } from "./client";
import type { UserProfile, Organization, OrgMember, OrgRole } from "@/types/core";

// ---------- Users ----------

export async function ensureUserProfile(uid: string, data: { email: string; displayName: string; photoURL: string | null }) {
  const { db } = getFirebase();
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile: Omit<UserProfile, "createdAt" | "updatedAt"> = {
      uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      lastActiveOrgId: null,
    };
    await setDoc(ref, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  return ref;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const { db } = getFirebase();
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function setLastActiveOrg(uid: string, orgId: string) {
  const { db } = getFirebase();
  await updateDoc(doc(db, "users", uid), { lastActiveOrgId: orgId, updatedAt: serverTimestamp() });
}

// ---------- Organizations & membership ----------

/**
 * Finds every org the given uid belongs to, by querying the
 * collection-group of members. Returns [] if none — this is the
 * normal "brand new user" case and callers should route to
 * company setup, not treat it as an error.
 */
export async function getMembershipsForUser(uid: string): Promise<OrgMember[]> {
  const { db } = getFirebase();
  const { collectionGroup } = await import("firebase/firestore");
  const membersQuery = query(collectionGroup(db, "members"), where("uid", "==", uid), where("status", "==", "active"));
  const snap = await getDocs(membersQuery);
  return snap.docs.map((d) => d.data() as OrgMember);
}

export async function getOrganization(orgId: string): Promise<Organization | null> {
  const { db } = getFirebase();
  const snap = await getDoc(doc(db, "organizations", orgId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Organization) : null;
}

export async function getOrgMember(orgId: string, uid: string): Promise<OrgMember | null> {
  const { db } = getFirebase();
  const snap = await getDoc(doc(db, "organizations", orgId, "members", uid));
  return snap.exists() ? (snap.data() as OrgMember) : null;
}

export interface CreateOrganizationInput {
  name: string;
  country: string;
  currency: string;
  timezone: string;
}

/**
 * Creates a brand-new organization with the calling user as Owner.
 * Runs as a transaction so the org doc and the first member doc
 * are created atomically — we never want an org with zero members.
 */
export async function createOrganization(
  uid: string,
  user: { email: string; displayName: string },
  input: CreateOrganizationInput
): Promise<string> {
  const { db } = getFirebase();
  const orgRef = doc(collection(db, "organizations"));

  await runTransaction(db, async (tx) => {
    tx.set(orgRef, {
      name: input.name,
      country: input.country,
      currency: input.currency,
      timezone: input.timezone,
      ownerUid: uid,
      memberCount: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    const memberRef = doc(db, "organizations", orgRef.id, "members", uid);
    tx.set(memberRef, {
      uid,
      orgId: orgRef.id,
      role: "owner" as OrgRole,
      email: user.email,
      displayName: user.displayName,
      invitedBy: null,
      joinedAt: serverTimestamp(),
      status: "active",
    });
  });

  await setLastActiveOrg(uid, orgRef.id);
  return orgRef.id;
}

export async function inviteMember(
  orgId: string,
  invitedBy: string,
  member: { uid: string; email: string; displayName: string; role: OrgRole }
) {
  const { db } = getFirebase();
  const memberRef = doc(db, "organizations", orgId, "members", member.uid);
  await runTransaction(db, async (tx) => {
    const existing = await tx.get(memberRef);
    tx.set(memberRef, {
      uid: member.uid,
      orgId,
      role: member.role,
      email: member.email,
      displayName: member.displayName,
      invitedBy,
      joinedAt: serverTimestamp(),
      status: "active",
    });
    if (!existing.exists()) {
      tx.update(doc(db, "organizations", orgId), {
        memberCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    }
  });
}

export async function listOrgMembers(orgId: string): Promise<OrgMember[]> {
  const { db } = getFirebase();
  const snap = await getDocs(collection(db, "organizations", orgId, "members"));
  return snap.docs.map((d) => d.data() as OrgMember);
}
