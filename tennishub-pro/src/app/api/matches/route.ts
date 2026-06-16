import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyAll, MSG } from '@/lib/notifications'
import { emailAll, EMAIL } from '@/lib/email'
import { z } from 'zod'

const proposeSchema = z.object({
  eventId: z.string().min(1),
  opponentId: z.string().min(1),
  scheduledAt: z.string().optional().nullable(),
  courtNumber: z.coerce.number().int().positive().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

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

// Marcar um jogo: o atleta logado propõe partida contra um adversário.
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

  try {
    const data = proposeSchema.parse(await req.json())

    if (data.opponentId === session.user.id) {
      return NextResponse.json({ message: 'Você não pode marcar jogo contra si mesmo' }, { status: 400 })
    }

    const [event, opponent] = await Promise.all([
      prisma.event.findUnique({ where: { id: data.eventId } }),
      prisma.user.findUnique({ where: { id: data.opponentId } }),
    ])
    if (!event) return NextResponse.json({ message: 'Evento não encontrado' }, { status: 404 })
    if (!opponent) return NextResponse.json({ message: 'Adversário não encontrado' }, { status: 404 })

    if (event.matchType !== 'ROUND_ROBIN') {
      return NextResponse.json(
        { message: 'Só é possível marcar jogos em eventos "Todos contra Todos"' },
        { status: 400 },
      )
    }

    // Ambos precisam de inscrição CONFIRMADA no evento
    const [meReg, oppReg] = await Promise.all([
      prisma.eventRegistration.findUnique({
        where: { eventId_userId: { eventId: data.eventId, userId: session.user.id } },
      }),
      prisma.eventRegistration.findUnique({
        where: { eventId_userId: { eventId: data.eventId, userId: data.opponentId } },
      }),
    ])
    if (meReg?.status !== 'CONFIRMED') {
      return NextResponse.json({ message: 'Sua inscrição neste evento ainda não foi confirmada' }, { status: 403 })
    }
    if (oppReg?.status !== 'CONFIRMED') {
      return NextResponse.json({ message: 'O adversário não está confirmado neste evento' }, { status: 400 })
    }

    // Sem duplicidade: já existe jogo (ativo ou realizado) entre os dois neste evento?
    const existingMatch = await prisma.match.findFirst({
      where: {
        eventId: data.eventId,
        status: { not: 'CANCELLED' },
        OR: [
          { player1Id: session.user.id, player2Id: data.opponentId },
          { player1Id: data.opponentId, player2Id: session.user.id },
        ],
      },
    })
    if (existingMatch) {
      return NextResponse.json(
        { message: 'Já existe um jogo entre vocês neste evento' },
        { status: 409 },
      )
    }

    const match = await prisma.match.create({
      data: {
        eventId: data.eventId,
        player1Id: session.user.id,
        player2Id: data.opponentId,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        courtNumber: data.courtNumber ?? null,
        status: 'PENDING_OPPONENT',
      },
    })

    // Notifica o adversário sobre o convite (WhatsApp + e-mail)
    const proposerName = session.user.name ?? 'Um atleta'
    await Promise.all([
      notifyAll([{ phone: opponent.whatsapp, message: MSG.matchProposed(proposerName, event.name) }]),
      emailAll([{ to: opponent.email, ...EMAIL.matchProposed(proposerName, event.name) }]),
    ])

    return NextResponse.json(match, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      const zerr = err as unknown as { errors: { message: string }[] }
      return NextResponse.json({ message: zerr.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ message: 'Erro ao marcar jogo' }, { status: 500 })
  }
}
