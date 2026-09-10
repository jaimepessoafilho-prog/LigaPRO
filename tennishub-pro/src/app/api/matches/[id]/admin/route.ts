import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import { isAdminRole } from '@/lib/nav'
import { computeWinner, isValidSet, trimToDecided, RESULT_TYPE_WO_ADMIN, RESULT_TYPE_WO_ADMIN_DRAW, RESULT_TYPE_RATIFIED } from '@/lib/match-points'
import { recomputeAllPoints } from '@/lib/ranking-recompute'
import { notifyAll, MSG } from '@/lib/notifications'
import { emailAll, EMAIL } from '@/lib/email'
import { z } from 'zod'

type SetScore = { p1: number; p2: number }

const setSchema = z.object({ p1: z.coerce.number().int().min(0), p2: z.coerce.number().int().min(0) })

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('propose-correction'), sets: z.array(setSchema).min(1) }),
  z.object({ action: z.literal('force-apply-correction') }),
  z.object({ action: z.literal('cancel-correction') }),
  z.object({ action: z.literal('ratify-score') }),
  // winnerId ausente = empate técnico (mesmo nº de partidas realizadas): W.O. sem pontuação
  z.object({ action: z.literal('wo-admin'), winnerId: z.string().min(1).optional() }),
])

// Fechamento administrativo de placar (RF-03/RF-04): correção de jogo já realizado
// (agora como PROPOSTA, pendente de anuência das duas partes — ver confirm-correction/
// contest-correction em [id]/route.ts); homologação de placar lançado por um atleta e
// nunca confirmado pelo adversário (ratify-score — instantâneo, conta como jogo
// realizado); ou W.O. Admin (6/0 6/0) para jogo que não aconteceu, também instantâneo.
// Admin-only.
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

  const event = await prisma.event.findUnique({ where: { id: match.eventId }, select: { finishedAt: true, name: true } })
  if (event?.finishedAt) {
    return NextResponse.json({ message: 'Evento já encerrado — placares não podem mais ser alterados' }, { status: 409 })
  }
  const eventName = event?.name ?? 'evento'

  const [p1, p2] = await Promise.all([
    prisma.user.findUnique({ where: { id: match.player1Id }, select: { name: true, whatsapp: true, email: true } }),
    prisma.user.findUnique({ where: { id: match.player2Id }, select: { name: true, whatsapp: true, email: true } }),
  ])
  const adminName = session.user.name ?? 'O ADMIN'

  if (body.action === 'propose-correction') {
    if (match.status !== 'FINISHED') {
      return NextResponse.json({ message: 'Só é possível corrigir placar de jogo já finalizado' }, { status: 409 })
    }
    const sets = trimToDecided(body.sets.filter(isValidSet))
    if (sets.length === 0) return NextResponse.json({ message: 'Informe ao menos um set válido' }, { status: 400 })
    const { winnerId } = computeWinner(sets, match.player1Id, match.player2Id)
    if (!winnerId) return NextResponse.json({ message: 'O placar não define um vencedor' }, { status: 400 })

    const updated = await prisma.match.update({
      where: { id },
      data: {
        correctionPendingSets: sets,
        correctionPendingWinnerId: winnerId,
        correctionProposedById: session.user.id,
        correctionProposedAt: new Date(),
        correctionConfirmedA: false,
        correctionConfirmedB: false,
        correctionContestedById: null,
        correctionContestedAt: null,
      },
    })

    const oldSets = (match.sets as unknown as SetScore[]) ?? []
    await Promise.all([
      notifyAll([
        { phone: p1?.whatsapp, message: MSG.correctionProposed(adminName, oldSets, sets, eventName) },
        { phone: p2?.whatsapp, message: MSG.correctionProposed(adminName, oldSets, sets, eventName) },
      ]),
      emailAll([
        { to: p1?.email, ...EMAIL.correctionProposed(adminName, oldSets, sets, eventName) },
        { to: p2?.email, ...EMAIL.correctionProposed(adminName, oldSets, sets, eventName) },
      ]),
    ])
    return NextResponse.json(updated)
  }

  const clearCorrectionFields = {
    correctionPendingSets: Prisma.DbNull,
    correctionPendingWinnerId: null,
    correctionProposedById: null,
    correctionProposedAt: null,
    correctionConfirmedA: false,
    correctionConfirmedB: false,
    correctionContestedById: null,
    correctionContestedAt: null,
  }

  if (body.action === 'cancel-correction') {
    if (!match.correctionPendingSets) {
      return NextResponse.json({ message: 'Não há correção pendente para este jogo' }, { status: 409 })
    }
    const updated = await prisma.match.update({ where: { id }, data: clearCorrectionFields })
    return NextResponse.json(updated)
  }

  if (body.action === 'force-apply-correction') {
    if (!match.correctionPendingSets) {
      return NextResponse.json({ message: 'Não há correção pendente para este jogo' }, { status: 409 })
    }
    const sets = match.correctionPendingSets as unknown as SetScore[]
    const winnerId = match.correctionPendingWinnerId as string
    const updated = await prisma.match.update({
      where: { id },
      data: {
        sets,
        winnerId,
        isAdminScore: false,
        resultType: null,
        scoreEditedById: match.correctionProposedById,
        scoreEditedAt: match.correctionProposedAt,
        ...clearCorrectionFields,
      },
    })
    await recomputeAllPoints()
    await Promise.all([
      notifyAll([
        { phone: p1?.whatsapp, message: MSG.correctionApplied(sets, eventName) },
        { phone: p2?.whatsapp, message: MSG.correctionApplied(sets, eventName) },
      ]),
      emailAll([
        { to: p1?.email, ...EMAIL.correctionApplied(sets, eventName) },
        { to: p2?.email, ...EMAIL.correctionApplied(sets, eventName) },
      ]),
    ])
    return NextResponse.json(updated)
  }

  // ratify-score: homologação do placar que um atleta lançou e o adversário nunca
  // confirmou. O placar (sets/winnerId) já está gravado desde o submit-score — o admin
  // apenas o oficializa. Conta como jogo realizado (isAdminScore = false).
  if (body.action === 'ratify-score') {
    if (match.status !== 'PENDING_SCORE') {
      return NextResponse.json({ message: 'Este jogo não tem placar lançado aguardando confirmação' }, { status: 409 })
    }
    const sets = (match.sets as unknown as SetScore[]) ?? []
    if (sets.length === 0 || !match.winnerId) {
      return NextResponse.json({ message: 'O placar lançado está incompleto' }, { status: 400 })
    }
    const updated = await prisma.match.update({
      where: { id },
      data: {
        status: 'FINISHED',
        isAdminScore: false,
        resultType: RESULT_TYPE_RATIFIED,
        scoreEditedById: session.user.id,
        scoreEditedAt: new Date(),
      },
    })
    await recomputeAllPoints()
    const winnerName = (match.winnerId === match.player1Id ? p1?.name : p2?.name) ?? 'Vencedor'
    await Promise.all([
      notifyAll([
        { phone: p1?.whatsapp, message: MSG.scoreRatified(adminName, winnerName, sets, eventName) },
        { phone: p2?.whatsapp, message: MSG.scoreRatified(adminName, winnerName, sets, eventName) },
      ]),
      emailAll([
        { to: p1?.email, ...EMAIL.scoreRatified(adminName, winnerName, sets, eventName) },
        { to: p2?.email, ...EMAIL.scoreRatified(adminName, winnerName, sets, eventName) },
      ]),
    ])
    return NextResponse.json(updated)
  }

  // wo-admin: fechamento instantâneo, sem anuência (jogo não realizado)
  if (match.status === 'FINISHED') {
    return NextResponse.json({ message: 'Jogo já tem placar — use a correção de placar' }, { status: 409 })
  }
  if (match.status === 'PENDING_SCORE') {
    // Um atleta já lançou um placar real. Não sobrescrever com 6/0 6/0 — o caminho é
    // homologar (ratify-score) ou o adversário contestar antes.
    return NextResponse.json(
      { message: 'Este jogo tem placar lançado por um atleta — use "Homologar placar" para oficializá-lo' },
      { status: 409 },
    )
  }
  const teamA = [match.player1Id, match.player3Id].filter(Boolean) as string[]
  const teamB = [match.player2Id, match.player4Id].filter(Boolean) as string[]

  // Empate técnico (sem winnerId): W.O. não pontua ninguém. winnerId nulo já faz o
  // computeExpectedPoints ignorar o jogo, e isAdminScore mantém fora de vitórias/jogos.
  if (!body.winnerId) {
    const updated = await prisma.match.update({
      where: { id },
      data: {
        sets: [],
        winnerId: null,
        status: 'FINISHED',
        isAdminScore: true,
        resultType: RESULT_TYPE_WO_ADMIN_DRAW,
        scoreEditedById: session.user.id,
        scoreEditedAt: new Date(),
      },
    })
    await recomputeAllPoints()
    return NextResponse.json(updated)
  }

  if (!teamA.includes(body.winnerId) && !teamB.includes(body.winnerId)) {
    return NextResponse.json({ message: 'Vencedor não participa desta partida' }, { status: 400 })
  }
  const winnerOnA = teamA.includes(body.winnerId)
  const winnerId = winnerOnA ? match.player1Id : (match.player2Id as string)
  const sets = [
    { p1: 6, p2: 0 },
    { p1: 6, p2: 0 },
  ].map((s) => (winnerOnA ? s : { p1: s.p2, p2: s.p1 }))

  const updated = await prisma.match.update({
    where: { id },
    data: {
      sets,
      winnerId,
      status: 'FINISHED',
      isAdminScore: true,
      resultType: RESULT_TYPE_WO_ADMIN,
      scoreEditedById: session.user.id,
      scoreEditedAt: new Date(),
    },
  })

  await recomputeAllPoints()

  return NextResponse.json(updated)
}
