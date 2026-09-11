// =============================================================
// Generic org-scoped Firestore repository
// =============================================================
// Every business collection (customers, trucks, drivers, jobs,
// trips, deliveries, ...) lives at:
//   /organizations/{orgId}/{collectionName}/{docId}
//
// This factory returns a typed CRUD + query surface for one such
// collection, so individual modules (customers.ts, trucks.ts, ...)
// are thin and consistent. It bakes in:
//   - orgId scoping (impossible to accidentally cross-query orgs)
//   - environment (LIVE/DEMO/SEED/FIXTURE) filtering
//   - soft delete (deletedAt) exclusion by default
//   - audit fields (createdAt/By, updatedAt/By)

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as fsLimit,
  onSnapshot,
  serverTimestamp,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { getFirebase } from "./client";
import type { BaseRecord, RecordEnvironment } from "@/types/core";

export interface ListOptions {
  environment?: RecordEnvironment | RecordEnvironment[];
  includeDeleted?: boolean;
  orderByField?: string;
  orderDirection?: "asc" | "desc";
  limitTo?: number;
  extra?: QueryConstraint[];
}

export function createRepository<T extends BaseRecord>(collectionName: string) {
  function collRef(orgId: string) {
    const { db } = getFirebase();
    return collection(db, "organizations", orgId, collectionName);
  }

  function buildQuery(orgId: string, opts: ListOptions = {}) {
    const constraints: QueryConstraint[] = [];

    if (opts.environment) {
      const envs = Array.isArray(opts.environment) ? opts.environment : [opts.environment];
      constraints.push(where("environment", "in", envs));
    }
    if (!opts.includeDeleted) {
      constraints.push(where("deletedAt", "==", null));
    }
    if (opts.orderByField) {
      constraints.push(orderBy(opts.orderByField, opts.orderDirection ?? "asc"));
    }
    if (opts.limitTo) {
      constraints.push(fsLimit(opts.limitTo));
    }
    if (opts.extra) {
      constraints.push(...opts.extra);
    }
    return query(collRef(orgId), ...constraints);
  }

  async function list(orgId: string, opts: ListOptions = {}): Promise<T[]> {
    const snap = await getDocs(buildQuery(orgId, opts));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T);
  }

  /** Live subscription — preferred for list pages so the UI reflects
   * dispatch/status changes made by other users in real time. */
  function subscribe(orgId: string, opts: ListOptions, onData: (items: T[]) => void, onError?: (err: Error) => void): Unsubscribe {
    return onSnapshot(
      buildQuery(orgId, opts),
      (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)),
      (err) => onError?.(err)
    );
  }

  async function getById(orgId: string, id: string): Promise<T | null> {
    const snap = await getDoc(doc(collRef(orgId), id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null;
  }

  async function create(
    orgId: string,
    uid: string,
    data: Omit<T, keyof BaseRecord>,
    environment: RecordEnvironment = "LIVE"
  ): Promise<string> {
    const ref = await addDoc(collRef(orgId), {
      ...data,
      orgId,
      environment,
      createdAt: serverTimestamp(),
      createdBy: uid,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
      deletedAt: null,
    });
    return ref.id;
  }

  async function update(orgId: string, uid: string, id: string, data: Partial<Omit<T, keyof BaseRecord>>) {
    await updateDoc(doc(collRef(orgId), id), {
      ...data,
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
  }

  /** Soft delete — see BaseRecord.deletedAt. Never physically
   * removes operational records. */
  async function softDelete(orgId: string, uid: string, id: string) {
    await updateDoc(doc(collRef(orgId), id), {
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    });
  }

  return { list, subscribe, getById, create, update, softDelete, collRef, buildQuery };
}
