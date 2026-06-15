import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, SectionTitle } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

const GENDER_LABEL: Record<string, string> = { MALE: 'Masculino', FEMALE: 'Feminino', OTHER: 'Outro' }

export default async function PerfilPage() {
  const session = await auth()
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null

  const admin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  return (
    <Card>
      <SectionTitle icon="ti-user-circle">Meu Perfil</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
        <Row label="Nome" value={user?.name ?? '—'} />
        <Row label="E-mail" value={user?.email ?? '—'} />
        <Row label="WhatsApp" value={user?.whatsapp ?? '—'} />
        <Row label="Idade" value={user ? `${user.age} anos` : '—'} />
        <Row label="Sexo" value={user ? (GENDER_LABEL[user.gender] ?? user.gender) : '—'} />
        <Row label="Perfil" value={admin ? 'Administrador' : 'Atleta'} />
      </div>
      <p style={{ color: 'var(--text3)', fontSize: '12px', marginTop: '16px' }}>
        Edição de dados e foto de perfil chegam em uma fase futura.
      </p>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px', gap: '12px' }}>
      <span style={{ color: 'var(--text3)', fontWeight: 600 }}>{label}</span>
      <span style={{ color: 'var(--text)', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
