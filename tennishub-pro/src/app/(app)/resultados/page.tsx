import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { Card, SectionTitle } from '@/components/ui/Card'
import { RecordMatchForm } from '@/components/matches/RecordMatchForm'

export const dynamic = 'force-dynamic'

type SetScore = { p1: number; p2: number }

export default async function ResultadosPage() {
  const session = await auth()
  const admin = isAdminRole(session?.user?.role)

  const [events, athletes, matches] = await Promise.all([
    prisma.event.findMany({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      select: { id: true, name: true },
      orderBy: { startDate: 'desc' },
    }),
    prisma.user.findMany({ where: { role: 'ATHLETE' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.match.findMany({
      where: { status: 'FINISHED' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
        event: { select: { name: true } },
      },
    }),
  ])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {admin && <RecordMatchForm events={events} athletes={athletes} />}

      <div>
        <SectionTitle icon="ti-history">Histórico de Partidas</SectionTitle>
        {matches.length === 0 ? (
          <Card>
            <p style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
              Nenhuma partida lançada ainda.
            </p>
          </Card>
        ) : (
          <Card>
            {matches.map((m) => {
              const sets = (m.sets as unknown as SetScore[]) ?? []
              const p1Win = m.winnerId === m.player1Id
              return (
                <div key={m.id} className="athlete-row" style={{ alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                      <span style={{ fontWeight: p1Win ? 700 : 500, color: p1Win ? 'var(--green-d)' : 'var(--text2)' }}>
                        {m.player1?.name}
                      </span>
                      <span style={{ color: 'var(--text3)', fontSize: '12px' }}>vs</span>
                      <span style={{ fontWeight: !p1Win ? 700 : 500, color: !p1Win ? 'var(--green-d)' : 'var(--text2)' }}>
                        {m.player2?.name}
                      </span>
                    </div>
                    <div className="athlete-meta">{m.event?.name}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontFamily: 'var(--font-display)', fontSize: '18px', color: 'var(--navy)' }}>
                    {sets.map((s, i) => (
                      <span key={i}>{s.p1}/{s.p2}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </div>
    </div>
  )
}
