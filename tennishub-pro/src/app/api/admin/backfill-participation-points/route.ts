import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { computeExpectedPoints } from '@/lib/ranking-recompute'

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

  const expected = await computeExpectedPoints()
  const existing = await prisma.rankingPoint.findMany({
    where: { OR: expected.map((e) => ({ userId: e.userId, eventId: e.eventId })) },
    select: { id: true, userId: true, eventId: true, points: true },
  })
  const existingMap = new Map(existing.map((r) => [`${r.userId}|${r.eventId}`, r]))

  const toWrite = expected.filter((e) => (existingMap.get(`${e.userId}|${e.eventId}`)?.points ?? null) !== e.points)
  const eventsProcessed = new Set(toWrite.map((e) => e.eventId)).size

  await prisma.$transaction(
    toWrite.map((e) => {
      const row = existingMap.get(`${e.userId}|${e.eventId}`)
      return row
        ? prisma.rankingPoint.update({ where: { id: row.id }, data: { points: e.points } })
        : prisma.rankingPoint.create({ data: { userId: e.userId, eventId: e.eventId, points: e.points, position: 0, year: e.year } })
    }),
  )

  return NextResponse.json({ eventsProcessed, athletesUpdated: toWrite.length })
}
