import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(2).max(100),
  whatsapp: z.string().min(8).max(20),
  age: z.coerce.number().int().min(5).max(100),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  // avatarUrl: data URL (foto) ou emoji; vazio limpa
  avatarUrl: z.string().max(2_000_000).optional().nullable(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

  try {
    const data = updateSchema.parse(await req.json())
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: data.name,
        whatsapp: data.whatsapp,
        age: data.age,
        gender: data.gender,
        avatarUrl: data.avatarUrl ? data.avatarUrl : null,
      },
      select: { id: true, name: true, whatsapp: true, age: true, gender: true, avatarUrl: true },
    })
    return NextResponse.json(user)
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      const zerr = err as unknown as { errors: { message: string }[] }
      return NextResponse.json({ message: zerr.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ message: 'Erro ao salvar perfil' }, { status: 500 })
  }
}
