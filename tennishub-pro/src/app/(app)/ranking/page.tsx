import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateUnifiedRanking } from '@/lib/ranking'
import { RankingTable } from '@/components/ranking/RankingTable'
import { RankingFilter } from '@/components/ranking/RankingFilter'
import { SectionTitle, Tag } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const session = await auth()
  const { event: eventId } = await searchParams
  const year = new Date().getFullYear()

  const [ranking, events, selectedEvent] = await Promise.all([
    calculateUnifiedRanking(year, eventId),
    prisma.event.findMany({ where: { status: { not: 'CANCELLED' } }, select: { id: true, name: true }, orderBy: { startDate: 'desc' } }),
    eventId ? prisma.event.findUnique({ where: { id: eventId }, select: { name: true } }) : Promise.resolve(null),
  ])

  return (
    <div>
      <SectionTitle icon="ti-medal">
        {selectedEvent ? `Ranking — ${selectedEvent.name}` : `Ranking Geral ${year}`}{' '}
        <Tag variant="green">{ranking.length} atletas</Tag>
      </SectionTitle>

      <RankingFilter events={events} selected={eventId ?? ''} />

      <RankingTable entries={ranking} currentUserId={session?.user?.id} showEvents={!eventId} />

      <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '12px', lineHeight: 1.8 }}>
        {eventId
          ? 'Ranking restrito a este evento (apenas participantes confirmados).'
          : 'Ranking geral: soma dos pontos de todos os eventos. A coluna "Ev." mostra quantos eventos o atleta participa.'}{' '}
        🥇 Pódio (1º–4º) · 🟢 Top 8 · 🔻 Zona inferior.
      </p>
    </div>
  )
}
