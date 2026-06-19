import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateDoublesRanking } from '@/lib/ranking'
import { Card, SectionTitle, Tag } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'

export const dynamic = 'force-dynamic'

const MEDALS = ['🥇', '🥈', '🥉', '⭐']

export default async function DuplasPage() {
  const session = await auth()
  const me = session?.user?.id ?? ''

  const ranking = await calculateDoublesRanking()

  // Minha dupla (inscrição confirmada em evento de duplas, com parceiro)
  const myDoublesReg = await prisma.eventRegistration.findFirst({
    where: { userId: me, status: 'CONFIRMED', partnerId: { not: null }, event: { format: 'DOUBLES' } },
    include: { event: { select: { id: true, name: true } } },
    orderBy: { registeredAt: 'desc' },
  })
  const partner = myDoublesReg?.partnerId
    ? await prisma.user.findUnique({ where: { id: myDoublesReg.partnerId }, select: { name: true, avatarUrl: true } })
    : null
  const myEntry = ranking.find((r) => r.userId === me)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <SectionTitle icon="ti-users-group">
        Duplas <Tag variant="clay">Exclusivo</Tag>
      </SectionTitle>

      {/* Minha dupla */}
      {myDoublesReg && partner ? (
        <Card style={{ background: 'var(--navy)', border: 'none', color: 'white' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
            Minha dupla · {myDoublesReg.event.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0' }}>
            <Avatar name={session?.user?.name ?? 'Você'} avatarUrl={session?.user?.avatarUrl} size={44} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--green)' }}>+</span>
            <Avatar name={partner.name} avatarUrl={partner.avatarUrl} size={44} />
            <div style={{ marginLeft: '6px' }}>
              <div style={{ fontSize: '15px', fontWeight: 700 }}>Você &amp; {partner.name}</div>
              {myEntry && (
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,.6)' }}>
                  #{myEntry.position} · {myEntry.totalPoints} pts · {myEntry.wins} vitórias
                </div>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <p style={{ fontSize: '14px', color: 'var(--text2)' }}>
            Você ainda não tem uma dupla formada. Entre em um evento de <strong>Duplas</strong> em{' '}
            <Link href="/eventos" style={{ color: 'var(--green-d)', fontWeight: 600 }}>Eventos</Link> e convide um parceiro.
          </p>
        </Card>
      )}

      {/* Ranking de duplas */}
      <div>
        <SectionTitle icon="ti-medal" style={{ fontSize: '20px' }}>
          Ranking de Duplas <Tag variant="green">{ranking.length}</Tag>
        </SectionTitle>
        {ranking.length === 0 ? (
          <Card>
            <p style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
              Nenhum atleta pontuando em duplas ainda. Crie um evento de duplas para começar!
            </p>
          </Card>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th className="name-th">Atleta</th>
                  <th className="name-th">Parceiro</th>
                  <th>Pts</th>
                  <th>Vit.</th>
                  <th>Jogos</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((e) => {
                  const isMe = e.userId === me
                  const trClass = e.tier === 'podium' ? 't-podium' : e.tier === 'classified' ? 't-class' : e.tier === 'danger' ? 't-danger' : ''
                  const medal = e.position <= 4 ? ' ' + MEDALS[e.position - 1] : ''
                  const rkC = e.position <= 3 ? ['rk-1', 'rk-2', 'rk-3'][e.position - 1] : 'rk-mid'
                  return (
                    <tr key={e.userId} className={trClass} style={isMe ? { background: 'rgba(0,196,106,.08)' } : undefined}>
                      <td><span className={`rk-num ${rkC}`}>{e.position}</span></td>
                      <td className="name-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Avatar name={e.name} avatarUrl={e.avatarUrl} size={26} />
                          <span>{e.name}{medal}{isMe && <span className="me-badge">VOCÊ</span>}</span>
                        </div>
                      </td>
                      <td className="name-td" style={{ color: 'var(--text2)', fontWeight: 500 }}>{e.partnerName ?? '—'}</td>
                      <td><span className="pts-big">{e.totalPoints}</span></td>
                      <td>{e.wins}</td>
                      <td>{e.matches}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '10px' }}>
          Ranking exclusivo de duplas: pontos somam só de eventos de duplas. Cada vitória credita os <strong>dois parceiros</strong>.
        </p>
      </div>
    </div>
  )
}
