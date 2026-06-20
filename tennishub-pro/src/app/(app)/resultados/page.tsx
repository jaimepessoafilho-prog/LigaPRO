import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SectionTitle, Card, Tag } from '@/components/ui/Card'
import { EventScheduleForm } from '@/components/events/EventScheduleForm'
import { MatchCard, type MatchView } from '@/components/matches/MatchCard'

export const dynamic = 'force-dynamic'

type SetScore = { p1: number; p2: number }

export default async function ResultadosPage() {
  const session = await auth()
  const me = session?.user?.id ?? ''

  const [myRegs, myMatchesRaw] = await Promise.all([
    // Eventos "Todos contra Todos" ativos em que estou CONFIRMADO
    prisma.eventRegistration.findMany({
      where: {
        userId: me,
        status: 'CONFIRMED',
        event: { matchType: 'ROUND_ROBIN', status: { in: ['OPEN', 'IN_PROGRESS'] } },
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            format: true,
            registrations: { where: { status: 'CONFIRMED' }, include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { event: { startDate: 'desc' } },
    }),
    prisma.match.findMany({
      where: { status: { not: 'CANCELLED' }, OR: [{ player1Id: me }, { player2Id: me }, { player3Id: me }, { player4Id: me }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        player1: { select: { id: true, name: true, avatarUrl: true } },
        player2: { select: { id: true, name: true, avatarUrl: true } },
        player3: { select: { name: true } },
        player4: { select: { name: true } },
        event: { select: { id: true, name: true } },
      },
      take: 100,
    }),
  ])

  const views: MatchView[] = myMatchesRaw.map((m) => ({
    id: m.id,
    status: m.status,
    player1: m.player1,
    player2: m.player2,
    player1Id: m.player1Id,
    player2Id: m.player2Id,
    player3Id: m.player3Id,
    player4Id: m.player4Id,
    player1Partner: m.player3?.name ?? null,
    player2Partner: m.player4?.name ?? null,
    eventName: m.event?.name ?? '',
    sets: (m.sets as unknown as SetScore[]) ?? [],
    winnerId: m.winnerId,
    scoreSubmittedById: m.scoreSubmittedById,
    scheduledAt: m.scheduledAt ? m.scheduledAt.toISOString() : null,
  }))

  // Adversários já enfrentados por evento (time-aware)
  const playedByEvent = new Map<string, Set<string>>()
  for (const m of myMatchesRaw) {
    const teamA = [m.player1Id, m.player3Id].filter(Boolean) as string[]
    const teamB = [m.player2Id, m.player4Id].filter(Boolean) as string[]
    const opp = teamA.includes(me) ? teamB : teamA
    const set = playedByEvent.get(m.eventId) ?? new Set<string>()
    opp.forEach((id) => set.add(id))
    playedByEvent.set(m.eventId, set)
  }

  // Blocos de marcação por evento
  const eventBlocks = myRegs.map((reg) => {
    const ev = reg.event
    const played = playedByEvent.get(ev.id) ?? new Set<string>()
    const isDoubles = ev.format === 'DOUBLES'
    let opponents: { id: string; name: string }[] = []
    let needsDupla = false

    if (!isDoubles) {
      opponents = ev.registrations
        .filter((r) => r.userId !== me && !played.has(r.userId))
        .map((r) => ({ id: r.userId, name: r.user.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    } else {
      // Duplas: preciso ter minha dupla formada neste evento
      if (!reg.partnerId) {
        needsDupla = true
      } else {
        const seen = new Set<string>()
        const myKey = [me, reg.partnerId].sort().join('-')
        for (const r of ev.registrations) {
          if (!r.partnerId) continue
          const key = [r.userId, r.partnerId].sort().join('-')
          if (key === myKey || seen.has(key)) continue
          const pr = ev.registrations.find((x) => x.userId === r.partnerId)
          if (!pr) continue
          seen.add(key)
          if (played.has(r.userId) || played.has(r.partnerId)) continue
          opponents.push({ id: r.userId, name: `${r.user.name} & ${pr.user.name}` })
        }
        opponents.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      }
    }
    return { ev, isDoubles, opponents, needsDupla }
  })

  // Lifecycle (time-aware)
  const teamInfo = (m: MatchView) => {
    const teamA = [m.player1Id, m.player3Id].filter(Boolean) as string[]
    const teamB = [m.player2Id, m.player4Id].filter(Boolean) as string[]
    const onA = teamA.includes(me)
    const onB = teamB.includes(me)
    const submitterOnA = m.scoreSubmittedById ? teamA.includes(m.scoreSubmittedById) : false
    const myTeamSubmitted = !!m.scoreSubmittedById && (onA ? submitterOnA : !submitterOnA)
    return { onA, onB, myTeamSubmitted }
  }
  const invitesToConfirm = views.filter((m) => m.status === 'PENDING_OPPONENT' && teamInfo(m).onB)
  const toPlay = views.filter((m) => m.status === 'SCHEDULED' || m.status === 'CONTESTED')
  const scoreToConfirm = views.filter((m) => m.status === 'PENDING_SCORE' && !teamInfo(m).myTeamSubmitted)
  const awaiting = views.filter(
    (m) => (m.status === 'PENDING_OPPONENT' && teamInfo(m).onA) || (m.status === 'PENDING_SCORE' && teamInfo(m).myTeamSubmitted),
  )
  const finished = views.filter((m) => m.status === 'FINISHED')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <SectionTitle icon="ti-clipboard-list">Jogos</SectionTitle>

      {/* Marcar jogo por evento */}
      {eventBlocks.length === 0 ? (
        <Card>
          <SectionTitle icon="ti-calendar-plus" style={{ fontSize: '18px', marginBottom: '6px' }}>Marcar um jogo</SectionTitle>
          <p style={{ fontSize: '13px', color: 'var(--text2)' }}>
            Você não tem inscrição confirmada em nenhum evento <strong>Todos contra Todos</strong> ativo. Inscreva-se em{' '}
            <Link href="/eventos" style={{ color: 'var(--green-d)', fontWeight: 600 }}>Eventos</Link>.
          </p>
        </Card>
      ) : (
        eventBlocks.map((b) => (
          <Card key={b.ev.id} style={{ borderLeft: '4px solid var(--green)' }}>
            <SectionTitle icon="ti-calendar-plus" style={{ fontSize: '18px' }}>
              Marcar jogo — {b.ev.name} <Tag variant={b.isDoubles ? 'clay' : 'navy'}>{b.isDoubles ? 'Duplas' : 'Simples'}</Tag>
            </SectionTitle>
            {b.needsDupla ? (
              <p style={{ fontSize: '13px', color: 'var(--text3)' }}>
                Forme sua dupla primeiro em <Link href="/duplas" style={{ color: 'var(--green-d)', fontWeight: 600 }}>Duplas</Link> para marcar jogos.
              </p>
            ) : b.opponents.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text3)' }}>
                Você já {b.isDoubles ? 'enfrentou todas as duplas' : 'jogou contra todos'} disponíveis neste evento. 🎾
              </p>
            ) : (
              <EventScheduleForm eventId={b.ev.id} opponents={b.opponents} />
            )}
          </Card>
        ))
      )}

      <Group title="Convites para confirmar" icon="ti-bell" items={invitesToConfirm} me={me} />
      <Group title="Placares para confirmar" icon="ti-checkbox" items={scoreToConfirm} me={me} />
      <Group title="Jogos a disputar" icon="ti-play-card" items={toPlay} me={me} />
      <Group title="Aguardando o adversário" icon="ti-clock" items={awaiting} me={me} />

      <div>
        <SectionTitle icon="ti-history" style={{ fontSize: '20px' }}>Histórico</SectionTitle>
        {finished.length === 0 ? (
          <Card><p style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center', padding: '14px' }}>Nenhuma partida finalizada.</p></Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {finished.map((m) => <MatchCard key={m.id} match={m} meId={me} />)}
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
