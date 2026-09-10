import TranslendAuthGate from '@/app/translend/translend-auth'

export default function TranslendAuthCheckPage() {
  return (
    <TranslendAuthGate>
      <main style={{ minHeight: '100vh', padding: 32, fontFamily: 'system-ui' }}>
        <h1>Translend authentication check</h1>
        <p>Authentication is active. Return to /translend to use the workspace.</p>
      </main>
    </TranslendAuthGate>
  )
}
