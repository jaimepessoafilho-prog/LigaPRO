import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { generateRoundRobinMatches } from '@/lib/round-robin'
import { z } from 'zod'

const patchSchema = z.object({
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']),
})

// Exclui o evento e tudo associado (partidas, chaves, inscrições, pontos). Apenas admin.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } })
  if (!event) return NextResponse.json({ message: 'Evento não encontrado' }, { status: 404 })

  await prisma.$transaction([
    // Preserva os pontos conquistados: apenas desvincula do evento (eventId → null)
    prisma.rankingPoint.updateMany({ where: { eventId: id }, data: { eventId: null } }),
    prisma.match.deleteMany({ where: { eventId: id } }),
    prisma.draw.deleteMany({ where: { eventId: id } }),
    prisma.eventRegistration.deleteMany({ where: { eventId: id } }),
    prisma.event.delete({ where: { id } }),
  ])

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const { id } = await params
  let status: z.infer<typeof patchSchema>['status']
  try {
    status = patchSchema.parse(await req.json()).status
  } catch {
    return NextResponse.json({ message: 'Status inválido' }, { status: 400 })
  }

  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ message: 'Evento não encontrado' }, { status: 404 })

  const isRanking = event.matchType === 'ROUND_ROBIN'

  // Encerrar o Ranking exige 100% dos confrontos com placar (RF-07)
  if (status === 'FINISHED' && isRanking) {
    const pendingMatches = await prisma.match.count({
      where: { eventId: id, status: { notIn: ['FINISHED', 'CANCELLED'] } },
    })
    if (pendingMatches > 0) {
      return NextResponse.json(
        { message: `Ainda há ${pendingMatches} jogo(s) sem placar. Feche todos (realizado ou W.O. Admin) antes de encerrar.` },
        { status: 409 },
      )
    }
  }

  const data: { status: typeof status; registrationsClosedAt?: Date; finishedAt?: Date; closureLog?: object } = { status }

  if (status === 'CLOSED' && isRanking) {
    data.registrationsClosedAt = new Date()
  }

  if (status === 'FINISHED' && isRanking) {
    const [totalMatches, woAdminMatches] = await Promise.all([
      prisma.match.count({ where: { eventId: id, status: { not: 'CANCELLED' } } }),
      prisma.match.count({ where: { eventId: id, isAdminScore: true } }),
    ])
    data.finishedAt = new Date()
    data.closureLog = {
      closedById: session.user.id,
      closedByName: session.user.name ?? null,
      closedAt: data.finishedAt.toISOString(),
      totalMatches,
      woAdminMatches,
    }
  }

  const updated = await prisma.event.update({ where: { id }, data })

  // Gera (se ainda não existirem) todos os confrontos previstos entre os atletas confirmados
  if (status === 'CLOSED' && isRanking) {
    await generateRoundRobinMatches(id)
  }

  // Ao finalizar, calcula a posição final de cada atleta pelo total de pontos no evento
  if (status === 'FINISHED') {
    const points = await prisma.rankingPoint.findMany({
      where: { eventId: id },
      orderBy: { points: 'desc' },
    })
    await prisma.$transaction(
      points.map((p, i) =>
        prisma.rankingPoint.update({ where: { id: p.id }, data: { position: i + 1 } }),
      ),
    )
  }

  return NextResponse.json(updated)
}
