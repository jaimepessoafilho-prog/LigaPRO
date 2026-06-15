import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { CBT_RULES, type CBTCategory, type CBTFormat, type CBTMatchType } from '@/lib/cbt-rules'
import { z } from 'zod'

const createEventSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().optional().nullable(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  location: z.string().min(2),
  format: z.enum(['SINGLES', 'DOUBLES']),
  matchType: z.enum(['ELIMINATION', 'ROUND_ROBIN', 'HYBRID']),
  drawType: z.enum(['SEEDED', 'RANDOM', 'RANKING']),
  category: z.enum(['OPEN', 'A', 'B', 'C', 'D']),
  ageGroup: z
    .enum([
      'UNDER_12', 'UNDER_14', 'UNDER_16', 'UNDER_18',
      'ADULT', 'SENIOR_35', 'SENIOR_45', 'SENIOR_55', 'SENIOR_60',
    ])
    .optional()
    .nullable(),
  maxParticipants: z.coerce.number().int().positive().optional().nullable(),
  registrationDeadline: z.string().optional().nullable(),
})

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { startDate: 'desc' },
    include: { _count: { select: { registrations: true } } },
  })
  return NextResponse.json(events)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const data = createEventSchema.parse(body)

    const scoringSystem = CBT_RULES.getScoring(
      data.format as CBTFormat,
      data.matchType as CBTMatchType,
      data.category as CBTCategory,
    )

    const event = await prisma.event.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        location: data.location,
        format: data.format,
        matchType: data.matchType,
        drawType: data.drawType,
        category: data.category,
        ageGroup: data.ageGroup ?? null,
        maxParticipants: data.maxParticipants ?? null,
        registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : null,
        status: 'OPEN',
        scoringSystem: scoringSystem as object,
        createdById: session.user.id,
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
      const zerr = err as unknown as { errors: { message: string }[] }
      return NextResponse.json({ message: zerr.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 })
    }
    console.error(err)
    return NextResponse.json({ message: 'Erro ao criar evento' }, { status: 500 })
  }
}
