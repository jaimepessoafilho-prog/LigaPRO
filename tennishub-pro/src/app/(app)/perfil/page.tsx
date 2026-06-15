import { auth } from '@/lib/auth'
import { Card, SectionTitle } from '@/components/ui/Card'

export default async function PerfilPage() {
  const session = await auth()
  const user = session?.user

  return (
    <Card>
      <SectionTitle icon="ti-user-circle">Meu Perfil</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
        <Row label="Nome" value={user?.name ?? '—'} />
        <Row label="E-mail" value={user?.email ?? '—'} />
        <Row label="Perfil" value={user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' ? 'Administrador' : 'Atleta'} />
      </div>
      <p style={{ color: 'var(--text3)', fontSize: '12px', marginTop: '16px' }}>
        Edição de dados e foto de perfil chegam na Fase 3.
      </p>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
      <span style={{ color: 'var(--text3)', fontWeight: 600 }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}
