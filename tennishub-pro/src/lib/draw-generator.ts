// Gerador de chaves CBT com suporte a duplas, seeds, byes e proteção de sorteio
import { CBT_RULES } from './cbt-rules'

export interface DrawEntry {
  userId: string
  name: string
  partnerId?: string
  partnerName?: string
  seed?: number // 1..4 = cabeça de chave
  ranking?: number
  club?: string
}

export interface DrawSlot {
  position: number
  entry: DrawEntry | null
  isBye: boolean
}

export interface DrawAuditLog {
  eventId: string
  generatedAt: string
  totalEntries: number
  drawSize: number
  seedsPlaced: string[]
  shuffleSeed: number
  conflicts: string[]
}

export interface GeneratedDraw {
  slots: DrawSlot[]
  drawSize: number
  byeCount: number
  seedCount: number
  auditLog: DrawAuditLog
}

type Slot = DrawEntry | null | 'BYE'

function shuffleArray<T>(array: T[]): { result: T[]; seed: number } {
  const arr = [...array]
  const randomSeed = Date.now()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return { result: arr, seed: randomSeed }
}

export function generateDraw(
  entries: DrawEntry[],
  eventId: string,
  options: { preventPartnerClash?: boolean; preventClubClash?: boolean } = {},
): GeneratedDraw {
  const drawSize = CBT_RULES.getDrawSize(entries.length)
  const byeCount = drawSize - entries.length
  const conflicts: string[] = []

  const seeds = entries
    .filter((e) => e.seed && e.seed >= 1 && e.seed <= 4)
    .sort((a, b) => (a.seed ?? 99) - (b.seed ?? 99))
  const nonSeeds = entries.filter((e) => !e.seed)

  const { result: shuffled, seed: shuffleSeed } = shuffleArray(nonSeeds)
  const slots: Slot[] = new Array(drawSize).fill(null)

  // Seeds: 1 no topo, 2 no fundo, 3 e 4 nos quartos restantes
  if (seeds[0]) slots[0] = seeds[0]
  if (seeds[1]) slots[drawSize - 1] = seeds[1]

  const quarterA = Math.floor(drawSize / 4)
  const quarterB = Math.floor((3 * drawSize) / 4)
  const { result: seedSlots34 } = shuffleArray([quarterA, quarterB])
  if (seeds[2]) slots[seedSlots34[0]] = seeds[2]
  if (seeds[3]) slots[seedSlots34[1]] = seeds[3]

  // Byes — prioridade nas posições adjacentes aos seeds
  let byesPlaced = 0
  const seedPositions = [0, drawSize - 1, seedSlots34[0], seedSlots34[1]]
  for (const seedPos of seedPositions) {
    if (byesPlaced >= byeCount) break
    for (const adj of [seedPos + 1, seedPos - 1]) {
      if (byesPlaced >= byeCount) break
      if (adj >= 0 && adj < drawSize && slots[adj] === null) {
        slots[adj] = 'BYE'
        byesPlaced++
      }
    }
  }
  for (let i = 0; i < slots.length && byesPlaced < byeCount; i++) {
    if (slots[i] === null) {
      slots[i] = 'BYE'
      byesPlaced++
    }
  }

  // Preencher restantes com não-seeds embaralhados
  let idx = 0
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] === null && idx < shuffled.length) slots[i] = shuffled[idx++]
  }

  // Resolver conflitos (parceiros / mesmo clube na 1ª rodada)
  if (options.preventPartnerClash || options.preventClubClash) {
    for (let i = 0; i < slots.length - 1; i += 2) {
      const a = slots[i]
      const b = slots[i + 1]
      if (!a || !b || a === 'BYE' || b === 'BYE') continue
      const ea = a as DrawEntry
      const eb = b as DrawEntry
      const partnerClash = options.preventPartnerClash && hasPartnerConflict(ea, eb)
      const clubClash = options.preventClubClash && !!ea.club && ea.club === eb.club
      if (partnerClash || clubClash) {
        conflicts.push(`Conflito (${partnerClash ? 'parceiros' : 'mesmo clube'}) na posição ${i} — swap`)
        for (let j = i + 2; j < slots.length; j++) {
          const candidate = slots[j]
          if (!candidate || candidate === 'BYE') continue
          const ec = candidate as DrawEntry
          const still = hasPartnerConflict(ea, ec) || (!!ea.club && ea.club === ec.club)
          if (!still) {
            ;[slots[i + 1], slots[j]] = [slots[j], slots[i + 1]]
            break
          }
        }
      }
    }
  }

  const finalSlots: DrawSlot[] = slots.map((s, i) => ({
    position: i + 1,
    entry: s === 'BYE' || s === null ? null : (s as DrawEntry),
    isBye: s === 'BYE',
  }))

  const auditLog: DrawAuditLog = {
    eventId,
    generatedAt: new Date().toISOString(),
    totalEntries: entries.length,
    drawSize,
    seedsPlaced: seeds.map((s) => s.userId),
    shuffleSeed,
    conflicts,
  }

  return { slots: finalSlots, drawSize, byeCount, seedCount: seeds.length, auditLog }
}

/** Dois atletas são parceiros de duplas (não devem se enfrentar na 1ª rodada) */
export function hasPartnerConflict(a: DrawEntry, b: DrawEntry): boolean {
  if (!a || !b) return false
  return (!!a.partnerId && a.partnerId === b.userId) || (!!b.partnerId && b.partnerId === a.userId)
}

/** Número de cabeças de chave conforme tamanho (padrão CBT) */
export function getSeedCount(drawSize: number): number {
  const map: Record<number, number> = { 4: 2, 8: 2, 16: 4, 32: 4, 64: 8, 128: 16 }
  return map[drawSize] ?? 4
}

/** Pontuação individual em duplas (CBT): % dos pontos do simples, dividido entre os 2 */
export function calcDoublesPointsPerAthlete(singlesPointsForPosition: number, category: string): number {
  const pct = ['OPEN', 'A'].includes(category) ? 0.6 : 0.5
  return Math.floor((singlesPointsForPosition * pct) / 2)
}
