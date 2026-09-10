/**
 * Snapshot do ranking de um evento IGNORANDO os placares inseridos pelo ADMIN
 * (W.O. Admin — matches com isAdminScore = true).
 *
 * Serve para registrar a classificação "real" (só jogos efetivamente disputados e
 * confirmados pelos atletas) antes de o ADMIN fechar administrativamente os jogos
 * que não aconteceram.
 *
 * Uso:
 *   npm run ranking:sem-wo                         # evento cujo nome casa com o padrão abaixo
 *   npm run ranking:sem-wo -- "Ranking MTC 2026 Etapa 1"   # nome (ou trecho) do evento
 *   npm run ranking:sem-wo -- <eventId>            # id exato do evento
 *
 * Gera dois arquivos na raiz de tennishub-pro:
 *   ranking-sem-wo-<slug>-<data>.md    (tabela pronta para arquivar)
 *   ranking-sem-wo-<slug>-<data>.json  (dados crus)
 */
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { getMatchSides, getWinPoints, PARTICIPATION_POINTS } from '../src/lib/match-points'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

type SetScore = { p1: number; p2: number }

const DEFAULT_EVENT_QUERY = 'MTC 2026 Etapa 1'

function classBand(position: number): 'A' | 'B' | 'C' | 'D' | 'E' | null {
  if (position <= 4) return 'A'
  if (position <= 8) return 'B'
  if (position <= 12) return 'C'
  if (position <= 16) return 'D'
  if (position <= 20) return 'E'
  return null
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function pad(s: string | number, n: number): string {
  const str = String(s)
  return str.length >= n ? str : str + ' '.repeat(n - str.length)
}
function padL(s: string | number, n: number): string {
  const str = String(s)
  return str.length >= n ? str : ' '.repeat(n - str.length) + str
}
function sgn(n: number): string {
  return n > 0 ? `+${n}` : String(n)
}

async function main() {
  const arg = process.argv.slice(2).join(' ').trim() || DEFAULT_EVENT_QUERY

  const event =
    (await prisma.event.findUnique({ where: { id: arg } }).catch(() => null)) ??
    (await prisma.event.findFirst({
      where: { name: { contains: arg, mode: 'insensitive' } },
      orderBy: { startDate: 'desc' },
    }))

  if (!event) {
    console.error(`❌ Nenhum evento encontrado para "${arg}"`)
    const all = await prisma.event.findMany({ select: { id: true, name: true }, orderBy: { startDate: 'desc' } })
    console.error('Eventos disponíveis:')
    for (const e of all) console.error(`  - ${e.name}  (${e.id})`)
    process.exit(1)
  }

  const year = new Date(event.startDate).getFullYear()
  const winPoints = getWinPoints(event.scoringSystem)

  // Participantes confirmados (mesma base do ranking do app)
  const regs = await prisma.eventRegistration.findMany({
    where: { eventId: event.id, status: 'CONFIRMED' },
    include: { user: { select: { id: true, name: true } } },
  })
  const athletes = regs.map((r) => r.user)
  const idSet = new Set(athletes.map((a) => a.id))

  // Todos os jogos FINISHED do evento, separando os inseridos pelo ADMIN
  const finishedAll = await prisma.match.findMany({
    where: { eventId: event.id, status: 'FINISHED', winnerId: { not: null } },
    select: {
      id: true, player1Id: true, player2Id: true, player3Id: true, player4Id: true,
      winnerId: true, sets: true, isAdminScore: true, resultType: true,
      player1: { select: { name: true } }, player2: { select: { name: true } },
    },
  })
  const excluded = finishedAll.filter((m) => m.isAdminScore)
  const counted = finishedAll.filter((m) => !m.isAdminScore)

  const points = new Map<string, number>()
  const wins = new Map<string, number>()
  const matches = new Map<string, number>()
  const setDiff = new Map<string, number>()
  const gameDiff = new Map<string, number>()
  const bump = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v)

  for (const m of counted) {
    const sets = (m.sets as unknown as SetScore[]) ?? []
    let sP1 = 0, sP2 = 0, gP1 = 0, gP2 = 0
    for (const s of sets) {
      gP1 += s.p1; gP2 += s.p2
      if (s.p1 > s.p2) sP1++
      else if (s.p2 > s.p1) sP2++
    }
    const { winnerSide, loserSide } = getMatchSides(m, m.winnerId!)
    for (const uid of winnerSide) bump(points, uid, winPoints + PARTICIPATION_POINTS)
    for (const uid of loserSide) bump(points, uid, PARTICIPATION_POINTS)

    const sideA = [m.player1Id, m.player3Id].filter(Boolean) as string[]
    for (const uid of [m.player1Id, m.player2Id, m.player3Id, m.player4Id].filter(Boolean) as string[]) {
      const onA = sideA.includes(uid)
      bump(matches, uid, 1)
      bump(setDiff, uid, onA ? sP1 - sP2 : sP2 - sP1)
      bump(gameDiff, uid, onA ? gP1 - gP2 : gP2 - gP1)
      if (m.winnerId === uid || winnerSide.includes(uid)) bump(wins, uid, 1)
    }
  }

  const ranked = athletes
    .map((a) => ({
      userId: a.id,
      name: a.name,
      totalPoints: points.get(a.id) ?? 0,
      wins: wins.get(a.id) ?? 0,
      matches: matches.get(a.id) ?? 0,
      setDiff: setDiff.get(a.id) ?? 0,
      gameDiff: gameDiff.get(a.id) ?? 0,
    }))
    .sort(
      (x, y) =>
        y.totalPoints - x.totalPoints ||
        y.wins - x.wins ||
        y.setDiff - x.setDiff ||
        y.gameDiff - x.gameDiff ||
        x.name.localeCompare(y.name, 'pt-BR'),
    )
    .map((r, i) => ({ position: i + 1, classe: classBand(i + 1), ...r }))

  // ── Saída no console ──
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  console.log(`\nRANKING (sem W.O. Admin) — ${event.name}`)
  console.log(`Gerado em ${stamp} · ${athletes.length} atletas · ${counted.length} jogos contados · ${excluded.length} jogos W.O. Admin ignorados\n`)
  const header = `${pad('#', 5)}${pad('ATLETA', 34)}${padL('PTS', 5)}${padL('VIT', 5)}${padL('JOGOS', 7)}${padL('S.SETS', 8)}${padL('S.GAMES', 9)}  CLASSE`
  console.log(header)
  console.log('-'.repeat(header.length))
  for (const r of ranked) {
    console.log(
      `${pad(`${r.classe ?? ''}${r.position}`, 5)}${pad(r.name.slice(0, 33), 34)}${padL(r.totalPoints, 5)}${padL(r.wins, 5)}${padL(r.matches, 7)}${padL(sgn(r.setDiff), 8)}${padL(sgn(r.gameDiff), 9)}  ${r.classe ?? '—'}`,
    )
  }

  if (excluded.length) {
    console.log(`\nJogos ignorados (W.O. Admin / isAdminScore):`)
    for (const m of excluded) {
      const s = (m.sets as unknown as SetScore[]) ?? []
      console.log(`  - ${m.player1?.name} vs ${m.player2?.name}  ${s.map((x) => `${x.p1}/${x.p2}`).join(' ')}  [${m.resultType ?? 'admin'}]`)
    }
  }

  // ── Arquivos ──
  const slug = slugify(event.name)
  const date = new Date().toISOString().slice(0, 10)
  const base = `ranking-sem-wo-${slug}-${date}`

  const md = [
    `# Ranking (sem W.O. Admin) — ${event.name}`,
    ``,
    `Snapshot gerado em **${stamp}** — classificação considerando **apenas jogos disputados e confirmados pelos atletas**.`,
    `${excluded.length} jogo(s) com placar inserido pelo ADMIN (W.O. Admin) foram ignorados.`,
    ``,
    `| # | Atleta | Pts | Vit | Jogos | S.Sets | S.Games | Classe |`,
    `|---|--------|----:|----:|------:|-------:|--------:|:------:|`,
    ...ranked.map(
      (r) => `| ${r.classe ?? ''}${r.position} | ${r.name} | ${r.totalPoints} | ${r.wins} | ${r.matches} | ${sgn(r.setDiff)} | ${sgn(r.gameDiff)} | ${r.classe ?? '—'} |`,
    ),
    ``,
    ...(excluded.length
      ? [
          `## Jogos ignorados (W.O. Admin)`,
          ``,
          ...excluded.map((m) => {
            const s = (m.sets as unknown as SetScore[]) ?? []
            return `- ${m.player1?.name} vs ${m.player2?.name} — ${s.map((x) => `${x.p1}/${x.p2}`).join(' ')} (${m.resultType ?? 'admin'})`
          }),
          ``,
        ]
      : []),
    `> Critério de desempate: pontos → vitórias → saldo de sets → saldo de games → nome (ATP).`,
    `> Classes por faixa de 4: A 1–4 · B 5–8 · C 9–12 · D 13–16 · E 17–20.`,
    ``,
  ].join('\n')

  writeFileSync(`${base}.md`, md, 'utf8')
  writeFileSync(
    `${base}.json`,
    JSON.stringify(
      { event: { id: event.id, name: event.name, year }, generatedAt: new Date().toISOString(), winPoints, countedMatches: counted.length, excludedMatches: excluded.map((m) => m.id), ranking: ranked },
      null,
      2,
    ),
    'utf8',
  )
  console.log(`\n✅ Arquivos gravados:\n   tennishub-pro/${base}.md\n   tennishub-pro/${base}.json\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
