// Regras e pontuação baseadas nos regulamentos da CBT (Confederação Brasileira de Tênis)

export type CBTCategory = 'OPEN' | 'A' | 'B' | 'C' | 'D'
export type CBTFormat = 'SINGLES' | 'DOUBLES'
export type CBTMatchType = 'ELIMINATION' | 'ROUND_ROBIN' | 'HYBRID'

export interface CBTScoringSystem {
  format: CBTFormat
  matchType: CBTMatchType
  category: CBTCategory
  setsToWin: number
  tieBreakFinalSet: boolean
  superTieBreak: boolean
  pointsTable: Record<string, number>
  rules: string[]
  description: string
}

const ELIMINATION_POINTS: Record<CBTCategory, Record<string, number>> = {
  OPEN: { W: 100, F: 70, SF: 45, QF: 25, R16: 14, R32: 7, R64: 3, R128: 1 },
  A: { W: 75, F: 50, SF: 32, QF: 18, R16: 10, R32: 5, R64: 2 },
  B: { W: 50, F: 35, SF: 22, QF: 12, R16: 7, R32: 3 },
  C: { W: 30, F: 20, SF: 13, QF: 7, R16: 4 },
  D: { W: 15, F: 10, SF: 6, QF: 3, R16: 1 },
}

const ROUND_ROBIN_POINTS = { WIN: 3, LOSS: 0, WALKOVER_WIN: 1 }

export const CBT_RULES = {
  ELIMINATION_POINTS,
  ROUND_ROBIN_POINTS,

  getScoring(format: CBTFormat, matchType: CBTMatchType, category: CBTCategory): CBTScoringSystem {
    const isDoubles = format === 'DOUBLES'

    const base: CBTScoringSystem = {
      format,
      matchType,
      category,
      setsToWin: 2,
      tieBreakFinalSet: false,
      superTieBreak: false,
      pointsTable: {},
      rules: [],
      description: '',
    }

    if (category === 'D' || category === 'C') {
      base.superTieBreak = true
      base.rules.push('3º set substituído por Super Tie-Break (10 pontos)')
    } else {
      base.tieBreakFinalSet = category === 'B'
      if (base.tieBreakFinalSet) base.rules.push('3º set com tie-break em 7×6')
    }

    if (matchType === 'ELIMINATION') {
      base.pointsTable = ELIMINATION_POINTS[category]
      base.description = `Torneio eliminatório ${isDoubles ? 'de duplas' : 'simples'} — ${category}`
      base.rules.push('Partidas em melhor de 3 sets')
      base.rules.push('Tie-break em 6×6 em todos os sets (exceto 3º conforme categoria)')
    }

    if (matchType === 'ROUND_ROBIN') {
      base.pointsTable = {
        VITÓRIA: ROUND_ROBIN_POINTS.WIN,
        DERROTA: ROUND_ROBIN_POINTS.LOSS,
        W_O: ROUND_ROBIN_POINTS.WALKOVER_WIN,
      }
      base.description = `Fase de grupos ${isDoubles ? 'de duplas' : 'simples'} — ${category}`
      base.rules.push('3 pontos por vitória, 0 por derrota')
      base.rules.push('Desempate: saldo de games, depois de pontos')
    }

    if (matchType === 'HYBRID') {
      base.pointsTable = { ...ROUND_ROBIN_POINTS, ...ELIMINATION_POINTS[category] }
      base.description = `Grupos + Eliminatórias ${isDoubles ? 'duplas' : 'simples'} — ${category}`
      base.rules.push('Fase de grupos: 3 pontos por vitória')
      base.rules.push('Classificados avançam para chaves eliminatórias')
    }

    if (isDoubles) {
      base.rules.push('Parceiro deve ser confirmado na inscrição')
      base.rules.push('Pontuação dividida igualmente entre os parceiros')
    }

    base.rules.push('Código de conduta da CBT aplicável a todos os jogadores')

    return base
  },

  DRAW_SIZES: [4, 8, 16, 32, 64, 128] as const,
  getDrawSize(participants: number): number {
    return this.DRAW_SIZES.find((s) => s >= participants) ?? 128
  },

  SEEDS_BY_DRAW: { 4: 2, 8: 2, 16: 4, 32: 4, 64: 8, 128: 16 } as Record<number, number>,

  PHASE_LABELS: {
    R128: 'Primeira Rodada',
    R64: 'Segunda Rodada',
    R32: 'Terceira Rodada',
    R16: 'Oitavas de Final',
    QF: 'Quartas de Final',
    SF: 'Semifinais',
    F: 'Final',
  } as Record<string, string>,
}

// Rótulos legíveis para a UI
export const FORMAT_LABELS: Record<CBTFormat, string> = {
  SINGLES: 'Simples',
  DOUBLES: 'Duplas',
}

export const MATCH_TYPE_LABELS: Record<CBTMatchType, string> = {
  ELIMINATION: 'Mata-Mata',
  ROUND_ROBIN: 'Todos contra Todos',
  HYBRID: 'Grupos + Eliminatórias',
}

export const DRAW_TYPE_LABELS: Record<string, string> = {
  SEEDED: 'Com Cabeças',
  RANDOM: 'Sorteio',
  RANKING: 'Por Ranking',
}

export const CATEGORY_LABELS: Record<CBTCategory, string> = {
  OPEN: 'Aberto',
  A: 'Categoria A',
  B: 'Categoria B',
  C: 'Categoria C',
  D: 'Categoria D',
}
