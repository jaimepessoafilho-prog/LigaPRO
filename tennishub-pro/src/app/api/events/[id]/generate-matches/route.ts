import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { generateRoundRobinMatches } from '@/lib/round-robin'

/**
 * Gera (se ainda não existirem) todos os confrontos previstos entre os atletas confirmados
 * de um evento Ranking, SEM depender da transição OPEN → CLOSED — útil pra eventos já
 * fechados/em andamento que precisam ser completados (backfill) sem reabrir inscrições.
 * Idempotente: pode rodar quantas vezes precisar.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) return NextResponse.json({ message: 'Evento não encontrado' }, { status: 404 })
  if (event.matchType !== 'ROUND_ROBIN') {
    return NextResponse.json({ message: 'Só é possível gerar confrontos em eventos "Todos contra Todos"' }, { status: 400 })
  }
  if (event.status === 'OPEN') {
    return NextResponse.json({ message: 'Encerre as inscrições antes de gerar os confrontos' }, { status: 409 })
  }
  if (event.finishedAt) {
    return NextResponse.json({ message: 'Evento já encerrado' }, { status: 409 })
  }

  const created = await generateRoundRobinMatches(id)

  if (!event.registrationsClosedAt) {
    await prisma.event.update({ where: { id }, data: { registrationsClosedAt: new Date() } })
  }

  return NextResponse.json({ created })
}
