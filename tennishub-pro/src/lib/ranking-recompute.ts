import { prisma } from '@/lib/prisma'
import { getMatchSides, getWinPoints, PARTICIPATION_POINTS } from '@/lib/match-points'

export type ExpectedPoint = { eventId: string; userId: string; points: number; year: number }

/** Pontos (vitória + participação) que cada participante deveria ter em cada evento, a partir dos jogos FINISHED. */
export async function computeExpectedPoints(): Promise<ExpectedPoint[]> {
  const events = await prisma.event.findMany({
    where: { matches: { some: { status: 'FINISHED' } } },
    select: { id: true, startDate: true, scoringSystem: true },
  })

  const result: ExpectedPoint[] = []
  for (const event of events) {
    const winPoints = getWinPoints(event.scoringSystem)
    const year = new Date(event.startDate).getFullYear()
    const matches = await prisma.match.findMany({
      where: { eventId: event.id, status: 'FINISHED', winnerId: { not: null } },
      select: { player1Id: true, player2Id: true, player3Id: true, player4Id: true, winnerId: true },
    })

    const totals = new Map<string, number>()
    const add = (uid: string, pts: number) => totals.set(uid, (totals.get(uid) ?? 0) + pts)
    for (const m of matches) {
      const { winnerSide, loserSide } = getMatchSides(m, m.winnerId!)
      for (const uid of winnerSide) add(uid, winPoints + PARTICIPATION_POINTS)
      for (const uid of loserSide) add(uid, PARTICIPATION_POINTS)
    }
    for (const [userId, points] of totals) result.push({ eventId: event.id, userId, points, year })
  }
  return result
}

/** Quantos eventos têm pontos gravados diferentes do que deveriam ser (nada pendente = 0). */
export async function countEventsPendingRecalculation(): Promise<number> {
  const expected = await computeExpectedPoints()
  if (expected.length === 0) return 0

  const existing = await prisma.rankingPoint.findMany({
    where: { OR: expected.map((e) => ({ userId: e.userId, eventId: e.eventId })) },
    select: { userId: true, eventId: true, points: true },
  })
  const existingMap = new Map(existing.map((r) => [`${r.userId}|${r.eventId}`, r.points]))

  const staleEvents = new Set<string>()
  for (const e of expected) {
    if ((existingMap.get(`${e.userId}|${e.eventId}`) ?? null) !== e.points) staleEvents.add(e.eventId)
  }
  return staleEvents.size
}
