import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateDoublesRanking } from '@/lib/ranking'
import { Card, SectionTitle, Tag } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { DoublesPanel } from '@/components/events/DoublesPanel'
import { EventScheduleForm } from '@/components/events/EventScheduleForm'
import { MatchCard, type MatchView } from '@/components/matches/MatchCard'

export const dynamic = 'force-dynamic'

type SetScore = { p1: number; p2: number }
const MEDALS = ['🥇', '🥈', '🥉', '⭐']

export default async function DuplasPage() {
  const session = await auth()
  const me = session?.user?.id ?? ''

  const [activeEvents, allDoublesEvents, allAthletes, ranking] = await Promise.all([
    prisma.event.findMany({
      where: { format: 'DOUBLES', status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: { registrations: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
      orderBy: { startDate: 'desc' },
    }),
    prisma.event.findMany({ where: { format: 'DOUBLES' }, select: { id: true } }),
    prisma.user.findMany({ where: { role: 'ATHLETE' }, select: { id: true, name: true } }),
    calculateDoublesRanking(),
  ])

  const doublesEventIds = allDoublesEvents.map((e) => e.id)

  // Minhas partidas de duplas (com nomes dos parceiros para exibir os times)
  const myMatches = doublesEventIds.length
    ? await prisma.match.findMany({
        where: {
          eventId: { in: doublesEventIds },
          OR: [{ player1Id: me }, { player2Id: me }, { player3Id: me }, { player4Id: me }],
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          player1: { select: { id: true, name: true, avatarUrl: true } },
          player2: { select: { id: true, name: true, avatarUrl: true } },
          player3: { select: { name: true } },
          player4: { select: { name: true } },
          event: { select: { name: true } },
        },
        take: 60,
      })
    : []

  const views: MatchView[] = myMatches.map((m) => ({
    id: m.id,
    status: m.status,
    player1: m.player1,
    player2: m.player2,
    player1Id: m.player1Id,
    player2Id: m.player2Id,
    player1Partner: m.player3?.name ?? null,
    player2Partner: m.player4?.name ?? null,
    eventName: m.event?.name ?? '',
    sets: (m.sets as unknown as SetScore[]) ?? [],
    winnerId: m.winnerId,
    scoreSubmittedById: m.scoreSubmittedById,
    scheduledAt: m.scheduledAt ? m.scheduledAt.toISOString() : null,
  }))

  const invitesToConfirm = views.filter((m) => m.status === 'PENDING_OPPONENT' && m.player2Id === me)
  const toPlay = views.filter((m) => m.status === 'SCHEDULED' || m.status === 'CONTESTED')
  const scoreToConfirm = views.filter((m) => m.status === 'PENDING_SCORE' && m.scoreSubmittedById !== me)
  const finished = views.filter((m) => m.status === 'FINISHED')

  // Por evento ativo: dados de forma de dupla + agendamento
  const eventBlocks = activeEvents.map((ev) => {
    const regs = ev.registrations
    const myReg = regs.find((r) => r.userId === me)
    const partnerReg = myReg?.partnerId ? regs.find((r) => r.userId === myReg.partnerId) : undefined
    const registeredIds = new Set(regs.map((r) => r.userId))
    const available = !myReg || !myReg.partnerId
      ? allAthletes.filter((a) => a.id !== me && !registeredIds.has(a.id))
      : []

    // Duplas completas (ambos CONFIRMED com parceiro) para agendar (round-robin)
    let opposingDuplas: { id: string; name: string }[] = []
    const iHaveDupla = myReg?.status === 'CONFIRMED' && myReg.partnerId && partnerReg?.status === 'CONFIRMED'
    if (ev.matchType === 'ROUND_ROBIN' && iHaveDupla) {
      const seen = new Set<string>()
      const myKey = [me, myReg!.partnerId].sort().join('-')
      for (const r of regs) {
        if (r.status !== 'CONFIRMED' || !r.partnerId) continue
        const key = [r.userId, r.partnerId].sort().join('-')
        if (key === myKey || seen.has(key)) continue
        const pr = regs.find((x) => x.userId === r.partnerId)
        if (pr?.status !== 'CONFIRMED') continue
        seen.add(key)
        opposingDuplas.push({ id: r.userId, name: `${r.user.name} & ${pr.user.name}` })
      }
      // Remove duplas já enfrentadas
      const playedAgainst = new Set<string>()
      for (const v of views.filter((x) => x.eventName === ev.name)) {
        if (v.player1Id !== me) playedAgainst.add(v.player1Id)
        if (v.player2Id && v.player2Id !== me) playedAgainst.add(v.player2Id)
      }
      opposingDuplas = opposingDuplas.filter((d) => !playedAgainst.has(d.id))
    }

    return {
      ev,
      panelProps: {
        eventId: ev.id,
        registered: !!myReg,
        myStatus: myReg?.status ?? null,
        partnerId: myReg?.partnerId ?? null,
        partnerName: partnerReg?.user.name ?? null,
        partnerStatus: partnerReg?.status ?? null,
        available,
        open: ev.status === 'OPEN',
      },
      canSchedule: ev.matchType === 'ROUND_ROBIN' && !!iHaveDupla,
      opposingDuplas,
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SectionTitle icon="ti-users-group">
        Duplas <Tag variant="clay">Central</Tag>
      </SectionTitle>

      {activeEvents.length === 0 ? (
        <Card>
          <p style={{ fontSize: '14px', color: 'var(--text2)' }}>
            Nenhum evento de duplas ativo. Peça ao organizador para criar um evento de{' '}
            <strong>Duplas</strong> em <Link href="/eventos" style={{ color: 'var(--green-d)', fontWeight: 600 }}>Eventos</Link>.
          </p>
        </Card>
      ) : (
        eventBlocks.map((b) => (
          <div key={b.ev.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--navy)' }}>
              <i className="ti ti-calendar-event" style={{ color: 'var(--green)', verticalAlign: '-2px' }} /> {b.ev.name}
            </div>
            <DoublesPanel {...b.panelProps} />
            {b.canSchedule && (
              <Card style={{ borderLeft: '4px solid var(--green)' }}>
                <SectionTitle icon="ti-calendar-plus" style={{ fontSize: '18px' }}>Marcar jogo (dupla vs dupla)</SectionTitle>
                {b.opposingDuplas.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text3)' }}>Nenhuma outra dupla disponível para jogar (ou já enfrentadas).</p>
                ) : (
                  <EventScheduleForm eventId={b.ev.id} opponents={b.opposingDuplas} />
                )}
              </Card>
            )}
          </div>
        ))
      )}

      {/* Meus jogos de duplas */}
      <Group title="Convites para confirmar" icon="ti-bell" items={invitesToConfirm} me={me} />
      <Group title="Placares para confirmar" icon="ti-checkbox" items={scoreToConfirm} me={me} />
      <Group title="Jogos a disputar" icon="ti-play-card" items={toPlay} me={me} />

      <div>
        <SectionTitle icon="ti-history" style={{ fontSize: '20px' }}>Histórico de duplas</SectionTitle>
        {finished.length === 0 ? (
          <Card><p style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center', padding: '14px' }}>Nenhuma partida de duplas finalizada.</p></Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {finished.map((m) => <MatchCard key={m.id} match={m} meId={me} />)}
          </div>
        )}
      </div>

      {/* Ranking de duplas */}
      <div>
        <SectionTitle icon="ti-medal" style={{ fontSize: '20px' }}>
          Ranking de Duplas <Tag variant="green">{ranking.length}</Tag>
        </SectionTitle>
        {ranking.length === 0 ? (
          <Card><p style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center', padding: '14px' }}>Nenhum atleta pontuando em duplas ainda.</p></Card>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th className="name-th">Atleta</th><th className="name-th">Parceiro</th><th>Pts</th><th>Vit.</th><th>Jogos</th></tr>
              </thead>
              <tbody>
                {ranking.map((e) => {
                  const isMe = e.userId === me
                  const trClass = e.tier === 'podium' ? 't-podium' : e.tier === 'classified' ? 't-class' : ''
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
      </div>
    </div>
  )
}

function Group({ title, icon, items, me }: { title: string; icon: string; items: MatchView[]; me: string }) {
  if (items.length === 0) return null
  return (
    <div>
      <SectionTitle icon={icon} style={{ fontSize: '20px' }}>{title}</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map((m) => <MatchCard key={m.id} match={m} meId={me} />)}
      </div>
    </div>
  )
}
