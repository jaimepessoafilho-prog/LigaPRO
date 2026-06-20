import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateDoublesRanking } from '@/lib/ranking'
import { Card, SectionTitle, Tag } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { DoublesPanel } from '@/components/events/DoublesPanel'
import { StatsCard } from '@/components/ui/StatsCard'
import { RankingFilter } from '@/components/ranking/RankingFilter'

export const dynamic = 'force-dynamic'

type SetScore = { p1: number; p2: number }
const MEDALS = ['🥇', '🥈', '🥉', '⭐']

export default async function DuplasPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string }>
}) {
  const session = await auth()
  const me = session?.user?.id ?? ''
  const name = session?.user?.name ?? 'Atleta'
  const { event: eventId } = await searchParams

  const [activeEventsAll, allDoublesEvents, selectorEvents, allAthletes, ranking, selectedEvent] = await Promise.all([
    prisma.event.findMany({
      where: { format: 'DOUBLES', status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: { registrations: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } } },
      orderBy: { startDate: 'desc' },
    }),
    prisma.event.findMany({ where: { format: 'DOUBLES' }, select: { id: true } }),
    prisma.event.findMany({ where: { format: 'DOUBLES', status: { not: 'CANCELLED' } }, select: { id: true, name: true }, orderBy: { startDate: 'desc' } }),
    prisma.user.findMany({ where: { role: 'ATHLETE' }, select: { id: true, name: true } }),
    calculateDoublesRanking(eventId),
    eventId ? prisma.event.findUnique({ where: { id: eventId }, select: { name: true } }) : Promise.resolve(null),
  ])

  // Escopo: geral (todos eventos de duplas) ou um evento
  const scopedEventIds = eventId ? [eventId] : allDoublesEvents.map((e) => e.id)
  const activeEvents = eventId ? activeEventsAll.filter((e) => e.id === eventId) : activeEventsAll

  // Minhas partidas de duplas (com nomes dos parceiros para exibir os times)
  const myMatches = scopedEventIds.length
    ? await prisma.match.findMany({
        where: {
          eventId: { in: scopedEventIds },
          OR: [{ player1Id: me }, { player2Id: me }, { player3Id: me }, { player4Id: me }],
        },
        orderBy: { updatedAt: 'desc' },
        include: {
          player1: { select: { id: true, name: true, avatarUrl: true } },
          player2: { select: { id: true, name: true, avatarUrl: true } },
          player3: { select: { name: true } },
          player4: { select: { name: true } },
          event: { select: { name: true } },
        },
        take: 80,
      })
    : []

  // Performance pessoal em duplas (a partir das partidas finalizadas)
  let setsWon = 0, setsLost = 0, gamesWon = 0, gamesLost = 0
  const form: ('V' | 'D')[] = []
  for (const m of myMatches) {
    if (m.status !== 'FINISHED') continue
    const amA = m.player1Id === me || m.player3Id === me
    const myTeamWon = amA ? m.winnerId === m.player1Id : m.winnerId === m.player2Id
    const sets = (m.sets as unknown as SetScore[]) ?? []
    for (const s of sets) {
      const my = amA ? s.p1 : s.p2
      const opp = amA ? s.p2 : s.p1
      gamesWon += my
      gamesLost += opp
      if (my > opp) setsWon++
      else if (opp > my) setsLost++
    }
    form.push(myTeamWon ? 'V' : 'D')
  }
  const dWins = form.filter((f) => f === 'V').length
  const dTotal = form.length
  const dLosses = dTotal - dWins
  const dWinRate = dTotal > 0 ? Math.round((dWins / dTotal) * 100) : 0
  const dSetDiff = setsWon - setsLost
  const dGameDiff = gamesWon - gamesLost
  let dStreak = 0
  for (const f of form) { if (f === 'V') dStreak++; else break }
  const last5 = form.slice(0, 5).reverse()
  const myTeam = ranking.find((t) => t.members.some((mem) => mem.id === me))
  const dPosition = myTeam?.position ?? 0
  const dPoints = myTeam?.totalPoints ?? 0
  const dPartner = myTeam?.members.find((mem) => mem.id !== me)?.name ?? null
  const fmt = (n: number) => (n > 0 ? `+${n}` : `${n}`)

  // Por evento ativo: formar/gerir dupla (a marcação de jogos fica na página Jogos)
  const eventBlocks = activeEvents.map((ev) => {
    const regs = ev.registrations
    const myReg = regs.find((r) => r.userId === me)
    const partnerReg = myReg?.partnerId ? regs.find((r) => r.userId === myReg.partnerId) : undefined
    const registeredIds = new Set(regs.map((r) => r.userId))
    const available = !myReg || !myReg.partnerId
      ? allAthletes.filter((a) => a.id !== me && !registeredIds.has(a.id))
      : []
    return {
      ev,
      panelProps: {
        eventId: ev.id,
        registered: !!myReg,
        myStatus: myReg?.status ?? null,
        partnerId: myReg?.partnerId ?? null,
        partnerName: partnerReg?.user.name ?? null,
        partnerStatus: partnerReg?.status ?? null,
        available,
        open: ev.status === 'OPEN',
      },
    }
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Hero — performance em duplas */}
      <div style={{ background: 'var(--navy)', borderRadius: '20px', padding: '22px 24px', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 28px rgba(0,0,0,.13)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 90% at -5% 110%, rgba(0,196,106,.22) 0%, transparent 55%),radial-gradient(ellipse 50% 60% at 110% 0%, rgba(200,90,26,.14) 0%, transparent 55%)' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Avatar name={name} avatarUrl={session?.user?.avatarUrl} size={48} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'white', letterSpacing: '1px', lineHeight: 1 }}>
              Duplas — <em style={{ color: 'var(--green)', fontStyle: 'normal' }}>{name.split(' ')[0]}</em>
            </div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '12px', marginTop: '6px' }}>
              {dPosition > 0 ? `🏅 #${dPosition} ${selectedEvent ? `em ${selectedEvent.name}` : 'no ranking de duplas'}` : 'Sem posição em duplas ainda'}
              {dPartner && <> · parceiro(a): <strong style={{ color: 'rgba(255,255,255,.8)' }}>{dPartner}</strong></>}
            </div>
          </div>
        </div>
      </div>

      {/* Seletor: geral ou por evento de duplas */}
      {selectorEvents.length > 0 && <RankingFilter events={selectorEvents} selected={eventId ?? ''} basePath="/duplas" />}

      {/* Stats principais */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <StatsCard label="Pontos" value={dPoints} icon="⭐" />
        <StatsCard label="Vitórias" value={dWins} icon="🏆" />
        <StatsCard label="Derrotas" value={dLosses} icon="❌" animate={false} />
        <StatsCard label="Aproveit." value={dWinRate} icon="📈" animate={false} />
      </div>

      {/* Performance detalhada */}
      <Card style={{ padding: '16px' }}>
        <SectionTitle icon="ti-chart-line" style={{ fontSize: '17px', marginBottom: '12px' }}>
          Minha performance em duplas {selectedEvent ? <Tag variant="navy">{selectedEvent.name}</Tag> : <Tag variant="green">Geral</Tag>}
        </SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
          <Metric label="Partidas" value={String(dTotal)} />
          <Metric label="Aproveitamento" value={`${dWinRate}%`} color="var(--green-d)" />
          <Metric label="Sequência" value={dStreak > 0 ? `${dStreak} V` : '—'} color={dStreak > 0 ? 'var(--green-d)' : 'var(--text3)'} />
          <Metric label="Saldo de sets" value={fmt(dSetDiff)} color={dSetDiff > 0 ? 'var(--green-d)' : dSetDiff < 0 ? 'var(--clay)' : 'var(--text)'} />
          <Metric label="Saldo de games" value={fmt(dGameDiff)} color={dGameDiff > 0 ? 'var(--green-d)' : dGameDiff < 0 ? 'var(--clay)' : 'var(--text)'} />
          <Metric label="Sets (G/P)" value={`${setsWon}/${setsLost}`} />
        </div>
        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Forma:</span>
          {last5.length === 0 ? (
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>sem jogos ainda</span>
          ) : (
            last5.map((f, i) => (
              <span key={i} style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: 'white', background: f === 'V' ? 'var(--green)' : 'var(--clay)' }}>{f}</span>
            ))
          )}
        </div>
      </Card>

      <SectionTitle icon="ti-users-group" style={{ marginTop: '6px' }}>
        Formar dupla <Tag variant="clay">por evento</Tag>
      </SectionTitle>

      {activeEvents.length === 0 ? (
        <Card>
          <p style={{ fontSize: '14px', color: 'var(--text2)' }}>
            Nenhum evento de duplas ativo. Peça ao organizador para criar um evento de{' '}
            <strong>Duplas</strong> em <Link href="/eventos" style={{ color: 'var(--green-d)', fontWeight: 600 }}>Eventos</Link>.
          </p>
        </Card>
      ) : (
        eventBlocks.map((b) => (
          <div key={b.ev.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--navy)' }}>
              <i className="ti ti-calendar-event" style={{ color: 'var(--green)', verticalAlign: '-2px' }} /> {b.ev.name}
            </div>
            <DoublesPanel {...b.panelProps} />
          </div>
        ))
      )}

      <Card style={{ background: 'rgba(0,196,106,.06)', borderColor: 'rgba(0,196,106,.25)' }}>
        <p style={{ fontSize: '13px', color: 'var(--text2)' }}>
          <i className="ti ti-info-circle" style={{ verticalAlign: '-2px', color: 'var(--green-d)' }} /> Para <strong>marcar jogos</strong> e
          lançar placares de duplas, vá em <Link href="/resultados" style={{ color: 'var(--green-d)', fontWeight: 600 }}>Jogos</Link>.
        </p>
      </Card>

      {/* Ranking de duplas */}
      <div>
        <SectionTitle icon="ti-medal" style={{ fontSize: '20px' }}>
          Ranking de Duplas <Tag variant="green">{ranking.length}</Tag>
        </SectionTitle>
        {ranking.length === 0 ? (
          <Card><p style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center', padding: '14px' }}>Nenhum atleta pontuando em duplas ainda.</p></Card>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>#</th><th className="name-th">Dupla</th><th>Pts</th><th>Vit.</th><th>Jogos</th></tr>
              </thead>
              <tbody>
                {ranking.map((e) => {
                  const isMe = e.members.some((mem) => mem.id === me)
                  const trClass = e.tier === 'podium' ? 't-podium' : e.tier === 'classified' ? 't-class' : ''
                  const medal = e.position <= 4 ? ' ' + MEDALS[e.position - 1] : ''
                  const rkC = e.position <= 3 ? ['rk-1', 'rk-2', 'rk-3'][e.position - 1] : 'rk-mid'
                  return (
                    <tr key={e.teamKey} className={trClass} style={isMe ? { background: 'rgba(0,196,106,.08)' } : undefined}>
                      <td><span className={`rk-num ${rkC}`}>{e.position}{medal}</span></td>
                      <td className="name-td">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ display: 'flex' }}>
                            <Avatar name={e.members[0].name} avatarUrl={e.members[0].avatarUrl} size={26} />
                            <div style={{ marginLeft: '-8px' }}><Avatar name={e.members[1]?.name ?? '?'} avatarUrl={e.members[1]?.avatarUrl} size={26} /></div>
                          </div>
                          <span>{e.members[0].name} &amp; {e.members[1]?.name ?? '?'}{isMe && <span className="me-badge">VOCÊ</span>}</span>
                        </div>
                      </td>
                      <td><span className="pts-big">{e.totalPoints}</span></td>
                      <td>{e.wins}</td>
                      <td>{e.matches}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
