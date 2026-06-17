import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { Card, SectionTitle, Tag } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { DeleteAthleteButton } from '@/components/athletes/DeleteAthleteButton'

export const dynamic = 'force-dynamic'

const GENDER_LABEL: Record<string, string> = { MALE: 'M', FEMALE: 'F', OTHER: '—' }

export default async function AtletasPage() {
  const session = await auth()
  const admin = isAdminRole(session?.user?.role)

  const athletes = await prisma.user.findMany({
    where: { role: 'ATHLETE' },
    select: { id: true, name: true, email: true, age: true, gender: true, avatarUrl: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <SectionTitle icon="ti-users">
        Atletas <Tag variant="green">{athletes.length}</Tag>
      </SectionTitle>

      <Card>
        {athletes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>👥</div>
            <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: '16px' }}>
              Nenhum atleta cadastrado ainda.
            </p>
            <Link href="/register" className="btn btn-green" style={{ textDecoration: 'none' }}>
              <i className="ti ti-user-plus" /> Cadastrar atleta
            </Link>
          </div>
        ) : (
          athletes.map((a) => (
            <div key={a.id} className="athlete-row">
              <Avatar name={a.name} avatarUrl={a.avatarUrl} />
              <div style={{ flex: 1 }}>
                <div className="athlete-name">{a.name}</div>
                <div className="athlete-meta">
                  {a.email} · {a.age} anos · {GENDER_LABEL[a.gender] ?? a.gender}
                </div>
              </div>
              {admin && <DeleteAthleteButton userId={a.id} name={a.name} />}
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
