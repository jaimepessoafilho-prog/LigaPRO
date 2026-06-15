import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { computeWinner, getWinPoints, isValidSet } from '@/lib/match-points'
import { z } from 'zod'

const setSchema = z.object({ p1: z.coerce.number().int().min(0), p2: z.coerce.number().int().min(0) })

const createMatchSchema = z.object({
  eventId: z.string().min(1),
  player1Id: z.string().min(1),
  player2Id: z.string().min(1),
  sets: z.array(setSchema).min(1),
})

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventId = searchParams.get('event')
  const matches = await prisma.match.findMany({
    where: eventId ? { eventId } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      player1: { select: { id: true, name: true } },
      player2: { select: { id: true, name: true } },
      event: { select: { id: true, name: true } },
    },
    take: 100,
  })
  return NextResponse.json(matches)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = createMatchSchema.parse(body)

    if (data.player1Id === data.player2Id) {
      return NextResponse.json({ message: 'Selecione dois atletas diferentes' }, { status: 400 })
    }
    const validSets = data.sets.filter(isValidSet)
    if (validSets.length === 0) {
      return NextResponse.json({ message: 'Informe ao menos um set válido' }, { status: 400 })
    }

    const event = await prisma.event.findUnique({ where: { id: data.eventId } })
    if (!event) return NextResponse.json({ message: 'Evento não encontrado' }, { status: 404 })

    const { winnerId } = computeWinner(validSets, data.player1Id, data.player2Id)
    if (!winnerId) {
      return NextResponse.json({ message: 'O placar não define um vencedor' }, { status: 400 })
    }

    const winPoints = getWinPoints(event.scoringSystem)
    const year = new Date(event.startDate).getFullYear()

    // Transação: cria a partida e credita pontos ao vencedor (acumulando no evento)
    const match = await prisma.$transaction(async (tx) => {
      const created = await tx.match.create({
        data: {
          eventId: data.eventId,
          player1Id: data.player1Id,
          player2Id: data.player2Id,
          sets: validSets,
          winnerId,
          status: 'FINISHED',
        },
      })

      const existing = await tx.rankingPoint.findUnique({
        where: { userId_eventId: { userId: winnerId, eventId: data.eventId } },
      })
      if (existing) {
        await tx.rankingPoint.update({
          where: { id: existing.id },
          data: { points: existing.points + winPoints },
        })
      } else {
        await tx.rankingPoint.create({
          data: { userId: winnerId, eventId: data.eventId, points: winPoints, position: 0, year },
        })
      }
      return created
    })

    return NextResponse.json(match, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      const zerr = err as unknown as { errors: { message: string }[] }
      return NextResponse.json({ message: zerr.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ message: 'Erro ao lançar resultado' }, { status: 500 })
  }
}
