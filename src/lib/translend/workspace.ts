import { collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore'
import { translendFirestore } from '@/lib/translend/firebase/client'

export type TranslendRole = 'owner' | 'operations_manager' | 'dispatcher' | 'fleet_manager' | 'finance' | 'driver' | 'viewer'
export type TranslendOrganization = { id: string; name: string; country?: string; currency?: string; timezone?: string; ownerId: string }
export type TranslendUserProfile = { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null; organizationId?: string | null; role?: TranslendRole | null }
export type TranslendInvitation = { id: string; email: string; organizationId: string; role: TranslendRole; invitedBy: string; status?: 'pending' | 'accepted'; createdAt?: unknown; updatedAt?: unknown }

export async function getTranslendUserProfile(uid: string) { const snapshot = await getDoc(doc(translendFirestore, 'users', uid)); return snapshot.exists() ? snapshot.data() as TranslendUserProfile : null }
export async function getTranslendWorkspaceForUser(uid: string) { const profile = await getTranslendUserProfile(uid); if (!profile?.organizationId) return null; const organizationId = profile.organizationId; const [organizationSnapshot, membershipSnapshot] = await Promise.all([getDoc(doc(translendFirestore, 'organizations', organizationId)), getDoc(doc(translendFirestore, 'organizations', organizationId, 'members', uid))]); if (!organizationSnapshot.exists() || !membershipSnapshot.exists()) return null; const organization = { id: organizationSnapshot.id, ...organizationSnapshot.data() } as TranslendOrganization; return { organization, profile, membership: membershipSnapshot.data() as { role?: TranslendRole } } }

export type TranslendWorkspaceDiagnostics = {
  uid: string
  userProfile: { exists: boolean; organizationId: string | null; role: TranslendRole | null; email: string | null } | null
  organization: { path: string; exists: boolean; name: string | null; ownerId: string | null } | null
  membership: { path: string; exists: boolean; role: TranslendRole | null; email: string | null } | null
  error: { stage: 'user-profile' | 'organization' | 'membership'; path: string; code: string | null; message: string } | null
}

function readError(error: unknown) { const value = error as { code?: string; message?: string }; return { code: value?.code || null, message: value?.message || 'Unknown Firestore error.' } }

export async function getTranslendWorkspaceDiagnostics(uid: string): Promise<TranslendWorkspaceDiagnostics> {
  const userPath = `users/${uid}`
  let profileSnapshot
  try { profileSnapshot = await getDoc(doc(translendFirestore, 'users', uid)) } catch (error) { const detail = readError(error); return { uid, userProfile: null, organization: null, membership: null, error: { stage: 'user-profile', path: userPath, ...detail } } }
  if (!profileSnapshot.exists()) return { uid, userProfile: { exists: false, organizationId: null, role: null, email: null }, organization: null, membership: null, error: null }

  const profile = profileSnapshot.data() as TranslendUserProfile
  const organizationId = profile.organizationId || null
  const userProfile = { exists: true, organizationId, role: profile.role || null, email: profile.email || null }
  if (!organizationId) return { uid, userProfile, organization: null, membership: null, error: null }

  const organizationPath = `organizations/${organizationId}`
  let organizationSnapshot
  try { organizationSnapshot = await getDoc(doc(translendFirestore, 'organizations', organizationId)) } catch (error) { const detail = readError(error); return { uid, userProfile, organization: { path: organizationPath, exists: false, name: null, ownerId: null }, membership: null, error: { stage: 'organization', path: organizationPath, ...detail } } }
  const organization = organizationSnapshot.exists() ? organizationSnapshot.data() as { name?: string; ownerId?: string } : null
  if (!organizationSnapshot.exists()) return { uid, userProfile, organization: { path: organizationPath, exists: false, name: null, ownerId: null }, membership: null, error: null }

  const membershipPath = `organizations/${organizationId}/members/${uid}`
  let membershipSnapshot
  try { membershipSnapshot = await getDoc(doc(translendFirestore, 'organizations', organizationId, 'members', uid)) } catch (error) { const detail = readError(error); return { uid, userProfile, organization: { path: organizationPath, exists: true, name: organization.name || null, ownerId: organization.ownerId || null }, membership: { path: membershipPath, exists: false, role: null, email: null }, error: { stage: 'membership', path: membershipPath, ...detail } } }
  const membership = membershipSnapshot.exists() ? membershipSnapshot.data() as { role?: TranslendRole; email?: string } : null
  return { uid, userProfile, organization: { path: organizationPath, exists: true, name: organization.name || null, ownerId: organization.ownerId || null }, membership: { path: membershipPath, exists: membershipSnapshot.exists(), role: membership?.role || null, email: membership?.email || null }, error: null }
}

export async function getPendingTranslendInvitation(email: string) { const normalized = email.trim().toLowerCase(); if (!normalized) return null; const snapshot = await getDocs(query(collection(translendFirestore, 'invitations'), where('email', '==', normalized), where('status', '==', 'pending'))); const first = snapshot.docs[0]; return first ? ({ id: first.id, ...first.data() } as TranslendInvitation) : null }
export async function acceptTranslendInvitation(input: { invitation: TranslendInvitation; user: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null } }) { const { invitation, user } = input; if (user.email?.trim().toLowerCase() !== invitation.email.toLowerCase()) throw new Error('This invitation was issued to a different email address.'); const memberRef = doc(translendFirestore, 'organizations', invitation.organizationId, 'members', user.uid); const userRef = doc(translendFirestore, 'users', user.uid); const now = serverTimestamp(); await setDoc(memberRef, { uid: user.uid, role: invitation.role, invitationId: invitation.id, displayName: user.displayName ?? '', email: user.email ?? invitation.email, createdAt: now, updatedAt: now }); await setDoc(userRef, { uid: user.uid, displayName: user.displayName ?? '', email: user.email ?? invitation.email, photoURL: user.photoURL ?? '', organizationId: invitation.organizationId, role: invitation.role, updatedAt: now }, { merge: true }); await deleteDoc(doc(translendFirestore, 'invitations', invitation.id)); return invitation.organizationId }
export async function createTranslendWorkspace(input: { user: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null }; companyName: string; country?: string; currency?: string; timezone?: string }) { const { user, companyName, country, currency, timezone } = input; const existing = await getTranslendUserProfile(user.uid); if (existing?.organizationId) throw new Error('This Google account is already associated with a Translend organization.'); const organizationRef = doc(translendFirestore, 'organizations', crypto.randomUUID()); const userRef = doc(translendFirestore, 'users', user.uid); const memberRef = doc(translendFirestore, 'organizations', organizationRef.id, 'members', user.uid); const now = serverTimestamp(); await setDoc(organizationRef, { name: companyName.trim(), ownerId: user.uid, country: country?.trim() || '', currency: currency?.trim() || '', timezone: timezone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone, createdAt: now, updatedAt: now }); await setDoc(memberRef, { uid: user.uid, role: 'owner' satisfies TranslendRole, displayName: user.displayName ?? '', email: user.email ?? '', createdAt: now, updatedAt: now }); await setDoc(userRef, { uid: user.uid, displayName: user.displayName ?? '', email: user.email ?? '', photoURL: user.photoURL ?? '', organizationId: organizationRef.id, role: 'owner' satisfies TranslendRole, createdAt: now, updatedAt: now }, { merge: true }); return organizationRef.id }
