import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { getMatchSides, PARTICIPATION_POINTS } from '@/lib/match-points'

/**
 * Ajuste retroativo (um clique, admin): credita o ponto de participação
 * (+1 vencedor, +1 perdedor) em jogos FINISHED lançados antes dessa regra existir.
 * Cada evento processado é marcado com participationBackfilledAt, então rodar
 * de novo só processa eventos ainda não ajustados (idempotente).
 */
export async function POST() {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const events = await prisma.event.findMany({
    where: { participationBackfilledAt: null, matches: { some: { status: 'FINISHED' } } },
    select: { id: true, startDate: true },
  })

  let athletesUpdated = 0

  for (const event of events) {
    const matches = await prisma.match.findMany({
      where: { eventId: event.id, status: 'FINISHED', winnerId: { not: null } },
      select: { player1Id: true, player2Id: true, player3Id: true, player4Id: true, winnerId: true },
    })

    const bonusCount = new Map<string, number>()
    for (const m of matches) {
      const { winnerSide, loserSide } = getMatchSides(m, m.winnerId!)
      for (const uid of [...winnerSide, ...loserSide]) {
        bonusCount.set(uid, (bonusCount.get(uid) ?? 0) + 1)
      }
    }

    const userIds = [...bonusCount.keys()]
    const [roles, existing] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, role: true } }),
      prisma.rankingPoint.findMany({ where: { eventId: event.id, userId: { in: userIds } }, select: { id: true, userId: true, points: true } }),
    ])
    const adminIds = new Set(roles.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').map((u) => u.id))
    const existingMap = new Map(existing.map((r) => [r.userId, r]))
    const year = new Date(event.startDate).getFullYear()

    await prisma.$transaction(async (tx) => {
      for (const [uid, count] of bonusCount) {
        if (adminIds.has(uid)) continue
        const bonus = count * PARTICIPATION_POINTS
        const row = existingMap.get(uid)
        if (row) {
          await tx.rankingPoint.update({ where: { id: row.id }, data: { points: row.points + bonus } })
        } else {
          await tx.rankingPoint.create({ data: { userId: uid, eventId: event.id, points: bonus, position: 0, year } })
        }
        athletesUpdated++
      }
      await tx.event.update({ where: { id: event.id }, data: { participationBackfilledAt: new Date() } })
    })
  }

  return NextResponse.json({ eventsProcessed: events.length, athletesUpdated })
}
