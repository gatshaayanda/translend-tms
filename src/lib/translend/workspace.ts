import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, where, query } from 'firebase/firestore'
import { translendFirestore } from '@/lib/translend/firebase/client'

export type TranslendRole = 'owner' | 'operations_manager' | 'dispatcher' | 'fleet_manager' | 'finance' | 'driver' | 'viewer'
export type TranslendOrganization = { id: string; name: string; country?: string; currency?: string; timezone?: string; ownerId: string }
export type TranslendUserProfile = { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null; organizationId?: string | null; role?: TranslendRole | null }
export type TranslendInvitation = { id: string; email: string; organizationId: string; role: TranslendRole; invitedBy: string; createdAt?: unknown; updatedAt?: unknown }

export async function getTranslendUserProfile(uid: string) {
  const snapshot = await getDoc(doc(translendFirestore, 'users', uid))
  return snapshot.exists() ? snapshot.data() as TranslendUserProfile : null
}

export async function getTranslendWorkspaceForUser(uid: string) {
  const profile = await getTranslendUserProfile(uid)
  if (!profile?.organizationId) return null
  const organizationId = profile.organizationId
  const [organizationSnapshot, membershipSnapshot] = await Promise.all([
    getDoc(doc(translendFirestore, 'organizations', organizationId)),
    getDoc(doc(translendFirestore, 'organizations', organizationId, 'members', uid)),
  ])
  if (!organizationSnapshot.exists() || !membershipSnapshot.exists()) return null
  const organization = { id: organizationSnapshot.id, ...organizationSnapshot.data() } as TranslendOrganization
  return { organization, profile, membership: membershipSnapshot.data() as { role?: TranslendRole } }
}

export async function getPendingTranslendInvitation(email: string) {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  const snapshot = await getDocs(query(collection(translendFirestore, 'invitations'), where('email', '==', normalized), where('status', '==', 'pending')))
  const first = snapshot.docs[0]
  return first ? ({ id: first.id, ...first.data() } as TranslendInvitation) : null
}

export async function acceptTranslendInvitation(input: { invitation: TranslendInvitation; user: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null } }) {
  const { invitation, user } = input
  if (user.email?.trim().toLowerCase() !== invitation.email.toLowerCase()) throw new Error('This invitation was issued to a different email address.')
  const memberRef = doc(translendFirestore, 'organizations', invitation.organizationId, 'members', user.uid)
  const userRef = doc(translendFirestore, 'users', user.uid)
  const now = serverTimestamp()
  await setDoc(memberRef, { uid: user.uid, role: invitation.role, displayName: user.displayName ?? '', email: user.email ?? invitation.email, createdAt: now, updatedAt: now })
  await setDoc(userRef, { uid: user.uid, displayName: user.displayName ?? '', email: user.email ?? invitation.email, photoURL: user.photoURL ?? '', organizationId: invitation.organizationId, role: invitation.role, updatedAt: now }, { merge: true })
  await deleteDoc(doc(translendFirestore, 'invitations', invitation.id))
  return invitation.organizationId
}

export async function createTranslendWorkspace(input: { user: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null }; companyName: string; country?: string; currency?: string; timezone?: string }) {
  const { user, companyName, country, currency, timezone } = input
  const organizationRef = doc(translendFirestore, 'organizations', crypto.randomUUID())
  const userRef = doc(translendFirestore, 'users', user.uid)
  const memberRef = doc(translendFirestore, 'organizations', organizationRef.id, 'members', user.uid)
  const now = serverTimestamp()
  await setDoc(organizationRef, { name: companyName.trim(), ownerId: user.uid, country: country?.trim() || '', currency: currency?.trim() || '', timezone: timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone, createdAt: now, updatedAt: now })
  await setDoc(memberRef, { uid: user.uid, role: 'owner' satisfies TranslendRole, displayName: user.displayName ?? '', email: user.email ?? '', createdAt: now, updatedAt: now })
  await setDoc(userRef, { uid: user.uid, displayName: user.displayName ?? '', email: user.email ?? '', photoURL: user.photoURL ?? '', organizationId: organizationRef.id, role: 'owner' satisfies TranslendRole, createdAt: now, updatedAt: now }, { merge: true })
  return organizationRef.id
}
