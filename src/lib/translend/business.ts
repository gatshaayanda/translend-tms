import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore'
import { translendFirestore } from '@/lib/translend/firebase/client'

export type BusinessCollection = 'trucks' | 'drivers'
export type BusinessField = { key: string; label: string; required?: boolean; type?: 'text' | 'number' | 'date' | 'select'; options?: string[] }

export const BUSINESS_CONFIG: Record<BusinessCollection, { title: string; description: string; fields: BusinessField[] }> = {
  trucks: {
    title: 'Trucks',
    description: 'Manage the company vehicles that can be assigned to operational trips.',
    fields: [
      { key: 'unit', label: 'Unit', required: true },
      { key: 'registration', label: 'Registration', required: true },
      { key: 'type', label: 'Type', required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'maintenance', 'inactive'] },
      { key: 'odometer', label: 'Odometer', type: 'number' },
      { key: 'nextService', label: 'Next service', type: 'date' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  drivers: {
    title: 'Drivers',
    description: 'Manage drivers available for dispatch and operational assignment.',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'license', label: 'License', required: true },
      { key: 'licenseExpiry', label: 'License expiry', type: 'date' },
      { key: 'status', label: 'Status', type: 'select', options: ['active', 'off-duty', 'inactive'] },
      { key: 'notes', label: 'Notes' },
    ],
  },
}

export type BusinessRecord = Record<string, string | number | null> & { id: string; createdAt?: unknown; updatedAt?: unknown; createdBy?: string }

function recordsRef(organizationId: string, collectionName: BusinessCollection) {
  return collection(translendFirestore, 'organizations', organizationId, collectionName)
}

export async function getBusinessRecords(organizationId: string, collectionName: BusinessCollection) {
  const snapshot = await getDocs(query(recordsRef(organizationId, collectionName), orderBy('createdAt', 'desc')))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as BusinessRecord[]
}

export async function createBusinessRecord(organizationId: string, collectionName: BusinessCollection, userId: string, values: Record<string, string | number | null>) {
  const now = serverTimestamp()
  const reference = await addDoc(recordsRef(organizationId, collectionName), { ...values, createdBy: userId, createdAt: now, updatedAt: now })
  return reference.id
}

export async function updateBusinessRecord(organizationId: string, collectionName: BusinessCollection, id: string, values: Record<string, string | number | null>) {
  await updateDoc(doc(translendFirestore, 'organizations', organizationId, collectionName, id), { ...values, updatedAt: serverTimestamp() })
}

export async function deleteBusinessRecord(organizationId: string, collectionName: BusinessCollection, id: string) {
  await deleteDoc(doc(translendFirestore, 'organizations', organizationId, collectionName, id))
}
