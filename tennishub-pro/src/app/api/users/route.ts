import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const registerSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    whatsapp: z.string().min(10).max(20),
    age: z.coerce.number().int().min(5).max(100),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = registerSchema.parse(body)

    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return NextResponse.json({ message: 'E-mail já cadastrado' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        age: data.age,
        gender: data.gender,
        passwordHash,
      },
    })

    return NextResponse.json({ id: user.id, name: user.name, email: user.email }, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as any).name === 'ZodError') {
      return NextResponse.json({ message: (err as any).errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

export async function GET() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, gender: true, age: true, createdAt: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}
