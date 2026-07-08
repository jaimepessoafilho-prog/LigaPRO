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
  /** Critérios de desempate ATP */
  setDiff: number // saldo de sets (ganhos − perdidos)
  gameDiff: number // saldo de games (ganhos − perdidos)
  /** Faixa para coloração: podium (top 4), classified (top 8), normal, danger (4 últimos) */
  tier: 'podium' | 'classified' | 'normal' | 'danger'
}

type SetScore = { p1: number; p2: number }

/**
 * Ranking. Sem eventId: unificado (soma de todos os eventos, todos os atletas).
 * Com eventId: apenas o evento informado (participantes confirmados).
 */
export async function calculateUnifiedRanking(year?: number, eventId?: string): Promise<RankingEntry[]> {
  const currentYear = year ?? new Date().getFullYear()

  let athletes: { id: string; name: string; avatarUrl: string | null }[]
  if (eventId) {
    // Participantes confirmados do evento (quem organiza mas também joga entra igual)
    const regs = await prisma.eventRegistration.findMany({
      where: { eventId, status: 'CONFIRMED' },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    })
    athletes = regs.map((r) => r.user)
  } else {
    // Geral: qualquer usuário com pelo menos uma inscrição confirmada em algum evento
    athletes = await prisma.user.findMany({
      where: { registrations: { some: { status: 'CONFIRMED' } } },
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
      select: { player1Id: true, player2Id: true, sets: true },
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
  const setDiffMap = new Map<string, number>()
  const gameDiffMap = new Map<string, number>()
  const add = (map: Map<string, number>, key: string, v: number) => map.set(key, (map.get(key) ?? 0) + v)

  for (const m of matchesByUser) {
    const p1 = m.player1Id
    const p2 = m.player2Id
    const sets = (m.sets as unknown as SetScore[]) ?? []
    let setsP1 = 0, setsP2 = 0, gamesP1 = 0, gamesP2 = 0
    for (const s of sets) {
      gamesP1 += s.p1
      gamesP2 += s.p2
      if (s.p1 > s.p2) setsP1++
      else if (s.p2 > s.p1) setsP2++
    }
    if (p1) {
      add(matchesMap, p1, 1)
      add(setDiffMap, p1, setsP1 - setsP2)
      add(gameDiffMap, p1, gamesP1 - gamesP2)
    }
    if (p2) {
      add(matchesMap, p2, 1)
      add(setDiffMap, p2, setsP2 - setsP1)
      add(gameDiffMap, p2, gamesP2 - gamesP1)
    }
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
      setDiff: setDiffMap.get(a.id) ?? 0,
      gameDiff: gameDiffMap.get(a.id) ?? 0,
    }))
    // Desempate ATP: pontos → vitórias → saldo de sets → saldo de games → nome
    .sort(
      (x, y) =>
        y.totalPoints - x.totalPoints ||
        y.wins - x.wins ||
        y.setDiff - x.setDiff ||
        y.gameDiff - x.gameDiff ||
        x.name.localeCompare(y.name, 'pt-BR'),
    )

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

// ─── Ranking de DUPLAS (por time) ────────────────────────────────
export type DoublesTeamMember = { id: string; name: string; avatarUrl: string | null }
export type DoublesTeamEntry = {
  position: number
  teamKey: string
  members: DoublesTeamMember[] // 2 atletas
  totalPoints: number
  wins: number
  matches: number
  tier: 'podium' | 'classified' | 'normal' | 'danger'
}

/** Ranking por DUPLA (cada linha = um time) de eventos de duplas (geral ou um evento). */
export async function calculateDoublesRanking(eventId?: string): Promise<DoublesTeamEntry[]> {
  const doublesEvents = await prisma.event.findMany({
    where: { format: 'DOUBLES', ...(eventId ? { id: eventId } : {}) },
    select: { id: true },
  })
  const evIds = doublesEvents.map((e) => e.id)
  if (evIds.length === 0) return []

  const regs = await prisma.eventRegistration.findMany({
    where: { eventId: { in: evIds }, status: 'CONFIRMED', partnerId: { not: null } },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  })
  const userInfo = new Map<string, DoublesTeamMember>()
  for (const r of regs) userInfo.set(r.userId, r.user)

  // Times por evento (dedupe pelo par + evento)
  const teamInEvent = new Map<string, { pair: [string, string]; eventId: string }>()
  for (const r of regs) {
    if (!r.partnerId) continue
    const pair = [r.userId, r.partnerId].sort() as [string, string]
    teamInEvent.set(`${r.eventId}|${pair[0]}-${pair[1]}`, { pair, eventId: r.eventId })
  }
  if (teamInEvent.size === 0) return []

  const userIds = [...userInfo.keys()]
  const [pts, matches] = await Promise.all([
    prisma.rankingPoint.findMany({ where: { userId: { in: userIds }, eventId: { in: evIds } }, select: { userId: true, eventId: true, points: true } }),
    prisma.match.findMany({ where: { status: 'FINISHED', eventId: { in: evIds } }, select: { player1Id: true, player2Id: true, player3Id: true, player4Id: true, winnerId: true } }),
  ])
  const ptsMap = new Map<string, number>()
  for (const p of pts) if (p.eventId) ptsMap.set(`${p.userId}|${p.eventId}`, p.points)

  type Agg = { members: [string, string]; points: number; wins: number; matches: number }
  const byPair = new Map<string, Agg>()
  for (const t of teamInEvent.values()) {
    const pairKey = `${t.pair[0]}-${t.pair[1]}`
    const agg = byPair.get(pairKey) ?? { members: t.pair, points: 0, wins: 0, matches: 0 }
    const pa = ptsMap.get(`${t.pair[0]}|${t.eventId}`) ?? 0
    const pb = ptsMap.get(`${t.pair[1]}|${t.eventId}`) ?? 0
    agg.points += Math.max(pa, pb) // ambos parceiros têm a mesma pontuação
    byPair.set(pairKey, agg)
  }
  for (const m of matches) {
    const teamA = [m.player1Id, m.player3Id].filter(Boolean) as string[]
    const teamB = [m.player2Id, m.player4Id].filter(Boolean) as string[]
    for (const team of [teamA, teamB]) {
      if (team.length < 2) continue
      const pair = [...team].sort()
      const agg = byPair.get(`${pair[0]}-${pair[1]}`)
      if (!agg) continue
      agg.matches += 1
      if (m.winnerId && team.includes(m.winnerId)) agg.wins += 1
    }
  }

  const ranked = [...byPair.values()]
    .map((agg) => ({
      teamKey: agg.members.join('-'),
      members: agg.members.map((id) => userInfo.get(id) ?? { id, name: '?', avatarUrl: null }),
      totalPoints: agg.points,
      wins: agg.wins,
      matches: agg.matches,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || b.wins - a.wins || a.members[0].name.localeCompare(b.members[0].name, 'pt-BR'))

  const total = ranked.length
  return ranked.map((r, i) => {
    const position = i + 1
    let tier: DoublesTeamEntry['tier'] = 'normal'
    if (position <= 4) tier = 'podium'
    else if (position <= 8) tier = 'classified'
    else if (total > 8 && position > total - 4) tier = 'danger'
    return { ...r, position, tier }
  })
}
