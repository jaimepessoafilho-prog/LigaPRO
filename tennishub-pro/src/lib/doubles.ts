// Formação, validação e pontuação de duplas
import { prisma } from './prisma'
import { sendWhatsApp } from './notifications'
import { calcDoublesPointsPerAthlete } from './draw-generator'
import { CBT_RULES } from './cbt-rules'

export interface DoublesInvitePayload {
  eventId: string
  inviterId: string
  inviteeId: string
}

export type DoublesValidationError =
  | 'PARTNER_NOT_FOUND'
  | 'ALREADY_HAS_PARTNER'
  | 'PARTNER_ALREADY_IN_EVENT'
  | 'CATEGORY_MISMATCH'
  | 'AGE_GROUP_VIOLATION'
  | 'GENDER_VIOLATION'
  | 'EVENT_NOT_DOUBLES'
  | 'REGISTRATION_CLOSED'
  | 'SAME_USER'

export async function inviteDoublesPartner(
  payload: DoublesInvitePayload,
): Promise<{ ok: boolean; error?: DoublesValidationError }> {
  const { eventId, inviterId, inviteeId } = payload
  if (inviterId === inviteeId) return { ok: false, error: 'SAME_USER' }

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return { ok: false, error: 'REGISTRATION_CLOSED' }
  if (event.format !== 'DOUBLES') return { ok: false, error: 'EVENT_NOT_DOUBLES' }
  if (event.status !== 'OPEN') return { ok: false, error: 'REGISTRATION_CLOSED' }

  const [inviter, invitee] = await Promise.all([
    prisma.user.findUnique({ where: { id: inviterId } }),
    prisma.user.findUnique({ where: { id: inviteeId } }),
  ])
  if (!inviter || !invitee) return { ok: false, error: 'PARTNER_NOT_FOUND' }

  const inviteeReg = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId: inviteeId } },
  })
  if (inviteeReg) return { ok: false, error: 'PARTNER_ALREADY_IN_EVENT' }

  const inviterReg = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId: inviterId } },
  })
  if (inviterReg?.partnerId) return { ok: false, error: 'ALREADY_HAS_PARTNER' }

  if (event.ageGroup && !validateAgeGroup(invitee.age, event.ageGroup)) {
    return { ok: false, error: 'AGE_GROUP_VIOLATION' }
  }

  // Convite pendente: marca o convidado como PENDING e guarda o convidador em partnerId
  await prisma.eventRegistration.upsert({
    where: { eventId_userId: { eventId, userId: inviteeId } },
    create: { eventId, userId: inviteeId, status: 'PENDING', partnerId: inviterId },
    update: { status: 'PENDING', partnerId: inviterId },
  })
  // Garante a inscrição do convidador (também pendente até confirmação)
  await prisma.eventRegistration.upsert({
    where: { eventId_userId: { eventId, userId: inviterId } },
    create: { eventId, userId: inviterId, status: 'PENDING', partnerId: inviteeId },
    update: { partnerId: inviteeId },
  })

  await sendWhatsApp(
    invitee.whatsapp,
    `🎾 *LigaPRO — Convite de Duplas*\n\n*${inviter.name}* quer jogar duplas com você no torneio *${event.name}*.\n\nAbra o app para aceitar ou recusar.`,
  )

  return { ok: true }
}

export async function confirmDoublesPartner(
  eventId: string,
  inviteeId: string,
  inviterId: string,
): Promise<{ ok: boolean; error?: string }> {
  const [inviterReg, inviteeReg] = await Promise.all([
    prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId: inviterId } },
      include: { user: true },
    }),
    prisma.eventRegistration.findUnique({
      where: { eventId_userId: { eventId, userId: inviteeId } },
      include: { user: true },
    }),
  ])
  if (!inviterReg || !inviteeReg) return { ok: false, error: 'Inscrição não encontrada' }

  await prisma.$transaction([
    prisma.eventRegistration.update({
      where: { eventId_userId: { eventId, userId: inviterId } },
      data: { status: 'CONFIRMED', partnerId: inviteeId },
    }),
    prisma.eventRegistration.update({
      where: { eventId_userId: { eventId, userId: inviteeId } },
      data: { status: 'CONFIRMED', partnerId: inviterId },
    }),
  ])

  await sendWhatsApp(
    inviterReg.user.whatsapp,
    `✅ *LigaPRO*\n\n*${inviteeReg.user.name}* aceitou jogar duplas com você! Vocês estão inscritos. 🏆`,
  )

  return { ok: true }
}

export async function awardDoublesPoints(
  eventId: string,
  userId: string,
  partnerId: string,
  position: number,
  category: string,
  year: number,
): Promise<void> {
  const positionKey = positionToKey(position)
  const table = (CBT_RULES.ELIMINATION_POINTS as Record<string, Record<string, number>>)[category]
  const singlesPoints = table?.[positionKey] ?? 0
  const pointsPerAthlete = calcDoublesPointsPerAthlete(singlesPoints, category)

  await prisma.$transaction([
    prisma.rankingPoint.upsert({
      where: { userId_eventId: { userId, eventId } },
      create: { userId, eventId, points: pointsPerAthlete, position, year },
      update: { points: pointsPerAthlete, position },
    }),
    prisma.rankingPoint.upsert({
      where: { userId_eventId: { userId: partnerId, eventId } },
      create: { userId: partnerId, eventId, points: pointsPerAthlete, position, year },
      update: { points: pointsPerAthlete, position },
    }),
  ])
}

function positionToKey(position: number): string {
  const map: Record<number, string> = { 1: 'W', 2: 'F', 3: 'SF', 4: 'SF', 5: 'QF', 6: 'QF', 7: 'QF', 8: 'QF' }
  if (position <= 8) return map[position] ?? 'R16'
  if (position <= 16) return 'R16'
  if (position <= 32) return 'R32'
  return 'R64'
}

function validateAgeGroup(age: number, ageGroup: string): boolean {
  const rules: Record<string, [number, number]> = {
    UNDER_12: [0, 12], UNDER_14: [0, 14], UNDER_16: [0, 16], UNDER_18: [0, 18],
    ADULT: [18, 999], SENIOR_35: [35, 999], SENIOR_45: [45, 999], SENIOR_55: [55, 999], SENIOR_60: [60, 999],
  }
  const [min, max] = rules[ageGroup] ?? [0, 999]
  return age >= min && age <= max
}
