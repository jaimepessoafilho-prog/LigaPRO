import { prisma } from '@/lib/prisma'

export type RankingEntry = {
  position: number
  userId: string
  name: string
  avatarUrl: string | null
  totalPoints: number
  wins: number
  matches: number
  eventsCount: number
  /** Faixa para coloração: podium (top 4), classified (top 8), normal, danger (4 últimos) */
  tier: 'podium' | 'classified' | 'normal' | 'danger'
}

/**
 * Ranking. Sem eventId: unificado (soma de todos os eventos, todos os atletas).
 * Com eventId: apenas o evento informado (participantes confirmados).
 */
export async function calculateUnifiedRanking(year?: number, eventId?: string): Promise<RankingEntry[]> {
  const currentYear = year ?? new Date().getFullYear()

  let athletes: { id: string; name: string; avatarUrl: string | null }[]
  if (eventId) {
    const regs = await prisma.eventRegistration.findMany({
      where: { eventId, status: 'CONFIRMED' },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })
    athletes = regs.map((r) => r.user)
  } else {
    athletes = await prisma.user.findMany({
      where: { role: 'ATHLETE' },
      select: { id: true, name: true, avatarUrl: true },
    })
  }

  if (athletes.length === 0) return []

  const ids = athletes.map((a) => a.id)
  const matchScope = eventId ? { eventId } : {}

  const [pointsByUser, winsByUser, matchesByUser, regsByUser] = await Promise.all([
    prisma.rankingPoint.groupBy({
      by: ['userId'],
      where: { userId: { in: ids }, year: currentYear, ...(eventId ? { eventId } : {}) },
      _sum: { points: true },
    }),
    prisma.match.groupBy({
      by: ['winnerId'],
      where: { winnerId: { in: ids }, status: 'FINISHED', ...matchScope },
      _count: { _all: true },
    }),
    prisma.match.findMany({
      where: { status: 'FINISHED', ...matchScope, OR: [{ player1Id: { in: ids } }, { player2Id: { in: ids } }] },
      select: { player1Id: true, player2Id: true },
    }),
    prisma.eventRegistration.groupBy({
      by: ['userId'],
      where: { userId: { in: ids }, status: 'CONFIRMED' },
      _count: { _all: true },
    }),
  ])

  const pointsMap = new Map(pointsByUser.map((p) => [p.userId, p._sum.points ?? 0]))
  const winsMap = new Map(winsByUser.map((w) => [w.winnerId as string, w._count._all]))
  const eventsMap = new Map(regsByUser.map((r) => [r.userId, r._count._all]))
  const matchesMap = new Map<string, number>()
  for (const m of matchesByUser) {
    if (m.player1Id) matchesMap.set(m.player1Id, (matchesMap.get(m.player1Id) ?? 0) + 1)
    if (m.player2Id) matchesMap.set(m.player2Id, (matchesMap.get(m.player2Id) ?? 0) + 1)
  }

  const ranked = athletes
    .map((a) => ({
      userId: a.id,
      name: a.name,
      avatarUrl: a.avatarUrl,
      totalPoints: pointsMap.get(a.id) ?? 0,
      wins: winsMap.get(a.id) ?? 0,
      matches: matchesMap.get(a.id) ?? 0,
      eventsCount: eventsMap.get(a.id) ?? 0,
    }))
    .sort((x, y) => y.totalPoints - x.totalPoints || y.wins - x.wins || x.name.localeCompare(y.name, 'pt-BR'))

  const total = ranked.length

  return ranked.map((r, i) => {
    const position = i + 1
    let tier: RankingEntry['tier'] = 'normal'
    if (position <= 4) tier = 'podium'
    else if (position <= 8) tier = 'classified'
    else if (total > 8 && position > total - 4) tier = 'danger'
    return { ...r, position, tier }
  })
}

export async function getRankingPosition(userId: string): Promise<number> {
  const ranking = await calculateUnifiedRanking()
  const idx = ranking.findIndex((r) => r.userId === userId)
  return idx === -1 ? 0 : idx + 1
}
