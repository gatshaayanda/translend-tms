import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { translendFirestore } from '@/lib/translend/firebase/client'

export type TranslendCustomerStatus = 'active' | 'inactive'

export type TranslendCustomer = {
  id: string
  name: string
  contactName: string
  phone: string
  email: string
  paymentTerms: string
  status: TranslendCustomerStatus
  notes: string
  createdAt?: unknown
  updatedAt?: unknown
  createdBy: string
}

function customersCollection(organizationId: string) {
  return collection(translendFirestore, 'organizations', organizationId, 'customers')
}

export async function getCustomers(organizationId: string): Promise<TranslendCustomer[]> {
  const snapshot = await getDocs(customersCollection(organizationId))
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as TranslendCustomer)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getCustomer(organizationId: string, customerId: string): Promise<TranslendCustomer | null> {
  const snapshot = await getDoc(doc(translendFirestore, 'organizations', organizationId, 'customers', customerId))
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as TranslendCustomer) : null
}

export async function createCustomer(input: {
  organizationId: string
  createdBy: string
  name: string
  contactName?: string
  phone?: string
  email?: string
  paymentTerms?: string
  status?: TranslendCustomerStatus
  notes?: string
}) {
  const name = input.name.trim()
  if (!name) throw new Error('Customer name is required.')

  const reference = await addDoc(customersCollection(input.organizationId), {
    name,
    contactName: input.contactName?.trim() || '',
    phone: input.phone?.trim() || '',
    email: input.email?.trim() || '',
    paymentTerms: input.paymentTerms?.trim() || '',
    status: input.status ?? 'active',
    notes: input.notes?.trim() || '',
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return reference.id
}

export async function updateCustomer(input: {
  organizationId: string
  customerId: string
  name: string
  contactName?: string
  phone?: string
  email?: string
  paymentTerms?: string
  status: TranslendCustomerStatus
  notes?: string
}) {
  const name = input.name.trim()
  if (!name) throw new Error('Customer name is required.')

  await updateDoc(doc(translendFirestore, 'organizations', input.organizationId, 'customers', input.customerId), {
    name,
    contactName: input.contactName?.trim() || '',
    phone: input.phone?.trim() || '',
    email: input.email?.trim() || '',
    paymentTerms: input.paymentTerms?.trim() || '',
    status: input.status,
    notes: input.notes?.trim() || '',
    updatedAt: serverTimestamp(),
  })
}

export async function deleteCustomer(organizationId: string, customerId: string) {
  await deleteDoc(doc(translendFirestore, 'organizations', organizationId, 'customers', customerId))
}
