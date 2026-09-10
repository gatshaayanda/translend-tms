'use client'

import { ReactNode, useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth'
import { translendAuth } from '@/lib/translend/firebase/client'
import { getTranslendWorkspaceForUser } from '@/lib/translend/workspace'
import TranslendCompanySetup from './translend-company-setup'

export default function TranslendAuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => onAuthStateChanged(translendAuth, async (nextUser) => {
    setUser(nextUser)
    setError('')
    if (!nextUser) {
      setNeedsSetup(false)
      setChecking(false)
      return
    }
    setChecking(true)
    try {
      const workspace = await getTranslendWorkspaceForUser(nextUser.uid)
      window.localStorage.removeItem('translend-demo-mode')
      window.localStorage.removeItem('translend-workspace-data')
      setNeedsSetup(!workspace)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'We could not load your Translend workspace.')
      setNeedsSetup(false)
    } finally {
      setChecking(false)
    }
  }), [])

  async function signIn() {
    setBusy(true)
    setError('')
    try {
      const credential = await signInWithPopup(translendAuth, new GoogleAuthProvider())
      const idToken = await credential.user.getIdToken()
      const response = await fetch('/api/translend/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      if (!response.ok) throw new Error('Translend server verification failed.')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Google sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  async function leave() {
    await signOut(translendAuth)
    window.localStorage.removeItem('translend-demo-mode')
    window.localStorage.removeItem('translend-workspace-data')
  }

  if (checking) return <main style={centerStyle}><div style={cardStyle}><strong>Loading Translend…</strong><span>Checking your company workspace.</span></div></main>
  if (user && needsSetup) return <TranslendCompanySetup user={user} onCreated={() => setNeedsSetup(false)} />
  if (user) return <>{children}</>

  return (
    <main style={centerStyle}>
      <section style={cardStyle}>
        <div style={logoStyle}>T</div>
        <span style={eyebrowStyle}>TRANSLEND TMS · TRUCK DIVISION</span>
        <h1 style={{ margin: '8px 0 6px', fontSize: 30, letterSpacing: '-.04em' }}>Your transport desk starts here.</h1>
        <p style={{ margin: 0, color: '#607278', lineHeight: 1.6 }}>Sign in with Google to create or open your private company workspace.</p>
        <button onClick={signIn} disabled={busy} style={primaryStyle}>{busy ? 'Signing in…' : 'Continue with Google'}</button>
        {error && <div style={errorStyle}>{error}</div>}
        <small style={{ display: 'block', marginTop: 16, color: '#91a0a5', lineHeight: 1.5 }}>Each company gets its own private workspace. Your operational data is not shared with other companies.</small>
      </section>
    </main>
  )
}

export function TranslendSessionBadge() {
  return <span style={{ fontSize: 10, fontWeight: 800, color: '#167d69', background: '#d9f0ea', padding: '5px 8px', borderRadius: 7 }}>SIGNED IN</span>
}

const centerStyle = { minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#eef2f4', padding: 20, fontFamily: 'Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif' } as const
const cardStyle = { width: 'min(100%, 520px)', background: '#fff', border: '1px solid #e3e8ec', borderRadius: 18, padding: 30, boxShadow: '0 18px 55px rgba(14,42,48,.10)' } as const
const logoStyle = { width: 48, height: 48, borderRadius: 13, display: 'grid', placeItems: 'center', background: '#0c6c7d', color: '#fff', fontSize: 25, fontWeight: 900 } as const
const eyebrowStyle = { display: 'block', marginTop: 20, color: '#0c6c7d', fontSize: 10, fontWeight: 900, letterSpacing: '.13em' } as const
const primaryStyle = { width: '100%', marginTop: 24, padding: '12px 14px', border: '1px solid #0c6c7d', borderRadius: 9, background: '#0c6c7d', color: '#fff', fontWeight: 850, cursor: 'pointer' } as const
const errorStyle = { marginTop: 14, padding: 11, borderRadius: 8, background: '#fde8e8', color: '#9f3030', fontSize: 12, lineHeight: 1.5 } as const
