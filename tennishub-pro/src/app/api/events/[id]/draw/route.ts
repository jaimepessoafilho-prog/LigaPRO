// Geração e consulta da chave do torneio (mata-mata)
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { generateDraw, getSeedCount, type DrawEntry } from '@/lib/draw-generator'

type DrawPhase =
  | 'GROUP_STAGE' | 'ROUND_OF_64' | 'ROUND_OF_32' | 'ROUND_OF_16'
  | 'QUARTER_FINALS' | 'SEMI_FINALS' | 'FINAL' | 'THIRD_PLACE'

function firstPhase(drawSize: number): DrawPhase {
  const map: Record<number, DrawPhase> = {
    64: 'ROUND_OF_64', 32: 'ROUND_OF_32', 16: 'ROUND_OF_16',
    8: 'QUARTER_FINALS', 4: 'SEMI_FINALS', 2: 'FINAL',
  }
  return map[drawSize] ?? 'ROUND_OF_64'
}

// POST — gera a chave (admin)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const { id: eventId } = await params
  const body = await req.json().catch(() => ({}))
  const preventPartnerClash = body.preventPartnerClash ?? true
  const preventClubClash = body.preventClubClash ?? false

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ message: 'Evento não encontrado' }, { status: 404 })
  if (event.matchType === 'ROUND_ROBIN') {
    return NextResponse.json({ message: 'Eventos "Todos contra Todos" não usam chaveamento' }, { status: 400 })
  }

  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId, status: 'CONFIRMED' },
    include: { user: { select: { id: true, name: true } } },
  })
  if (registrations.length < 2) {
    return NextResponse.json({ message: 'Mínimo de 2 atletas confirmados para gerar a chave' }, { status: 400 })
  }

  // Seeds automáticos pelo ranking do ano
  const year = new Date().getFullYear()
  const rankingPoints = await prisma.rankingPoint.groupBy({
    by: ['userId'],
    where: { year, userId: { in: registrations.map((r) => r.userId) } },
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
  })
  const rankingMap = new Map(rankingPoints.map((r, i) => [r.userId, i + 1]))
  const seedCount = getSeedCount(registrations.length)

  const entries: DrawEntry[] = registrations.map((reg) => {
    const rankPos = rankingMap.get(reg.userId)
    const seed = rankPos && rankPos <= seedCount ? rankPos : undefined
    return { userId: reg.user.id, name: reg.user.name, partnerId: reg.partnerId ?? undefined, seed, ranking: rankPos }
  })

  const draw = generateDraw(entries, eventId, { preventPartnerClash, preventClubClash })

  const savedDraw = await prisma.draw.create({
    data: { eventId, round: 1, phase: firstPhase(draw.drawSize) },
  })

  // Cria as partidas da 1ª rodada
  const ops = []
  for (let i = 0; i < draw.slots.length; i += 2) {
    const a = draw.slots[i]
    const b = draw.slots[i + 1]
    if (!a || !b) continue
    if (a.isBye && b.isBye) continue

    if (a.isBye || b.isBye) {
      // Bye: o jogador real avança (WALKOVER)
      const adv = a.isBye ? b.entry : a.entry
      if (!adv) continue
      ops.push(
        prisma.match.create({
          data: {
            eventId, drawId: savedDraw.id,
            player1Id: adv.userId, player2Id: null,
            player3Id: adv.partnerId ?? null,
            status: 'WALKOVER', walkover: true, winnerId: adv.userId, sets: [],
          },
        }),
      )
    } else if (a.entry && b.entry) {
      ops.push(
        prisma.match.create({
          data: {
            eventId, drawId: savedDraw.id,
            player1Id: a.entry.userId, player2Id: b.entry.userId,
            player3Id: a.entry.partnerId ?? null, player4Id: b.entry.partnerId ?? null,
            status: 'SCHEDULED', sets: [],
          },
        }),
      )
    }
  }
  await prisma.$transaction(ops)

  await prisma.event.update({ where: { id: eventId }, data: { status: 'IN_PROGRESS' } })

  return NextResponse.json({
    drawId: savedDraw.id,
    drawSize: draw.drawSize,
    byeCount: draw.byeCount,
    seedCount: draw.seedCount,
    auditLog: draw.auditLog,
    message: `Chave de ${draw.drawSize} gerada com sucesso`,
  })
}

// GET — consulta a chave gerada
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const draws = await prisma.draw.findMany({
    where: { eventId: id },
    include: {
      matches: {
        include: {
          player1: { select: { id: true, name: true } },
          player2: { select: { id: true, name: true } },
          player3: { select: { id: true, name: true } },
          player4: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { round: 'asc' },
  })
  return NextResponse.json(draws)
}
