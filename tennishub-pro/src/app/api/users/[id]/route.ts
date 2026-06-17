import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'

// Exclui um atleta e todos os seus dados associados. Apenas admin.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const { id } = await params

  if (id === session.user.id) {
    return NextResponse.json({ message: 'Você não pode excluir a si mesmo' }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  if (!target) return NextResponse.json({ message: 'Atleta não encontrado' }, { status: 404 })
  if (isAdminRole(target.role)) {
    return NextResponse.json({ message: 'Não é possível excluir um administrador' }, { status: 400 })
  }

  // Remove dependências antes do usuário (FKs sem cascade)
  await prisma.$transaction([
    prisma.rankingPoint.deleteMany({ where: { userId: id } }),
    prisma.eventRegistration.deleteMany({ where: { userId: id } }),
    prisma.match.deleteMany({
      where: {
        OR: [{ player1Id: id }, { player2Id: id }, { player3Id: id }, { player4Id: id }],
      },
    }),
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ])

  return NextResponse.json({ ok: true })
}
