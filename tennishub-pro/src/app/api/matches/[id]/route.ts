import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeWinner, getWinPoints, isValidSet } from '@/lib/match-points'
import { notifyAll, MSG } from '@/lib/notifications'
import { emailAll, EMAIL } from '@/lib/email'
import { z } from 'zod'

type SetScore = { p1: number; p2: number }

const setSchema = z.object({ p1: z.coerce.number().int().min(0), p2: z.coerce.number().int().min(0) })

const actionSchema = z.object({
  action: z.enum(['confirm-match', 'decline', 'submit-score', 'confirm-score', 'contest-score']),
  sets: z.array(setSchema).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const me = session.user.id

  let body: z.infer<typeof actionSchema>
  try {
    body = actionSchema.parse(await req.json())
  } catch {
    return NextResponse.json({ message: 'Ação inválida' }, { status: 400 })
  }

  const match = await prisma.match.findUnique({ where: { id } })
  if (!match) return NextResponse.json({ message: 'Partida não encontrada' }, { status: 404 })

  const isProposer = match.player1Id === me
  const isOpponent = match.player2Id === me
  const isParticipant = isProposer || isOpponent
  if (!isParticipant) {
    return NextResponse.json({ message: 'Você não participa desta partida' }, { status: 403 })
  }

  // Dados para notificações (nomes, telefones, nome do evento)
  const [p1, p2, ev] = await Promise.all([
    prisma.user.findUnique({ where: { id: match.player1Id }, select: { name: true, whatsapp: true, email: true } }),
    match.player2Id
      ? prisma.user.findUnique({ where: { id: match.player2Id }, select: { name: true, whatsapp: true, email: true } })
      : Promise.resolve(null),
    prisma.event.findUnique({ where: { id: match.eventId }, select: { name: true } }),
  ])
  const eventName = ev?.name ?? 'evento'
  const myName = (isProposer ? p1?.name : p2?.name) ?? 'Um atleta'

  switch (body.action) {
    // Adversário confirma que o jogo vai ocorrer
    case 'confirm-match': {
      if (!isOpponent) return NextResponse.json({ message: 'Apenas o adversário confirma o jogo' }, { status: 403 })
      if (match.status !== 'PENDING_OPPONENT') return NextResponse.json({ message: 'Jogo não está aguardando confirmação' }, { status: 409 })
      const updated = await prisma.match.update({ where: { id }, data: { status: 'SCHEDULED' } })
      await Promise.all([
        notifyAll([{ phone: p1?.whatsapp, message: MSG.matchConfirmed(myName, eventName) }]),
        emailAll([{ to: p1?.email, ...EMAIL.matchConfirmed(myName, eventName) }]),
      ])
      return NextResponse.json(updated)
    }

    // Adversário recusa o jogo
    case 'decline': {
      if (!isOpponent) return NextResponse.json({ message: 'Apenas o adversário pode recusar' }, { status: 403 })
      if (match.status !== 'PENDING_OPPONENT') return NextResponse.json({ message: 'Jogo não pode mais ser recusado' }, { status: 409 })
      const updated = await prisma.match.update({ where: { id }, data: { status: 'CANCELLED' } })
      await notifyAll([{ phone: p1?.whatsapp, message: MSG.matchDeclined(myName, eventName) }])
      return NextResponse.json(updated)
    }

    // Um participante lança o placar
    case 'submit-score': {
      if (match.status !== 'SCHEDULED' && match.status !== 'CONTESTED') {
        return NextResponse.json({ message: 'Jogo não está liberado para lançar placar' }, { status: 409 })
      }
      const sets = (body.sets ?? []).filter(isValidSet)
      if (sets.length === 0) return NextResponse.json({ message: 'Informe ao menos um set válido' }, { status: 400 })
      const { winnerId } = computeWinner(sets, match.player1Id, match.player2Id ?? '')
      if (!winnerId) return NextResponse.json({ message: 'O placar não define um vencedor' }, { status: 400 })

      const updated = await prisma.match.update({
        where: { id },
        data: { sets, winnerId, scoreSubmittedById: me, status: 'PENDING_SCORE' },
      })
      const otherPhone = isProposer ? p2?.whatsapp : p1?.whatsapp
      const otherEmail = isProposer ? p2?.email : p1?.email
      await Promise.all([
        notifyAll([{ phone: otherPhone, message: MSG.scoreSubmitted(myName, sets, eventName) }]),
        emailAll([{ to: otherEmail, ...EMAIL.scoreSubmitted(myName, sets, eventName) }]),
      ])
      return NextResponse.json(updated)
    }

    // Adversário (quem NÃO lançou) confirma o placar → credita pontos
    case 'confirm-score': {
      if (match.status !== 'PENDING_SCORE') return NextResponse.json({ message: 'Não há placar para confirmar' }, { status: 409 })
      if (match.scoreSubmittedById === me) {
        return NextResponse.json({ message: 'Aguarde o adversário confirmar o placar' }, { status: 403 })
      }
      if (!match.winnerId) return NextResponse.json({ message: 'Partida sem vencedor definido' }, { status: 400 })

      const event = await prisma.event.findUnique({ where: { id: match.eventId } })
      const winPoints = getWinPoints(event?.scoringSystem)
      const year = event ? new Date(event.startDate).getFullYear() : new Date().getFullYear()
      const winnerId = match.winnerId

      const updated = await prisma.$transaction(async (tx) => {
        const m = await tx.match.update({ where: { id }, data: { status: 'FINISHED' } })
        const existing = await tx.rankingPoint.findUnique({
          where: { userId_eventId: { userId: winnerId, eventId: match.eventId } },
        })
        if (existing) {
          await tx.rankingPoint.update({ where: { id: existing.id }, data: { points: existing.points + winPoints } })
        } else {
          await tx.rankingPoint.create({
            data: { userId: winnerId, eventId: match.eventId, points: winPoints, position: 0, year },
          })
        }
        return m
      })

      const winnerName = (winnerId === match.player1Id ? p1?.name : p2?.name) ?? 'Vencedor'
      const sets = (match.sets as unknown as SetScore[]) ?? []
      const resultMsg = MSG.resultConfirmed(winnerName, sets, winPoints, eventName)
      const resultEmail = EMAIL.resultConfirmed(winnerName, sets, winPoints, eventName)
      await Promise.all([
        notifyAll([
          { phone: p1?.whatsapp, message: resultMsg },
          { phone: p2?.whatsapp, message: resultMsg },
        ]),
        emailAll([
          { to: p1?.email, ...resultEmail },
          { to: p2?.email, ...resultEmail },
        ]),
      ])
      return NextResponse.json(updated)
    }

    // Adversário contesta o placar → volta para lançamento
    case 'contest-score': {
      if (match.status !== 'PENDING_SCORE') return NextResponse.json({ message: 'Não há placar para contestar' }, { status: 409 })
      if (match.scoreSubmittedById === me) {
        return NextResponse.json({ message: 'Você lançou este placar; aguarde o adversário' }, { status: 403 })
      }
      const submitterPhone = match.scoreSubmittedById === match.player1Id ? p1?.whatsapp : p2?.whatsapp
      const submitterEmail = match.scoreSubmittedById === match.player1Id ? p1?.email : p2?.email
      const updated = await prisma.match.update({
        where: { id },
        data: { status: 'CONTESTED', sets: [], winnerId: null, scoreSubmittedById: null },
      })
      await Promise.all([
        notifyAll([{ phone: submitterPhone, message: MSG.scoreContested(myName, eventName) }]),
        emailAll([{ to: submitterEmail, ...EMAIL.scoreContested(myName, eventName) }]),
      ])
      return NextResponse.json(updated)
    }

    default:
      return NextResponse.json({ message: 'Ação desconhecida' }, { status: 400 })
  }
}
