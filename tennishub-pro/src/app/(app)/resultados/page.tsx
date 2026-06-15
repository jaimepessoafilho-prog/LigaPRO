import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SectionTitle, Card } from '@/components/ui/Card'
import { ScheduleMatchForm } from '@/components/matches/ScheduleMatchForm'
import { MatchCard, type MatchView } from '@/components/matches/MatchCard'

export const dynamic = 'force-dynamic'

type SetScore = { p1: number; p2: number }

export default async function ResultadosPage() {
  const session = await auth()
  const me = session?.user?.id ?? ''

  const [myRegs, myMatches] = await Promise.all([
    // Eventos ativos em que EU estou inscrito, com os demais inscritos
    prisma.eventRegistration.findMany({
      where: {
        userId: me,
        status: { not: 'CANCELLED' },
        event: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            registrations: {
              where: { status: { not: 'CANCELLED' } },
              include: { user: { select: { id: true, name: true } } },
            },
          },
        },
      },
      orderBy: { event: { startDate: 'desc' } },
    }),
    prisma.match.findMany({
      where: { OR: [{ player1Id: me }, { player2Id: me }] },
      orderBy: { updatedAt: 'desc' },
      include: {
        player1: { select: { id: true, name: true } },
        player2: { select: { id: true, name: true } },
        event: { select: { name: true } },
      },
      take: 100,
    }),
  ])

  // Eventos onde estou inscrito + adversários (co-inscritos, exceto eu)
  const events = myRegs.map((r) => ({ id: r.event.id, name: r.event.name }))
  const opponentsByEvent: Record<string, { id: string; name: string }[]> = {}
  for (const r of myRegs) {
    opponentsByEvent[r.event.id] = r.event.registrations
      .map((reg) => reg.user)
      .filter((u) => u.id !== me)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  const views: MatchView[] = myMatches.map((m) => ({
    id: m.id,
    status: m.status,
    player1: m.player1,
    player2: m.player2,
    player1Id: m.player1Id,
    player2Id: m.player2Id,
    eventName: m.event?.name ?? '',
    sets: (m.sets as unknown as SetScore[]) ?? [],
    winnerId: m.winnerId,
    scoreSubmittedById: m.scoreSubmittedById,
    scheduledAt: m.scheduledAt ? m.scheduledAt.toISOString() : null,
  }))

  const invitesToConfirm = views.filter((m) => m.status === 'PENDING_OPPONENT' && m.player2Id === me)
  const toPlay = views.filter((m) => m.status === 'SCHEDULED' || m.status === 'CONTESTED')
  const scoreToConfirm = views.filter((m) => m.status === 'PENDING_SCORE' && m.scoreSubmittedById !== me)
  const awaiting = views.filter(
    (m) =>
      (m.status === 'PENDING_OPPONENT' && m.player1Id === me) ||
      (m.status === 'PENDING_SCORE' && m.scoreSubmittedById === me),
  )
  const finished = views.filter((m) => m.status === 'FINISHED')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <ScheduleMatchForm events={events} opponentsByEvent={opponentsByEvent} />

      <Group title="Convites para confirmar" icon="ti-bell" items={invitesToConfirm} me={me}
        empty="Nenhum convite aguardando você." />

      <Group title="Placares para confirmar" icon="ti-checkbox" items={scoreToConfirm} me={me}
        empty="Nenhum placar aguardando sua confirmação." />

      <Group title="Jogos a disputar" icon="ti-play-card" items={toPlay} me={me}
        empty="Nenhum jogo confirmado para disputar." />

      <Group title="Aguardando o adversário" icon="ti-clock" items={awaiting} me={me}
        empty="Nada aguardando o adversário." />

      <div>
        <SectionTitle icon="ti-history">Histórico</SectionTitle>
        {finished.length === 0 ? (
          <Card><p style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center', padding: '16px' }}>Nenhuma partida finalizada.</p></Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {finished.map((m) => <MatchCard key={m.id} match={m} meId={me} />)}
          </div>
        )}
      </div>
    </div>
  )
}

function Group({
  title, icon, items, me, empty,
}: { title: string; icon: string; items: MatchView[]; me: string; empty: string }) {
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
