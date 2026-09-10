import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { Card, SectionTitle, Tag } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { AdminMatchPanel, type AdminMatchView } from '@/components/matches/AdminMatchPanel'
import { AthleteMatchReadOnly } from '@/components/matches/AthleteMatchReadOnly'

export const dynamic = 'force-dynamic'

type SetScore = { p1: number; p2: number }

export default async function AthleteMatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: athleteId } = await params
  const session = await auth()
  if (!session) redirect('/login')
  const admin = isAdminRole(session.user.role)

  const athlete = await prisma.user.findUnique({
    where: { id: athleteId },
    select: { id: true, name: true, avatarUrl: true, email: true },
  })
  if (!athlete) notFound()

  const matches = await prisma.match.findMany({
    where: {
      status: { not: 'CANCELLED' },
      OR: [{ player1Id: athleteId }, { player2Id: athleteId }, { player3Id: athleteId }, { player4Id: athleteId }],
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      player1: { select: { id: true, name: true, avatarUrl: true } },
      player2: { select: { id: true, name: true, avatarUrl: true } },
      player3: { select: { id: true, name: true } },
      player4: { select: { id: true, name: true } },
      event: { select: { id: true, name: true, finishedAt: true } },
      correctionProposedBy: { select: { name: true } },
      correctionContestedBy: { select: { name: true } },
    },
  })

  // Jogos "efetivamente realizados" (FINISHED, não W.O. Admin) por evento+atleta — base da sugestão de vencedor do W.O. Admin
  const eventIds = [...new Set(matches.map((m) => m.eventId))]
  const realFinished = eventIds.length
    ? await prisma.match.findMany({
        where: { eventId: { in: eventIds }, status: 'FINISHED', isAdminScore: false },
        select: { eventId: true, player1Id: true, player2Id: true, player3Id: true, player4Id: true },
      })
    : []
  const playedCount = new Map<string, number>()
  for (const m of realFinished) {
    const ids = [m.player1Id, m.player2Id, m.player3Id, m.player4Id].filter(Boolean) as string[]
    for (const uid of ids) {
      const key = `${m.eventId}|${uid}`
      playedCount.set(key, (playedCount.get(key) ?? 0) + 1)
    }
  }

  const views: AdminMatchView[] = matches.map((m) => {
    const sideAIds = [m.player1Id, m.player3Id].filter(Boolean) as string[]
    const sideBIds = [m.player2Id, m.player4Id].filter(Boolean) as string[]
    const countA = sideAIds.length ? Math.max(...sideAIds.map((uid) => playedCount.get(`${m.eventId}|${uid}`) ?? 0)) : 0
    const countB = sideBIds.length ? Math.max(...sideBIds.map((uid) => playedCount.get(`${m.eventId}|${uid}`) ?? 0)) : 0
    const suggestedWinnerId = countA === countB ? null : countA > countB ? m.player1Id : m.player2Id

    return {
      id: m.id,
      status: m.status,
      eventId: m.eventId,
      eventName: m.event.name,
      eventFinished: !!m.event.finishedAt,
      player1: m.player1,
      player2: m.player2,
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      player1Partner: m.player3?.name ?? null,
      player2Partner: m.player4?.name ?? null,
      sets: (m.sets as unknown as SetScore[]) ?? [],
      winnerId: m.winnerId,
      isAdminScore: m.isAdminScore,
      resultType: m.resultType,
      scoreSubmittedByName:
        [m.player1, m.player2, m.player3, m.player4].find((p) => p?.id === m.scoreSubmittedById)?.name ?? null,
      suggestedWinnerId,
      matchesPlayedA: countA,
      matchesPlayedB: countB,
      correctionPendingSets: (m.correctionPendingSets as unknown as SetScore[] | null) ?? null,
      correctionConfirmedA: m.correctionConfirmedA,
      correctionConfirmedB: m.correctionConfirmedB,
      correctionProposedByName: m.correctionProposedBy?.name ?? null,
      correctionContestedByName: m.correctionContestedBy?.name ?? null,
    }
  })

  const finished = views.filter((v) => v.status === 'FINISHED')
  const pending = views.filter((v) => v.status !== 'FINISHED')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <Link href="/atletas" style={{ color: 'var(--text3)', fontSize: '13px' }}>
        <i className="ti ti-arrow-left" style={{ verticalAlign: '-2px' }} /> Voltar para atletas
      </Link>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar name={athlete.name} avatarUrl={athlete.avatarUrl} size={44} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--navy)' }}>{athlete.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{athlete.email}</div>
          </div>
        </div>
      </Card>

      {pending.length > 0 && (
        <div>
          <SectionTitle icon="ti-clock" style={{ fontSize: '20px' }}>
            Jogos pendentes <Tag variant="gold">{pending.length}</Tag>
          </SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pending.map((m) => (
              admin ? <AdminMatchPanel key={m.id} match={m} /> : <AthleteMatchReadOnly key={m.id} match={m} />
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionTitle icon="ti-history" style={{ fontSize: '20px' }}>
          Jogos realizados <Tag variant="green">{finished.length}</Tag>
        </SectionTitle>
        {finished.length === 0 ? (
          <Card>
            <p style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center', padding: '14px' }}>Nenhum jogo realizado ainda.</p>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {finished.map((m) => (
              admin ? <AdminMatchPanel key={m.id} match={m} /> : <AthleteMatchReadOnly key={m.id} match={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
