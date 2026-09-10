'use client'

import { ReactNode, useEffect, useState } from 'react'
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth'
import { translendAuth } from '@/lib/translend/firebase/client'

const demoKey = 'translend-demo-mode'

export default function TranslendAuthGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDemo(window.localStorage.getItem(demoKey) === 'true')
    return onAuthStateChanged(translendAuth, (nextUser) => {
      setUser(nextUser)
      setChecking(false)
    })
  }, [])

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
      window.localStorage.removeItem(demoKey)
      setDemo(false)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Google sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  function enterDemo() {
    window.localStorage.setItem(demoKey, 'true')
    setDemo(true)
    setError('')
  }

  async function leave() {
    await signOut(translendAuth)
    window.localStorage.removeItem(demoKey)
    setDemo(false)
  }

  if (checking) return <main style={centerStyle}><div style={cardStyle}><strong>Loading Translend…</strong><span>Checking your workspace.</span></div></main>
  if (user || demo) return <>{children}</>

  return (
    <main style={centerStyle}>
      <section style={cardStyle}>
        <div style={logoStyle}>T</div>
        <span style={eyebrowStyle}>TRANSLEND TMS · TRUCK DIVISION</span>
        <h1 style={{ margin: '8px 0 6px', fontSize: 30, letterSpacing: '-.04em' }}>Your transport desk starts here.</h1>
        <p style={{ margin: 0, color: '#607278', lineHeight: 1.6 }}>Sign in to open your Translend workspace. You can also explore the working MVP in clearly labelled demo mode.</p>
        <button onClick={signIn} disabled={busy} style={primaryStyle}>{busy ? 'Signing in…' : 'Continue with Google'}</button>
        <button onClick={enterDemo} style={secondaryStyle}>Open demo workspace</button>
        {error && <div style={errorStyle}>{error}</div>}
        <small style={{ display: 'block', marginTop: 16, color: '#91a0a5', lineHeight: 1.5 }}>Demo records are stored only in this browser. Signed-in workspaces currently use the same working MVP interface while the persistent business data layer is completed.</small>
      </section>
    </main>
  )
}

export function TranslendSessionBadge({ demo }: { demo?: boolean }) {
  return <span style={{ fontSize: 10, fontWeight: 800, color: demo ? '#d9550e' : '#167d69', background: demo ? '#feefe4' : '#d9f0ea', padding: '5px 8px', borderRadius: 7 }}>{demo ? 'DEMO WORKSPACE' : 'SIGNED IN'}</span>
}

const centerStyle = { minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#eef2f4', padding: 20, fontFamily: 'Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif' } as const
const cardStyle = { width: 'min(100%, 520px)', background: '#fff', border: '1px solid #e3e8ec', borderRadius: 18, padding: 30, boxShadow: '0 18px 55px rgba(14,42,48,.10)' } as const
const logoStyle = { width: 48, height: 48, borderRadius: 13, display: 'grid', placeItems: 'center', background: '#0c6c7d', color: '#fff', fontSize: 25, fontWeight: 900 } as const
const eyebrowStyle = { display: 'block', marginTop: 20, color: '#0c6c7d', fontSize: 10, fontWeight: 900, letterSpacing: '.13em' } as const
const primaryStyle = { width: '100%', marginTop: 24, padding: '12px 14px', border: '1px solid #0c6c7d', borderRadius: 9, background: '#0c6c7d', color: '#fff', fontWeight: 850, cursor: 'pointer' } as const
const secondaryStyle = { width: '100%', marginTop: 9, padding: '12px 14px', border: '1px solid #cdd6dc', borderRadius: 9, background: '#fff', color: '#324a50', fontWeight: 800, cursor: 'pointer' } as const
const errorStyle = { marginTop: 14, padding: 11, borderRadius: 8, background: '#fde8e8', color: '#9f3030', fontSize: 12, lineHeight: 1.5 } as const
