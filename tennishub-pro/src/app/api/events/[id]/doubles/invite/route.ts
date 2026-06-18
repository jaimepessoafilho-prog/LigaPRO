// Convite e confirmação de parceiro de duplas
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { inviteDoublesPartner, confirmDoublesPartner } from '@/lib/doubles'

// POST — convidar parceiro
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const { inviteeId } = await req.json().catch(() => ({}))
  if (!inviteeId) return NextResponse.json({ message: 'inviteeId obrigatório' }, { status: 400 })

  const result = await inviteDoublesPartner({ eventId: id, inviterId: session.user.id, inviteeId })
  if (!result.ok) {
    const messages: Record<string, string> = {
      SAME_USER: 'Você não pode se convidar',
      PARTNER_NOT_FOUND: 'Atleta não encontrado',
      ALREADY_HAS_PARTNER: 'Você já tem um parceiro confirmado',
      PARTNER_ALREADY_IN_EVENT: 'Este atleta já está inscrito no evento',
      AGE_GROUP_VIOLATION: 'Parceiro fora da faixa etária do evento',
      EVENT_NOT_DOUBLES: 'Este evento não é de duplas',
      REGISTRATION_CLOSED: 'Inscrições encerradas',
    }
    return NextResponse.json({ message: messages[result.error ?? ''] ?? 'Erro desconhecido' }, { status: 400 })
  }
  return NextResponse.json({ message: 'Convite enviado com sucesso' })
}

// PATCH — o convidado confirma a parceria
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

  const { id } = await params
  const { inviterId } = await req.json().catch(() => ({}))
  if (!inviterId) return NextResponse.json({ message: 'inviterId obrigatório' }, { status: 400 })

  const result = await confirmDoublesPartner(id, session.user.id, inviterId)
  if (!result.ok) return NextResponse.json({ message: result.error }, { status: 400 })
  return NextResponse.json({ message: 'Parceria confirmada com sucesso!' })
}
