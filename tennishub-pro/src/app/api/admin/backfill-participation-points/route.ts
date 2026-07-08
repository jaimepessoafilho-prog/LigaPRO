import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { getMatchSides, getWinPoints, PARTICIPATION_POINTS } from '@/lib/match-points'

/**
 * Recalcula os pontos de ranking (vitória + participação) de todos os eventos
 * com jogos FINISHED, a partir do zero. Idempotente: pode rodar quantas vezes
 * precisar, sempre convergindo para o total correto — inclusive para quem
 * organiza e também joga (admin), que antes ficava de fora da pontuação.
 */
export async function POST() {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const events = await prisma.event.findMany({
    where: { matches: { some: { status: 'FINISHED' } } },
    select: { id: true, startDate: true, scoringSystem: true },
  })

  let athletesUpdated = 0

  for (const event of events) {
    const winPoints = getWinPoints(event.scoringSystem)
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

    const userIds = [...totals.keys()]
    const existing = await prisma.rankingPoint.findMany({
      where: { eventId: event.id, userId: { in: userIds } },
      select: { id: true, userId: true },
    })
    const existingMap = new Map(existing.map((r) => [r.userId, r]))
    const year = new Date(event.startDate).getFullYear()

    await prisma.$transaction(async (tx) => {
      for (const [uid, points] of totals) {
        const row = existingMap.get(uid)
        if (row) {
          await tx.rankingPoint.update({ where: { id: row.id }, data: { points } })
        } else {
          await tx.rankingPoint.create({ data: { userId: uid, eventId: event.id, points, position: 0, year } })
        }
        athletesUpdated++
      }
      await tx.event.update({ where: { id: event.id }, data: { participationBackfilledAt: new Date() } })
    })
  }

  return NextResponse.json({ eventsProcessed: events.length, athletesUpdated })
}
