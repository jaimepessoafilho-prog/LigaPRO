import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '48px', letterSpacing: '4px', marginBottom: '8px' }}>
          LIGA<em style={{ color: 'var(--green)', fontStyle: 'normal' }}>PRO</em>
        </div>
        <p style={{ color: 'rgba(255,255,255,.5)', marginBottom: '24px' }}>
          Bem-vindo, <strong style={{ color: 'white' }}>{session.user?.name}</strong>
        </p>
        <div style={{
          display: 'inline-block',
          padding: '6px 18px',
          background: 'rgba(0,196,106,.15)',
          border: '1px solid rgba(0,196,106,.3)',
          borderRadius: '9999px',
          fontSize: '12px',
          color: 'var(--green)',
          fontWeight: 600,
          marginBottom: '32px',
        }}>
          {session.user?.role === 'ADMIN' || session.user?.role === 'SUPER_ADMIN' ? '⚙️ Admin' : '🎾 Atleta'}
        </div>
        <p style={{ color: 'rgba(255,255,255,.3)', fontSize: '13px' }}>
          Dashboard completo chegando na Fase 3 →
        </p>
      </div>
    </div>
  )
}
