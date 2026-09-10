import TranslendAuth from '@/app/translend/translend-auth'

export default function TranslendAuthCheckPage() {
  return (
    <main style={{ minHeight: '100vh', padding: 32, fontFamily: 'system-ui' }}>
      <h1>Translend authentication check</h1>
      <p>Foundation verification surface. No business functionality is connected.</p>
      <TranslendAuth />
    </main>
  )
}
