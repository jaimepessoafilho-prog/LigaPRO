import { prisma } from '@/lib/prisma'
import { getMatchSides, sideMatchPoints } from '@/lib/match-points'

export type ExpectedPoint = { eventId: string; userId: string; points: number; year: number }

/**
 * Pontos que cada participante deveria ter em cada evento, a partir dos jogos FINISHED.
 *
 * Jogo disputado (isAdminScore = false, inclui os homologados pelo ADMIN): vencedor leva
 * pontos de vitória + 1 de participação; perdedor leva 1 de participação.
 * W.O. Admin (isAdminScore = true): ninguém jogou — o vencedor leva só os pontos de
 * vitória (sem participação) e o perdedor não pontua (não aparece no resultado).
 * Evento PLAYOFF (scoringSystem.mode = "PLAYOFF"): pontuação plana — vencedor winPoints,
 * perdedor lossPoints (0 se for W.O. Admin), sem ponto de participação.
 */
export async function computeExpectedPoints(): Promise<ExpectedPoint[]> {
  const events = await prisma.event.findMany({
    where: { matches: { some: { status: 'FINISHED' } } },
    select: { id: true, startDate: true, scoringSystem: true },
  })

  const result: ExpectedPoint[] = []
  for (const event of events) {
    const year = new Date(event.startDate).getFullYear()
    const matches = await prisma.match.findMany({
      where: { eventId: event.id, status: 'FINISHED', winnerId: { not: null } },
      select: { player1Id: true, player2Id: true, player3Id: true, player4Id: true, winnerId: true, isAdminScore: true },
    })

    const totals = new Map<string, number>()
    const add = (uid: string, pts: number) => { if (pts > 0) totals.set(uid, (totals.get(uid) ?? 0) + pts) }
    for (const m of matches) {
      const { winnerSide, loserSide } = getMatchSides(m, m.winnerId!)
      const winPts = sideMatchPoints(event.scoringSystem, { isWinner: true, isAdminScore: m.isAdminScore })
      const lossPts = sideMatchPoints(event.scoringSystem, { isWinner: false, isAdminScore: m.isAdminScore })
      for (const uid of winnerSide) add(uid, winPts)
      for (const uid of loserSide) add(uid, lossPts)
    }
    for (const [userId, points] of totals) result.push({ eventId: event.id, userId, points, year })
  }
  return result
}

/** Quantos eventos têm pontos gravados diferentes do que deveriam ser (nada pendente = 0). */
export async function countEventsPendingRecalculation(): Promise<number> {
  const expected = await computeExpectedPoints()

  const existing = await prisma.rankingPoint.findMany({
    where: { eventId: { not: null } },
    select: { userId: true, eventId: true, points: true },
  })
  const existingMap = new Map(existing.map((r) => [`${r.userId}|${r.eventId}`, r.points]))
  const expectedKeys = new Set(expected.map((e) => `${e.userId}|${e.eventId}`))

  const staleEvents = new Set<string>()
  // Pontos que deveriam existir e não batem (ou faltam)
  for (const e of expected) {
    if ((existingMap.get(`${e.userId}|${e.eventId}`) ?? null) !== e.points) staleEvents.add(e.eventId)
  }
  // Pontos gravados que não têm mais jogo correspondente (ex.: W.O. revertido, jogo contestado)
  for (const r of existing) {
    if (r.eventId && !expectedKeys.has(`${r.userId}|${r.eventId}`)) staleEvents.add(r.eventId)
  }
  return staleEvents.size
}

/**
 * Recalcula os pontos de ranking de todos os eventos, a partir do zero. Idempotente —
 * chamada tanto pelo botão manual de recálculo quanto automaticamente após toda edição
 * administrativa de placar (correção, homologação ou W.O. Admin).
 *
 * Reconcilia nos dois sentidos: cria/atualiza os pontos esperados E **apaga** as linhas de
 * ranking_points que não têm mais jogo FINISHED correspondente (quem perdeu todos os jogos
 * por W.O. e teve o W.O. revertido, placar contestado, jogo removido). Pontos preservados de
 * eventos excluídos (eventId nulo) ficam intactos. As regras de pontuação por tipo de jogo
 * ficam em computeExpectedPoints (W.O. Admin: vencedor só a vitória, perdedor zero).
 */
export async function recomputeAllPoints(): Promise<{ eventsProcessed: number; athletesUpdated: number }> {
  const expected = await computeExpectedPoints()
  const existing = await prisma.rankingPoint.findMany({
    where: { eventId: { not: null } },
    select: { id: true, userId: true, eventId: true, points: true },
  })
  const existingMap = new Map(existing.map((r) => [`${r.userId}|${r.eventId}`, r]))
  const expectedKeys = new Set(expected.map((e) => `${e.userId}|${e.eventId}`))

  const toWrite = expected.filter((e) => (existingMap.get(`${e.userId}|${e.eventId}`)?.points ?? null) !== e.points)
  const orphans = existing.filter((r) => !expectedKeys.has(`${r.userId}|${r.eventId}`))

  const writeOps = toWrite.map((e) => {
    const row = existingMap.get(`${e.userId}|${e.eventId}`)
    return row
      ? prisma.rankingPoint.update({ where: { id: row.id }, data: { points: e.points } })
      : prisma.rankingPoint.create({ data: { userId: e.userId, eventId: e.eventId, points: e.points, position: 0, year: e.year } })
  })
  const deleteOps = orphans.map((r) => prisma.rankingPoint.delete({ where: { id: r.id } }))

  if (writeOps.length + deleteOps.length > 0) {
    await prisma.$transaction([...writeOps, ...deleteOps])
  }

  const eventsProcessed = new Set<string>([
    ...toWrite.map((e) => e.eventId),
    ...orphans.map((r) => r.eventId as string),
  ]).size

  return { eventsProcessed, athletesUpdated: writeOps.length + deleteOps.length }
}
