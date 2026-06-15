import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRankingPosition, calculateUnifiedRanking } from '@/lib/ranking'
import { StatsCard } from '@/components/ui/StatsCard'
import { Card, SectionTitle, Tag } from '@/components/ui/Card'
import { isAdminRole } from '@/lib/nav'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id ?? ''
  const name = session?.user?.name ?? 'Atleta'
  const admin = isAdminRole(session?.user?.role)

  const [pointsAgg, wins, totalMatches, eventsCount, position, athleteCount] = await Promise.all([
    prisma.rankingPoint.aggregate({ where: { userId }, _sum: { points: true } }),
    prisma.match.count({ where: { winnerId: userId, status: 'FINISHED' } }),
    prisma.match.count({ where: { status: 'FINISHED', OR: [{ player1Id: userId }, { player2Id: userId }] } }),
    prisma.eventRegistration.count({ where: { userId } }),
    getRankingPosition(userId),
    prisma.user.count({ where: { role: 'ATHLETE' } }),
  ])

  const totalPoints = pointsAgg._sum.points ?? 0
  const podium = (await calculateUnifiedRanking()).slice(0, 4)
  const MEDALS = ['🥇', '🥈', '🥉', '⭐']

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          background: 'var(--navy)', borderRadius: '20px', padding: '30px 32px',
          marginBottom: '20px', position: 'relative', overflow: 'hidden',
          boxShadow: '0 8px 28px rgba(0,0,0,.13)',
        }}
      >
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background:
              'radial-gradient(ellipse 70% 90% at -5% 110%, rgba(0,196,106,.22) 0%, transparent 55%),' +
              'radial-gradient(ellipse 50% 60% at 110% 0%, rgba(200,90,26,.14) 0%, transparent 55%)',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '44px', color: 'white', letterSpacing: '1px', lineHeight: 1 }}>
              Olá, <em style={{ color: 'var(--green)', fontStyle: 'normal' }}>{name.split(' ')[0]}</em>
            </div>
            <div style={{ color: 'rgba(255,255,255,.36)', fontSize: '12px', marginTop: '6px' }}>
              {position > 0 ? `#${position} no ranking geral` : 'Sem posição no ranking ainda'}
            </div>
          </div>
          {admin && (
            <span className="role-pill role-admin" style={{ alignSelf: 'flex-start' }}>
              <i className="ti ti-shield-check" /> ADMIN
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <StatsCard label="Pontos" value={totalPoints} icon="⭐" />
        <StatsCard label="Vitórias" value={wins} icon="🏆" />
        <StatsCard label="Partidas" value={totalMatches} icon="🎾" />
        <StatsCard label="Eventos" value={eventsCount} icon="📅" />
      </div>

      {/* Podium */}
      <Card style={{ marginBottom: '16px' }}>
        <SectionTitle icon="ti-trophy" style={{ fontSize: '20px', marginBottom: '12px' }}>
          Pódio da Liga <Tag variant="gold">Top 4</Tag>
        </SectionTitle>
        {podium.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: '14px' }}>
            Nenhum atleta cadastrado. <Link href="/register" style={{ color: 'var(--green-d)', fontWeight: 600 }}>Cadastre o primeiro →</Link>
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
            {podium.map((p, i) => (
              <div key={p.userId} style={{ textAlign: 'center', padding: '14px 8px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '24px' }}>{MEDALS[i]}</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginTop: '4px' }}>{p.name}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--green-d)', marginTop: '6px' }}>{p.totalPoints} pts</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon="ti-rocket" style={{ fontSize: '18px', marginBottom: '8px' }}>
          Liga em construção <Tag variant="green">{athleteCount} atletas</Tag>
        </SectionTitle>
        <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: 1.7 }}>
          Cadastre atletas em <Link href="/register" style={{ color: 'var(--green-d)', fontWeight: 600 }}>Cadastro</Link> e veja-os
          aparecer no <Link href="/ranking" style={{ color: 'var(--green-d)', fontWeight: 600 }}>Ranking</Link> e em <Link href="/atletas" style={{ color: 'var(--green-d)', fontWeight: 600 }}>Atletas</Link>.
          Eventos, partidas e pontuação chegam na Fase 4.
        </p>
      </Card>
    </div>
  )
}
