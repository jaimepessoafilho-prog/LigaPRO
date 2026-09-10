type SetScore = { p1: number; p2: number }

/** Conta sets vencidos por cada jogador e determina o vencedor. */
export function computeWinner(
  sets: SetScore[],
  player1Id: string,
  player2Id: string,
): { winnerId: string | null; setsP1: number; setsP2: number } {
  let setsP1 = 0
  let setsP2 = 0
  for (const s of sets) {
    if (s.p1 > s.p2) setsP1++
    else if (s.p2 > s.p1) setsP2++
  }
  let winnerId: string | null = null
  if (setsP1 > setsP2) winnerId = player1Id
  else if (setsP2 > setsP1) winnerId = player2Id
  return { winnerId, setsP1, setsP2 }
}

/** Pontos extra por participação (incentivo a jogar), concedido a vencedor e perdedor. */
export const PARTICIPATION_POINTS = 1

/** Valores de Match.resultType usados no fechamento administrativo. */
export const RESULT_TYPE_WO_ADMIN = 'W.O. Admin'
export const RESULT_TYPE_WO_ADMIN_DRAW = 'W.O. Admin (empate)'
export const RESULT_TYPE_RATIFIED = 'Homologado Admin'

type MatchSides = { player1Id: string; player2Id: string | null; player3Id: string | null; player4Id: string | null }

/** IDs do lado vencedor e do lado perdedor de uma partida já decidida (considera duplas). */
export function getMatchSides(match: MatchSides, winnerId: string): { winnerSide: string[]; loserSide: string[] } {
  const winnerSide = [winnerId]
  if (winnerId === match.player1Id && match.player3Id) winnerSide.push(match.player3Id)
  if (winnerId === match.player2Id && match.player4Id) winnerSide.push(match.player4Id)

  const loserSide: string[] = []
  if (winnerId === match.player1Id) {
    if (match.player2Id) loserSide.push(match.player2Id)
    if (match.player4Id) loserSide.push(match.player4Id)
  } else if (winnerId === match.player2Id) {
    if (match.player1Id) loserSide.push(match.player1Id)
    if (match.player3Id) loserSide.push(match.player3Id)
  }
  return { winnerSide, loserSide }
}

/** Pontos de vitória derivados do scoringSystem CBT do evento (fallback 3). */
export function getWinPoints(scoringSystem: unknown): number {
  if (scoringSystem && typeof scoringSystem === 'object') {
    const pt = (scoringSystem as { pointsTable?: Record<string, number> }).pointsTable
    if (pt) {
      return pt['VITÓRIA'] ?? pt['W'] ?? pt['WIN'] ?? 3
    }
  }
  return 3
}

/**
 * Evento em regime de PLAYOFF: pontuação plana por partida disputada, sem ponto de
 * participação separado. `scoringSystem = { mode: "PLAYOFF", winPoints, lossPoints }`.
 * Vencedor leva winPoints; perdedor leva lossPoints (0 em W.O. Admin — ver
 * computeExpectedPoints). Retorna null para eventos que não são playoff.
 */
export function getPlayoffScoring(scoringSystem: unknown): { win: number; loss: number } | null {
  if (scoringSystem && typeof scoringSystem === 'object') {
    const ss = scoringSystem as { mode?: string; winPoints?: number; lossPoints?: number }
    if (ss.mode === 'PLAYOFF' && typeof ss.winPoints === 'number' && typeof ss.lossPoints === 'number') {
      return { win: ss.winPoints, loss: ss.lossPoints }
    }
  }
  return null
}

/**
 * Pontos de ranking que UM lado de UMA partida FINISHED vale — fonte única usada tanto
 * pelo recálculo (computeExpectedPoints) quanto pelas notificações do confirm-score.
 *  - PLAYOFF: vencedor winPoints, perdedor lossPoints (0 se W.O. Admin).
 *  - Normal: vencedor winPoints + participação; perdedor participação.
 *  - W.O. Admin normal: vencedor winPoints (sem participação); perdedor 0.
 */
export function sideMatchPoints(
  scoringSystem: unknown,
  opts: { isWinner: boolean; isAdminScore: boolean },
): number {
  const playoff = getPlayoffScoring(scoringSystem)
  if (playoff) return opts.isWinner ? playoff.win : opts.isAdminScore ? 0 : playoff.loss

  const winPoints = getWinPoints(scoringSystem)
  if (opts.isAdminScore) return opts.isWinner ? winPoints : 0
  return opts.isWinner ? winPoints + PARTICIPATION_POINTS : PARTICIPATION_POINTS
}

export function isValidSet(s: SetScore): boolean {
  return Number.isFinite(s.p1) && Number.isFinite(s.p2) && s.p1 >= 0 && s.p2 >= 0 && !(s.p1 === 0 && s.p2 === 0)
}

/**
 * Mantém apenas os sets até a partida ser decidida (melhor de 3).
 * Se um jogador vence os 2 primeiros sets (2x0), o 3º é descartado.
 */
export function trimToDecided(sets: SetScore[]): SetScore[] {
  let p1 = 0
  let p2 = 0
  const result: SetScore[] = []
  for (const s of sets) {
    result.push(s)
    if (s.p1 > s.p2) p1++
    else if (s.p2 > s.p1) p2++
    if (p1 === 2 || p2 === 2) break
  }
  return result
}
