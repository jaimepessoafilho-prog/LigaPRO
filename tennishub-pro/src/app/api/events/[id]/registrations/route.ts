import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'

// Inscreve o atleta logado no evento
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

  const { id: eventId } = await params
  const userId = session.user.id

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { registrations: true } } },
  })
  if (!event) return NextResponse.json({ message: 'Evento não encontrado' }, { status: 404 })
  if (event.status !== 'OPEN') {
    return NextResponse.json({ message: 'As inscrições deste evento não estão abertas' }, { status: 409 })
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId } },
  })
  if (existing) {
    return NextResponse.json({ message: 'Você já está inscrito neste evento' }, { status: 409 })
  }

  if (event.maxParticipants && event._count.registrations >= event.maxParticipants) {
    return NextResponse.json({ message: 'Evento lotado' }, { status: 409 })
  }

  const reg = await prisma.eventRegistration.create({
    data: { eventId, userId, status: 'CONFIRMED' },
  })
  return NextResponse.json(reg, { status: 201 })
}

// Cancela uma inscrição. Sem ?userId → a própria; com ?userId → admin remove o atleta.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

  const { id: eventId } = await params
  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')

  // Remover inscrição de OUTRO atleta exige admin
  let userId = session.user.id
  if (targetUserId && targetUserId !== session.user.id) {
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ message: 'Apenas o admin pode remover outros atletas' }, { status: 403 })
    }
    userId = targetUserId
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId } },
  })
  if (!existing) {
    return NextResponse.json({ message: 'Inscrição não encontrada' }, { status: 404 })
  }

  await prisma.eventRegistration.delete({ where: { id: existing.id } })
  return NextResponse.json({ ok: true })
}
