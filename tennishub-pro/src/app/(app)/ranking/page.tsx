import { auth } from '@/lib/auth'
import { calculateUnifiedRanking } from '@/lib/ranking'
import { RankingTable } from '@/components/ranking/RankingTable'
import { SectionTitle, Tag } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const session = await auth()
  const year = new Date().getFullYear()
  const ranking = await calculateUnifiedRanking(year)

  return (
    <div>
      <SectionTitle icon="ti-medal">
        Ranking Geral {year} <Tag variant="green">{ranking.length} atletas</Tag>
      </SectionTitle>
      <RankingTable entries={ranking} currentUserId={session?.user?.id} />
      <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '12px', lineHeight: 1.8 }}>
        🥇 Pódio (1º–4º) · 🟢 Top 8 classificados · 🔻 Zona inferior. Pontos são
        atribuídos ao final de cada evento (Fase 4).
      </p>
    </div>
  )
}
