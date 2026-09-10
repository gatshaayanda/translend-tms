'use client'

import { ReactNode, useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth'
import { translendAuth } from '@/lib/translend/firebase/client'
import { acceptTranslendInvitation, getPendingTranslendInvitation, getTranslendWorkspaceForUser, TranslendInvitation } from '@/lib/translend/workspace'
import TranslendCompanySetup from './translend-company-setup'

type GateState = 'checking' | 'setup' | 'invite' | 'workspace' | 'error'

export default function TranslendAuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [state, setState] = useState<GateState>('checking')
  const [invitation, setInvitation] = useState<TranslendInvitation | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let settled = false
    const timeoutId = window.setTimeout(() => {
      if (settled) return
      const message = 'Firebase authentication did not finish initializing. Check the browser console for the Firebase initialization error.'
      console.error('[Translend workspace trace] auth state timeout', { message })
      setError(message)
      setState('error')
    }, 15000)

    let unsubscribe: (() => void) | undefined
    try {
      unsubscribe = onAuthStateChanged(translendAuth, async (nextUser) => {
        settled = true
        window.clearTimeout(timeoutId)
        setUser(nextUser)
        setError('')
        if (!nextUser) { setInvitation(null); setState('checking'); return }
        setState('checking')
        console.info('[Translend workspace trace] Firebase user', { uid: nextUser.uid, email: nextUser.email })
        try {
          const workspace = await getTranslendWorkspaceForUser(nextUser.uid)
          console.info('[Translend workspace trace] workspace lookup result', { uid: nextUser.uid, organizationId: workspace?.organization.id || null, role: workspace?.membership.role || null })
          window.localStorage.removeItem('translend-demo-mode')
          window.localStorage.removeItem('translend-workspace-data')
          if (workspace) { setState('workspace'); return }
          const pending = await getPendingTranslendInvitation(nextUser.email || '')
          if (pending) { setInvitation(pending); setState('invite'); return }
          setState('setup')
        } catch (nextError) {
          const message = nextError instanceof Error ? nextError.message : 'We could not load your Translend workspace.'
          console.error('[Translend workspace trace] auth gate workspace lookup failed', { uid: nextUser.uid, error: nextError })
          setError(message)
          setState('error')
        }
      })
    } catch (nextError) {
      settled = true
      window.clearTimeout(timeoutId)
      const message = nextError instanceof Error ? nextError.message : 'Firebase authentication could not initialize.'
      console.error('[Translend workspace trace] auth initialization failed', { error: nextError })
      setError(message)
      setState('error')
    }

    return () => {
      settled = true
      window.clearTimeout(timeoutId)
      unsubscribe?.()
    }
  }, [])

  async function signIn() {
    setBusy(true); setError('')
    try {
      const credential = await signInWithPopup(translendAuth, new GoogleAuthProvider())
      const idToken = await credential.user.getIdToken()
      const response = await fetch('/api/translend/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) })
      if (!response.ok) throw new Error('Translend server verification failed.')
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'Google sign-in failed.') }
    finally { setBusy(false) }
  }

  async function acceptInvite() {
    if (!user || !invitation) return
    setBusy(true); setError('')
    try { await acceptTranslendInvitation({ invitation, user }); setInvitation(null); setState('workspace') }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : 'We could not accept the invitation.') }
    finally { setBusy(false) }
  }

  async function leave() { await signOut(translendAuth); window.localStorage.removeItem('translend-demo-mode'); window.localStorage.removeItem('translend-workspace-data') }

  if (state === 'checking') return <main style={centerStyle}><div style={cardStyle}><strong>Loading Translend…</strong><span>Checking your company workspace.</span></div></main>
  if (user && state === 'setup') return <TranslendCompanySetup user={user} onCreated={() => setState('workspace')} />
  if (user && state === 'invite' && invitation) return <main style={centerStyle}><section style={cardStyle}><div style={logoStyle}>T</div><span style={eyebrowStyle}>COMPANY INVITATION</span><h1 style={{ margin: '8px 0 6px', fontSize: 30, letterSpacing: '-.04em' }}>Join {invitation.organizationId}.</h1><p style={{ margin: 0, color: '#607278', lineHeight: 1.6 }}>You have been invited to join an existing Translend company workspace as <strong>{invitation.role.replace('_', ' ')}</strong>.</p><button onClick={acceptInvite} disabled={busy} style={primaryStyle}>{busy ? 'Joining workspace…' : 'Accept invitation'}</button><button onClick={leave} disabled={busy} style={secondaryStyle}>Sign out</button>{error && <div style={errorStyle}>{error}</div>}<small style={{ display: 'block', marginTop: 16, color: '#91a0a5', lineHeight: 1.5 }}>This invitation is tied to your Google email address and organization ID. Company name matching is not used.</small></section></main>
  if (user && state === 'error') return <main style={centerStyle}><section style={cardStyle}><div style={logoStyle}>T</div><span style={eyebrowStyle}>WORKSPACE LOAD FAILED</span><h1 style={{ margin: '8px 0 6px', fontSize: 30, letterSpacing: '-.04em' }}>We could not open your company workspace.</h1><p style={{ margin: 0, color: '#607278', lineHeight: 1.6 }}>Firebase authentication succeeded, but the workspace lookup failed. The error is being shown instead of falling back to an empty workspace.</p><div style={errorStyle}>{error}</div><button onClick={() => window.location.reload()} style={primaryStyle}>Retry workspace load</button><button onClick={leave} style={secondaryStyle}>Sign out</button></section></main>
  if (!user) return <main style={centerStyle}><section style={cardStyle}><div style={logoStyle}>T</div><span style={eyebrowStyle}>TRANSLEND TMS · TRUCK DIVISION</span><h1 style={{ margin: '8px 0 6px', fontSize: 30, letterSpacing: '-.04em' }}>Your transport desk starts here.</h1><p style={{ margin: 0, color: '#607278', lineHeight: 1.6 }}>Sign in with Google to create or open your private company workspace.</p><button onClick={signIn} disabled={busy} style={primaryStyle}>{busy ? 'Signing in…' : 'Continue with Google'}</button>{error && <div style={errorStyle}>{error}</div>}<small style={{ display: 'block', marginTop: 16, color: '#91a0a5', lineHeight: 1.5 }}>Each company gets its own private workspace. Your operational data is not shared with other companies.</small></section></main>
  return <>{children}</>
}
export function TranslendSessionBadge() { return <span style={{ fontSize: 10, fontWeight: 800, color: '#167d69', background: '#d9f0ea', padding: '5px 8px', borderRadius: 7 }}>SIGNED IN</span> }
const centerStyle = { minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#eef2f4', padding: 20, fontFamily: 'Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif' } as const
const cardStyle = { width: 'min(100%, 520px)', background: '#fff', border: '1px solid #e3e8ec', borderRadius: 18, padding: 30, boxShadow: '0 18px 55px rgba(14,42,48,.10)' } as const
const logoStyle = { width: 48, height: 48, borderRadius: 13, display: 'grid', placeItems: 'center', background: '#0c6c7d', color: '#fff', fontSize: 25, fontWeight: 900 } as const
const eyebrowStyle = { display: 'block', marginTop: 20, color: '#0c6c7d', fontSize: 10, fontWeight: 900, letterSpacing: '.13em' } as const
const primaryStyle = { width: '100%', marginTop: 24, padding: '12px 14px', border: '1px solid #0c6c7d', borderRadius: 9, background: '#0c6c7d', color: '#fff', fontWeight: 850, cursor: 'pointer' } as const
const secondaryStyle = { width: '100%', marginTop: 10, padding: '11px 14px', border: '1px solid #d8e0e4', borderRadius: 9, background: '#fff', color: '#324a50', fontWeight: 800, cursor: 'pointer' } as const
const errorStyle = { marginTop: 14, padding: 11, borderRadius: 8, background: '#fde8e8', color: '#9f3030', fontSize: 12, lineHeight: 1.5, overflowWrap: 'anywhere' } as const
