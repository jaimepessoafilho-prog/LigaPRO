import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { z } from 'zod'

const patchSchema = z.object({
  status: z.enum(['DRAFT', 'OPEN', 'CLOSED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']),
})

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

  const updated = await prisma.event.update({ where: { id }, data: { status } })

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
