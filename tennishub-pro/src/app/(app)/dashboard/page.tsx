import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateUnifiedRanking } from '@/lib/ranking'
import { StatsCard } from '@/components/ui/StatsCard'
import { Card, SectionTitle, Tag } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { ConfirmRegistrationButton } from '@/components/events/ConfirmRegistrationButton'
import { RankingFilter } from '@/components/ranking/RankingFilter'
import { BackfillParticipationButton } from '@/components/admin/BackfillParticipationButton'
import { isAdminRole } from '@/lib/nav'

export const dynamic = 'force-dynamic'

type SetScore = { p1: number; p2: number }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const session = await auth()
  const userId = session?.user?.id ?? ''
  const name = session?.user?.name ?? 'Atleta'
  const admin = isAdminRole(session?.user?.role)
  const { event: eventId } = await searchParams
  const year = new Date().getFullYear()

  const matchScope = eventId ? { eventId } : {}
  const pointsScope = eventId ? { eventId } : {}

  const [pointsAgg, myFinished, eventsCount, invitesCount, scoresToConfirm, pendingRegs, events, selectedEvent, pendingBackfillEvents] =
    await Promise.all([
      prisma.rankingPoint.aggregate({ where: { userId, ...pointsScope }, _sum: { points: true } }),
      prisma.match.findMany({
        where: { status: 'FINISHED', ...matchScope, OR: [{ player1Id: userId }, { player2Id: userId }] },
        orderBy: { updatedAt: 'desc' },
        select: { player1Id: true, winnerId: true, sets: true },
      }),
      prisma.eventRegistration.count({ where: { userId, status: { not: 'CANCELLED' } } }),
      prisma.match.count({ where: { status: 'PENDING_OPPONENT', player2Id: userId } }),
      prisma.match.count({
        where: { status: 'PENDING_SCORE', scoreSubmittedById: { not: userId }, OR: [{ player1Id: userId }, { player2Id: userId }] },
      }),
      admin
        ? prisma.eventRegistration.findMany({
            where: { status: 'PENDING', partnerId: null },
            include: { user: { select: { id: true, name: true, avatarUrl: true } }, event: { select: { id: true, name: true } } },
            orderBy: { registeredAt: 'asc' },
          })
        : Promise.resolve([]),
      prisma.event.findMany({ where: { status: { not: 'CANCELLED' } }, select: { id: true, name: true }, orderBy: { startDate: 'desc' } }),
      eventId ? prisma.event.findUnique({ where: { id: eventId }, select: { name: true } }) : Promise.resolve(null),
      admin
        ? prisma.event.count({ where: { matches: { some: { status: 'FINISHED' } } } })
        : Promise.resolve(0),
    ])

  // ── Estatísticas pessoais (escopo: geral ou evento) ──
  let setsWon = 0, setsLost = 0, gamesWon = 0, gamesLost = 0
  const form: ('V' | 'D')[] = [] // mais recente primeiro
  for (const m of myFinished) {
    const iAmP1 = m.player1Id === userId
    const sets = (m.sets as unknown as SetScore[]) ?? []
    for (const s of sets) {
      const my = iAmP1 ? s.p1 : s.p2
      const opp = iAmP1 ? s.p2 : s.p1
      gamesWon += my
      gamesLost += opp
      if (my > opp) setsWon++
      else if (opp > my) setsLost++
    }
    form.push(m.winnerId === userId ? 'V' : 'D')
  }
  const totalMatches = myFinished.length
  const wins = form.filter((f) => f === 'V').length
  const losses = totalMatches - wins
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
  const setDiff = setsWon - setsLost
  const gameDiff = gamesWon - gamesLost
  // Sequência atual de vitórias (a partir do jogo mais recente)
  let streak = 0
  for (const f of form) {
    if (f === 'V') streak++
    else break
  }

  const totalPoints = pointsAgg._sum.points ?? 0
  const fullRanking = await calculateUnifiedRanking(year, eventId)
  const podium = fullRanking.slice(0, 4)
  const rankingTop = fullRanking.slice(0, 8)
  const position = fullRanking.findIndex((r) => r.userId === userId) + 1
  const MEDALS = ['🥇', '🥈', '🥉', '⭐']
  const athletePending = invitesCount + scoresToConfirm
  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`)
  const last5 = form.slice(0, 5).reverse() // exibe cronológico (antigo → recente)

  return (
    <div>
      {/* Hero */}
      <div style={{ background: 'var(--navy)', borderRadius: '20px', padding: '24px 26px', marginBottom: '16px', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,.13)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 90% at -5% 110%, rgba(0,196,106,.22) 0%, transparent 55%),radial-gradient(ellipse 50% 60% at 110% 0%, rgba(200,90,26,.14) 0%, transparent 55%)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Avatar name={name} avatarUrl={session?.user?.avatarUrl} size={52} />
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '34px', color: 'white', letterSpacing: '1px', lineHeight: 1 }}>
                Olá, <em style={{ color: 'var(--green)', fontStyle: 'normal' }}>{name.split(' ')[0]}</em>
              </div>
              <div style={{ color: 'rgba(255,255,255,.45)', fontSize: '12px', marginTop: '6px' }}>
                {position > 0 ? `🏅 #${position} ${selectedEvent ? `em ${selectedEvent.name}` : 'no ranking geral'}` : 'Sem posição no ranking ainda'}
              </div>
            </div>
          </div>
          {admin && (
            <span className="role-pill role-admin" style={{ alignSelf: 'flex-start' }}>
              <i className="ti ti-shield-check" /> ADMIN
            </span>
          )}
        </div>
      </div>

      {/* Seletor: geral ou por evento */}
      <RankingFilter events={events} selected={eventId ?? ''} basePath="/dashboard" />

      {/* Pendências do atleta */}
      {athletePending > 0 && (
        <Card style={{ marginBottom: '16px', borderLeft: '4px solid var(--gold)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '19px', color: 'var(--navy)' }}>
                <i className="ti ti-bell" style={{ color: 'var(--gold-d)', verticalAlign: '-2px' }} /> {athletePending} pendência(s)
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
                {invitesCount > 0 && <>📩 {invitesCount} convite(s). </>}
                {scoresToConfirm > 0 && <>📊 {scoresToConfirm} placar(es) para confirmar.</>}
              </div>
            </div>
            <Link href="/resultados" className="btn btn-green" style={{ textDecoration: 'none' }}>
              <i className="ti ti-arrow-right" /> Resolver
            </Link>
          </div>
        </Card>
      )}

      {/* Pendências do admin: aprovação de inscrições */}
      {admin && pendingRegs.length > 0 && (
        <Card style={{ marginBottom: '16px', borderLeft: '4px solid var(--gold)' }}>
          <SectionTitle icon="ti-user-check" style={{ fontSize: '18px' }}>
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

      {/* Recalcular pontos: vitória + participação, para todos que jogaram (inclusive admin) */}
      {admin && pendingBackfillEvents > 0 && (
        <Card style={{ marginBottom: '16px', borderLeft: '4px solid var(--green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '19px', color: 'var(--navy)' }}>
                <i className="ti ti-award" style={{ color: 'var(--green-d)', verticalAlign: '-2px' }} /> Recalcular pontos do ranking
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text2)', marginTop: '4px' }}>
                Recalcula os pontos (vitória + participação) de {pendingBackfillEvents} evento(s) a partir dos jogos já
                finalizados. Pode rodar quantas vezes precisar.
              </div>
            </div>
            <BackfillParticipationButton pendingEvents={pendingBackfillEvents} />
          </div>
        </Card>
      )}

      {/* Estatísticas pessoais — cards principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
        <StatsCard label="Pontos" value={totalPoints} icon="⭐" />
        <StatsCard label="Vitórias" value={wins} icon="🏆" />
        <StatsCard label="Derrotas" value={losses} icon="❌" animate={false} />
        <StatsCard label="Aproveit." value={winRate} icon="📈" animate={false} />
      </div>

      {/* Performance detalhada */}
      <Card style={{ marginBottom: '16px', padding: '16px' }}>
        <SectionTitle icon="ti-chart-line" style={{ fontSize: '17px', marginBottom: '12px' }}>
          Minha performance {selectedEvent ? <Tag variant="navy">{selectedEvent.name}</Tag> : <Tag variant="green">Geral</Tag>}
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
          <Metric label="Partidas" value={String(totalMatches)} />
          <Metric label="Aproveitamento" value={`${winRate}%`} color="var(--green-d)" />
          <Metric label="Sequência" value={streak > 0 ? `${streak} V` : '—'} color={streak > 0 ? 'var(--green-d)' : 'var(--text3)'} />
          <Metric label="Saldo de sets" value={fmt(setDiff)} color={setDiff > 0 ? 'var(--green-d)' : setDiff < 0 ? 'var(--clay)' : 'var(--text)'} />
          <Metric label="Saldo de games" value={fmt(gameDiff)} color={gameDiff > 0 ? 'var(--green-d)' : gameDiff < 0 ? 'var(--clay)' : 'var(--text)'} />
          <Metric label="Sets (G/P)" value={`${setsWon}/${setsLost}`} />
          <Metric label="Games (G/P)" value={`${gamesWon}/${gamesLost}`} />
          <Metric label="Eventos" value={String(eventsCount)} />
        </div>

        {/* Forma — últimos resultados */}
        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Forma:</span>
          {last5.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>sem jogos ainda</span>
          ) : (
            last5.map((f, i) => (
              <span key={i} title={f === 'V' ? 'Vitória' : 'Derrota'} style={{
                width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, color: 'white',
                background: f === 'V' ? 'var(--green)' : 'var(--clay)',
              }}>{f}</span>
            ))
          )}
        </div>
      </Card>

      {/* Pódio compacto */}
      <Card style={{ marginBottom: '16px', padding: '14px' }}>
        <SectionTitle icon="ti-trophy" style={{ fontSize: '17px', marginBottom: '10px' }}>
          Pódio {selectedEvent ? <Tag variant="navy">{selectedEvent.name}</Tag> : <Tag variant="gold">Top 4</Tag>}
        </SectionTitle>
        {podium.length === 0 ? (
          <p style={{ color: 'var(--text2)', fontSize: '13px' }}>Sem atletas pontuando ainda.</p>
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
            <SectionTitle icon="ti-medal" style={{ fontSize: '17px', margin: 0 }}>
              {selectedEvent ? 'Ranking do evento' : 'Ranking Geral'}
            </SectionTitle>
            <Link href={eventId ? `/ranking?event=${eventId}` : '/ranking'} style={{ fontSize: '12px', color: 'var(--green-d)', fontWeight: 600 }}>Ver completo →</Link>
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

function Metric({ label, value, color = 'var(--navy)' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.4px', fontWeight: 600, marginTop: '4px' }}>{label}</div>
    </div>
  )
}
