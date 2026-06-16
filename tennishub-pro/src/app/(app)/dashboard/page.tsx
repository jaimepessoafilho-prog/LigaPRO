import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRankingPosition, calculateUnifiedRanking } from '@/lib/ranking'
import { StatsCard } from '@/components/ui/StatsCard'
import { Card, SectionTitle, Tag } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmRegistrationButton } from '@/components/events/ConfirmRegistrationButton'
import { isAdminRole } from '@/lib/nav'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await auth()
  const userId = session?.user?.id ?? ''
  const name = session?.user?.name ?? 'Atleta'
  const admin = isAdminRole(session?.user?.role)

  const [
    pointsAgg, wins, totalMatches, eventsCount, position,
    invitesCount, scoresToConfirm, pendingRegs,
  ] = await Promise.all([
    prisma.rankingPoint.aggregate({ where: { userId }, _sum: { points: true } }),
    prisma.match.count({ where: { winnerId: userId, status: 'FINISHED' } }),
    prisma.match.count({ where: { status: 'FINISHED', OR: [{ player1Id: userId }, { player2Id: userId }] } }),
    prisma.eventRegistration.count({ where: { userId } }),
    getRankingPosition(userId),
    // Pendências do atleta
    prisma.match.count({ where: { status: 'PENDING_OPPONENT', player2Id: userId } }),
    prisma.match.count({
      where: { status: 'PENDING_SCORE', scoreSubmittedById: { not: userId }, OR: [{ player1Id: userId }, { player2Id: userId }] },
    }),
    // Pendências do admin: inscrições aguardando aprovação
    admin
      ? prisma.eventRegistration.findMany({
          where: { status: 'PENDING' },
          include: { user: { select: { id: true, name: true, avatarUrl: true } }, event: { select: { id: true, name: true } } },
          orderBy: { registeredAt: 'asc' },
        })
      : Promise.resolve([]),
  ])

  const totalPoints = pointsAgg._sum.points ?? 0
  const fullRanking = await calculateUnifiedRanking()
  const podium = fullRanking.slice(0, 4)
  const rankingTop = fullRanking.slice(0, 8)
  const MEDALS = ['🥇', '🥈', '🥉', '⭐']
  const athletePending = invitesCount + scoresToConfirm

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

      {/* Pendências do atleta */}
      {!admin && athletePending > 0 && (
        <Card style={{ marginBottom: '16px', borderLeft: '4px solid var(--gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--navy)' }}>
                <i className="ti ti-bell" style={{ color: 'var(--gold-d)', verticalAlign: '-2px' }} /> Você tem {athletePending} pendência(s)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
                {invitesCount > 0 && <>📩 {invitesCount} convite(s) de jogo para confirmar. </>}
                {scoresToConfirm > 0 && <>📊 {scoresToConfirm} placar(es) para confirmar.</>}
              </div>
            </div>
            <Link href="/resultados" className="btn btn-green" style={{ textDecoration: 'none' }}>
              <i className="ti ti-arrow-right" /> Resolver agora
            </Link>
          </div>
        </Card>
      )}

      {/* Pendências do admin: aprovação de inscrições */}
      {admin && pendingRegs.length > 0 && (
        <Card style={{ marginBottom: '16px', borderLeft: '4px solid var(--gold)' }}>
          <SectionTitle icon="ti-user-check" style={{ fontSize: '20px' }}>
            Inscrições aguardando aprovação <Tag variant="gold">{pendingRegs.length}</Tag>
          </SectionTitle>
          {pendingRegs.map((r) => (
            <div key={r.id} className="athlete-row">
              <Avatar name={r.user.name} avatarUrl={r.user.avatarUrl} />
              <div style={{ flex: 1 }}>
                <div className="athlete-name">{r.user.name}</div>
                <div className="athlete-meta">
                  <i className="ti ti-calendar-event" style={{ verticalAlign: '-2px' }} /> {r.event.name}
                </div>
              </div>
              <ConfirmRegistrationButton eventId={r.event.id} userId={r.user.id} athleteName={r.user.name} />
            </div>
          ))}
        </Card>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <StatsCard label="Pontos" value={totalPoints} icon="⭐" />
        <StatsCard label="Vitórias" value={wins} icon="🏆" />
        <StatsCard label="Partidas" value={totalMatches} icon="🎾" />
        <StatsCard label="Eventos" value={eventsCount} icon="📅" />
      </div>

      {/* Podium compacto */}
      <Card style={{ marginBottom: '16px', padding: '14px' }}>
        <SectionTitle icon="ti-trophy" style={{ fontSize: '17px', marginBottom: '10px' }}>
          Pódio <Tag variant="gold">Top 4</Tag>
        </SectionTitle>
        {podium.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: '13px' }}>
            Nenhum atleta cadastrado. <Link href="/register" style={{ color: 'var(--green-d)', fontWeight: 600 }}>Cadastre o primeiro →</Link>
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {podium.map((p, i) => (
              <div key={p.userId} style={{ textAlign: 'center', padding: '10px 4px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '18px' }}>{MEDALS[i]}</div>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0 2px' }}>
                  <Avatar name={p.name} avatarUrl={p.avatarUrl} size={34} />
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>{p.name.split(' ')[0]}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '17px', color: 'var(--green-d)', marginTop: '4px' }}>{p.totalPoints}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Ranking compacto */}
      {rankingTop.length > 0 && (
        <Card style={{ padding: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <SectionTitle icon="ti-medal" style={{ fontSize: '17px', margin: 0 }}>Ranking Geral</SectionTitle>
            <Link href="/ranking" style={{ fontSize: '12px', color: 'var(--green-d)', fontWeight: 600 }}>Ver completo →</Link>
          </div>
          {rankingTop.map((r) => (
            <div key={r.userId} className="athlete-row" style={{ padding: '8px 0' }}>
              <span className={`rk-num ${r.position <= 3 ? ['rk-1', 'rk-2', 'rk-3'][r.position - 1] : 'rk-mid'}`} style={{ width: '24px', fontSize: '16px' }}>
                {r.position}
              </span>
              <Avatar name={r.name} avatarUrl={r.avatarUrl} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="athlete-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.name}
                  {r.userId === userId && <span className="me-badge">VOCÊ</span>}
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--navy)' }}>{r.totalPoints}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
