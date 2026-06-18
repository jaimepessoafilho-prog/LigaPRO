// Lista de espera e Lucky Loser automático
import { prisma } from './prisma'
import { sendWhatsApp } from './notifications'

/** Promove o próximo da lista de espera (ordem de inscrição) */
export async function promoteFromWaitlist(
  eventId: string,
): Promise<{ promoted: boolean; userId?: string; name?: string }> {
  const next = await prisma.eventRegistration.findFirst({
    where: { eventId, status: 'WAITLIST' },
    orderBy: { registeredAt: 'asc' },
    include: { user: true },
  })
  if (!next) return { promoted: false }

  await prisma.eventRegistration.update({ where: { id: next.id }, data: { status: 'CONFIRMED' } })

  await sendWhatsApp(
    next.user.whatsapp,
    `🎾 *LigaPRO — Lucky Loser*\n\nOlá, ${next.user.name}!\n\nUma vaga foi liberada no torneio e você foi promovido da lista de espera.\n\nAcesse o app para ver sua posição na chave.`,
  )

  return { promoted: true, userId: next.userId, name: next.user.name }
}

/** Registra W.O.; se for 1ª rodada, aciona lucky loser */
export async function registerWalkover(matchId: string, walkoverUserId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { player1: true, player2: true, event: { select: { id: true, name: true } }, draw: true },
  })
  if (!match) throw new Error('Partida não encontrada')

  const winnerId = match.player1Id === walkoverUserId ? match.player2Id : match.player1Id

  await prisma.match.update({
    where: { id: matchId },
    data: { status: 'WALKOVER', walkover: true, winnerId: winnerId ?? undefined },
  })

  const isFirstRound =
    match.draw?.round === 1 || match.draw?.phase === 'ROUND_OF_64' || match.draw?.phase === 'ROUND_OF_32'
  if (isFirstRound) {
    const result = await promoteFromWaitlist(match.event.id)
    if (result.promoted) console.log(`Lucky Loser promovido: ${result.name} (${match.event.id})`)
  }

  const woPlayer = match.player1Id === walkoverUserId ? match.player1 : match.player2
  if (woPlayer) {
    await sendWhatsApp(
      woPlayer.whatsapp,
      `ℹ️ *LigaPRO*\n\nSua ausência foi registrada como W.O. Você foi eliminado do torneio *${match.event.name}*.`,
    )
  }
}

/** Posição do atleta na lista de espera (1-based) ou null */
export async function getWaitlistPosition(eventId: string, userId: string): Promise<number | null> {
  const waitlist = await prisma.eventRegistration.findMany({
    where: { eventId, status: 'WAITLIST' },
    orderBy: { registeredAt: 'asc' },
    select: { userId: true },
  })
  const pos = waitlist.findIndex((w) => w.userId === userId)
  return pos >= 0 ? pos + 1 : null
}
