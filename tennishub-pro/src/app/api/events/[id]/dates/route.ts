import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { z } from 'zod'

const bodySchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
})

// Corrige as datas de início/término do evento (definidas na criação, editáveis depois). Admin-only.
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
    return NextResponse.json({ message: 'Datas inválidas' }, { status: 400 })
  }

  const startDate = new Date(body.startDate)
  const endDate = new Date(body.endDate)
  if (endDate < startDate) {
    return NextResponse.json({ message: 'A data de término não pode ser antes da data de início' }, { status: 400 })
  }

  const event = await prisma.event.findUnique({ where: { id }, select: { id: true } })
  if (!event) return NextResponse.json({ message: 'Evento não encontrado' }, { status: 404 })

  const updated = await prisma.event.update({ where: { id }, data: { startDate, endDate } })
  return NextResponse.json(updated)
}
