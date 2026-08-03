import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { computeWinner, isValidSet, trimToDecided } from '@/lib/match-points'
import { recomputeAllPoints } from '@/lib/ranking-recompute'
import { z } from 'zod'

const setSchema = z.object({ p1: z.coerce.number().int().min(0), p2: z.coerce.number().int().min(0) })

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('correct-score'), sets: z.array(setSchema).min(1) }),
  z.object({ action: z.literal('wo-admin'), winnerId: z.string().min(1) }),
])

// Fechamento administrativo de placar (RF-03/RF-04): correção de jogo já realizado
// ou W.O. Admin (6/0 6/0) para jogo que não aconteceu. Admin-only.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const { id } = await params
  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch {
    return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
  }

  const match = await prisma.match.findUnique({ where: { id } })
  if (!match) return NextResponse.json({ message: 'Partida não encontrada' }, { status: 404 })
  if (!match.player2Id) return NextResponse.json({ message: 'Partida sem adversário definido' }, { status: 400 })

  const event = await prisma.event.findUnique({ where: { id: match.eventId }, select: { finishedAt: true } })
  if (event?.finishedAt) {
    return NextResponse.json({ message: 'Evento já encerrado — placares não podem mais ser alterados' }, { status: 409 })
  }

  if (body.action === 'correct-score') {
    if (match.status !== 'FINISHED') {
      return NextResponse.json({ message: 'Só é possível corrigir placar de jogo já finalizado' }, { status: 409 })
    }
    const sets = trimToDecided(body.sets.filter(isValidSet))
    if (sets.length === 0) return NextResponse.json({ message: 'Informe ao menos um set válido' }, { status: 400 })
    const { winnerId } = computeWinner(sets, match.player1Id, match.player2Id)
    if (!winnerId) return NextResponse.json({ message: 'O placar não define um vencedor' }, { status: 400 })

    await prisma.match.update({
      where: { id },
      data: {
        sets,
        winnerId,
        isAdminScore: false,
        resultType: null,
        scoreEditedById: session.user.id,
        scoreEditedAt: new Date(),
      },
    })
  } else {
    if (match.status === 'FINISHED') {
      return NextResponse.json({ message: 'Jogo já tem placar — use a correção de placar' }, { status: 409 })
    }
    const teamA = [match.player1Id, match.player3Id].filter(Boolean) as string[]
    const teamB = [match.player2Id, match.player4Id].filter(Boolean) as string[]
    if (!teamA.includes(body.winnerId) && !teamB.includes(body.winnerId)) {
      return NextResponse.json({ message: 'Vencedor não participa desta partida' }, { status: 400 })
    }
    const winnerOnA = teamA.includes(body.winnerId)
    const winnerId = winnerOnA ? match.player1Id : (match.player2Id as string)
    const sets = [
      { p1: 6, p2: 0 },
      { p1: 6, p2: 0 },
    ].map((s) => (winnerOnA ? s : { p1: s.p2, p2: s.p1 }))

    await prisma.match.update({
      where: { id },
      data: {
        sets,
        winnerId,
        status: 'FINISHED',
        isAdminScore: true,
        resultType: 'W.O. Admin',
        scoreEditedById: session.user.id,
        scoreEditedAt: new Date(),
      },
    })
  }

  await recomputeAllPoints()

  const updated = await prisma.match.findUnique({ where: { id } })
  return NextResponse.json(updated)
}
