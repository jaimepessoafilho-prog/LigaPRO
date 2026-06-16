import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'

// Inscreve um atleta no evento.
// Sem body.userId → o próprio atleta (só com inscrições abertas).
// Com body.userId → admin inscreve qualquer atleta (independe do status, exceto cancelado).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

  const { id: eventId } = await params
  const body = await req.json().catch(() => ({}))
  const targetUserId: string | undefined = body?.userId

  const admin = isAdminRole(session.user.role)
  const isAdminAdding = !!targetUserId && targetUserId !== session.user.id
  if (isAdminAdding && !admin) {
    return NextResponse.json({ message: 'Apenas o admin pode inscrever outros atletas' }, { status: 403 })
  }
  const userId = isAdminAdding ? (targetUserId as string) : session.user.id

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { registrations: true } } },
  })
  if (!event) return NextResponse.json({ message: 'Evento não encontrado' }, { status: 404 })

  // Atleta só se auto-inscreve com inscrições abertas; admin inscreve em qualquer fase ativa
  if (!isAdminAdding && event.status !== 'OPEN') {
    return NextResponse.json({ message: 'As inscrições deste evento não estão abertas' }, { status: 409 })
  }
  if (event.status === 'CANCELLED' || event.status === 'FINISHED') {
    return NextResponse.json({ message: 'Evento encerrado para inscrições' }, { status: 409 })
  }

  if (isAdminAdding) {
    const target = await prisma.user.findUnique({ where: { id: userId } })
    if (!target) return NextResponse.json({ message: 'Atleta não encontrado' }, { status: 404 })
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId } },
  })
  if (existing) {
    return NextResponse.json(
      { message: isAdminAdding ? 'Atleta já inscrito' : 'Você já está inscrito neste evento' },
      { status: 409 },
    )
  }

  if (event.maxParticipants && event._count.registrations >= event.maxParticipants) {
    return NextResponse.json({ message: 'Evento lotado' }, { status: 409 })
  }

  // Auto-inscrição do atleta fica PENDENTE (aguarda admin); admin já confirma
  const reg = await prisma.eventRegistration.create({
    data: { eventId, userId, status: isAdminAdding ? 'CONFIRMED' : 'PENDING' },
  })
  return NextResponse.json(reg, { status: 201 })
}

// Admin confirma ou recusa a inscrição de um atleta
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const { id: eventId } = await params
  const body = await req.json().catch(() => ({}))
  const userId: string | undefined = body?.userId
  const action: string | undefined = body?.action // 'confirm' | 'reject'

  if (!userId || (action !== 'confirm' && action !== 'reject')) {
    return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
  }

  const reg = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId } },
  })
  if (!reg) return NextResponse.json({ message: 'Inscrição não encontrada' }, { status: 404 })

  if (action === 'reject') {
    await prisma.eventRegistration.delete({ where: { id: reg.id } })
    return NextResponse.json({ ok: true, status: 'REJECTED' })
  }

  const updated = await prisma.eventRegistration.update({
    where: { id: reg.id },
    data: { status: 'CONFIRMED' },
  })
  return NextResponse.json(updated)
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
