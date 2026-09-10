'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import styles from './translend-shell.module.css'
import { translendFirestore } from '@/lib/translend/firebase/client'
import { TranslendOrganization, TranslendRole } from '@/lib/translend/workspace'

type MemberRow = { id: string; displayName?: string; email?: string; uid?: string; role?: TranslendRole }
const roles: TranslendRole[] = ['owner', 'operations_manager', 'dispatcher', 'fleet_manager', 'finance', 'driver', 'viewer']

export default function TranslendAdmin({ organization, userId }: { organization: TranslendOrganization; userId: string }) {
  const [company, setCompany] = useState({ name: organization.name, country: organization.country || '', currency: organization.currency || '', timezone: organization.timezone || '' })
  const [members, setMembers] = useState<MemberRow[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<TranslendRole>('viewer')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const snapshot = await getDocs(collection(translendFirestore, 'organizations', organization.id, 'members'))
      setMembers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as MemberRow[])
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to load organization members.') }
    finally { setLoading(false) }
  }, [organization.id])

  useEffect(() => { void load() }, [load])

  async function saveCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('')
    try { await updateDoc(doc(translendFirestore, 'organizations', organization.id), { ...company, updatedAt: serverTimestamp() }); setMessage('Company settings saved.') }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to save company settings.') }
  }

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setMessage('')
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    if (members.some((member) => member.email?.trim().toLowerCase() === email)) { setError('That email is already a member of this workspace.'); return }
    setInviting(true)
    try {
      await addDoc(collection(translendFirestore, 'invitations'), { email, organizationId: organization.id, role: inviteRole, invitedBy: userId, status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      setInviteEmail(''); setMessage(`Invitation prepared for ${email}. Ask the employee to sign in with that exact Google email; Translend will place them in this organization.`)
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to create the invitation.') }
    finally { setInviting(false) }
  }

  async function changeRole(id: string, role: TranslendRole) {
    setError(''); setMessage('')
    try { await updateDoc(doc(translendFirestore, 'organizations', organization.id, 'members', id), { role, updatedAt: serverTimestamp() }); setMessage('Member role updated.'); await load() }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Unable to update member role.') }
  }

  return <section className={styles.panel}>
    <div className={styles.panelHeader}><div><span className={styles.panelEyebrow}>Administration</span><h2>Company & access</h2><p style={{ marginTop: 5, color: '#718188', fontSize: 11 }}>The organization ID is the workspace identity. Company name changes never create another workspace.</p></div></div>
    <form onSubmit={saveCompany} style={{ padding: 18, display: 'grid', gap: 12 }}><h3 style={{ margin: 0 }}>Company profile</h3>{(['name', 'country', 'currency', 'timezone'] as const).map((key) => <label key={key} style={{ display: 'grid', gap: 5, fontSize: 11 }}>{key}<input value={company[key]} onChange={(event) => setCompany({ ...company, [key]: event.target.value })} /></label>)}<button className={styles.primaryButton} type="submit" style={{ justifySelf: 'start' }}>Save company</button></form>
    <form onSubmit={invite} style={{ padding: 18, borderTop: '1px solid #edf2f3', display: 'grid', gap: 10 }}><h3 style={{ margin: 0 }}>Invite a team member</h3><p style={{ margin: 0, color: '#718188', fontSize: 11 }}>The invitation is tied to an email address and this organization ID. It never creates an organization from a company name.</p><div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 180px auto', gap: 9 }}><input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="employee@company.com"/><select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as TranslendRole)}>{roles.filter((role) => role !== 'owner').map((role) => <option key={role} value={role}>{role}</option>)}</select><button className={styles.primaryButton} disabled={inviting}>{inviting ? 'Preparing…' : 'Invite'}</button></div></form>
    <div style={{ padding: 18, borderTop: '1px solid #edf2f3' }}><h3>Members & roles</h3>{loading ? <p>Loading members…</p> : members.length === 0 ? <p style={{ color: '#718188' }}>No members have been added to this workspace yet.</p> : members.map((member) => <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid #edf2f3', fontSize: 12 }}><span><strong>{member.displayName || member.email || member.uid}</strong><small style={{ display: 'block', color: '#718188' }}>{member.email || ''}</small></span><select value={member.role || 'viewer'} disabled={member.id === userId && member.role === 'owner'} onChange={(event) => void changeRole(member.id, event.target.value as TranslendRole)}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></div>)}</div>
    {error && <div style={{ margin: '0 18px 18px', padding: 11, borderRadius: 8, background: '#fff1f1', color: '#9b3030', fontSize: 12 }}>{error}</div>}
    {message && <div style={{ margin: '0 18px 18px', padding: 11, borderRadius: 8, background: '#edf8f5', color: '#167d69', fontSize: 12 }}>{message}</div>}
  </section>
}
