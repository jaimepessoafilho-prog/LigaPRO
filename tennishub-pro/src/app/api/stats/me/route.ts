import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRankingPosition } from '@/lib/ranking'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

  const userId = session.user.id

  const [pointsAgg, wins, totalMatches, eventsCount, position] = await Promise.all([
    prisma.rankingPoint.aggregate({ where: { userId }, _sum: { points: true }, _count: true }),
    prisma.match.count({ where: { winnerId: userId, status: 'FINISHED' } }),
    prisma.match.count({
      where: { status: 'FINISHED', OR: [{ player1Id: userId }, { player2Id: userId }] },
    }),
    prisma.eventRegistration.count({ where: { userId } }),
    getRankingPosition(userId),
  ])

  const totalPoints = pointsAgg._sum.points ?? 0
  const losses = totalMatches - wins

  return NextResponse.json({
    totalPoints,
    wins,
    losses,
    totalMatches,
    eventsCount,
    position,
    winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
  })
}
