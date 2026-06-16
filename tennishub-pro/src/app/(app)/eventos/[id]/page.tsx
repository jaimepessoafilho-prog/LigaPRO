import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, SectionTitle, Tag } from '@/components/ui/Card'
import { RegisterButton } from '@/components/events/RegisterButton'
import { RemoveRegistrationButton } from '@/components/events/RemoveRegistrationButton'
import { ConfirmRegistrationButton } from '@/components/events/ConfirmRegistrationButton'
import { EventScheduleForm } from '@/components/events/EventScheduleForm'
import { AdminAddAthlete } from '@/components/events/AdminAddAthlete'
import { EventStatusControl } from '@/components/events/EventStatusControl'
import { Avatar } from '@/components/ui/Avatar'
import { isAdminRole } from '@/lib/nav'
import {
  FORMAT_LABELS, MATCH_TYPE_LABELS, CATEGORY_LABELS, DRAW_TYPE_LABELS,
  type CBTFormat, type CBTMatchType, type CBTCategory,
} from '@/lib/cbt-rules'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Rascunho', cls: 'badge-pend' },
  OPEN: { label: 'Inscrições abertas', cls: 'badge-ok' },
  CLOSED: { label: 'Encerrado', cls: 'badge-pend' },
  IN_PROGRESS: { label: 'Em andamento', cls: 'badge-ok' },
  FINISHED: { label: 'Finalizado', cls: 'badge-cont' },
  CANCELLED: { label: 'Cancelado', cls: 'badge-cont' },
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const me = session?.user?.id ?? ''

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { registeredAt: 'asc' },
      },
    },
  })
  if (!event) notFound()

  const myReg = event.registrations.find((r) => r.userId === me)
  const admin = isAdminRole(session?.user?.role)
  const st = STATUS[event.status] ?? STATUS.DRAFT

  const confirmed = event.registrations.filter((r) => r.status === 'CONFIRMED')
  const pending = event.registrations.filter((r) => r.status === 'PENDING')

  // Atletas ainda não inscritos (para o admin inscrever)
  const registeredIds = event.registrations.map((r) => r.userId)
  const availableAthletes = admin
    ? await prisma.user.findMany({
        where: { role: 'ATHLETE', id: { notIn: registeredIds.length ? registeredIds : ['__none__'] } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  // Agendamento dentro do evento (só Todos contra Todos, participante confirmado, evento ativo)
  const myConfirmed = myReg?.status === 'CONFIRMED'
  const canSchedule =
    myConfirmed && event.matchType === 'ROUND_ROBIN' && (event.status === 'OPEN' || event.status === 'IN_PROGRESS')

  let scheduleOpponents: { id: string; name: string }[] = []
  if (canSchedule) {
    // Jogos que já tenho neste evento (qualquer status menos cancelado) → evita duplicidade
    const myMatches = await prisma.match.findMany({
      where: {
        eventId: id,
        status: { not: 'CANCELLED' },
        OR: [{ player1Id: me }, { player2Id: me }],
      },
      select: { player1Id: true, player2Id: true },
    })
    const alreadyPlayed = new Set<string>()
    myMatches.forEach((m) => {
      alreadyPlayed.add(m.player1Id === me ? (m.player2Id ?? '') : m.player1Id)
    })
    scheduleOpponents = confirmed
      .filter((r) => r.userId !== me && !alreadyPlayed.has(r.userId))
      .map((r) => ({ id: r.userId, name: r.user.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <Link href="/eventos" style={{ color: 'var(--text3)', fontSize: '13px' }}>
        <i className="ti ti-arrow-left" style={{ verticalAlign: '-2px' }} /> Voltar para eventos
      </Link>

      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', color: 'var(--navy)', letterSpacing: '.5px' }}>
              {event.name}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginTop: '4px' }}>
              <i className="ti ti-map-pin" style={{ verticalAlign: '-2px' }} /> {event.location} ·{' '}
              {new Date(event.startDate).toLocaleDateString('pt-BR')} a {new Date(event.endDate).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <span className={st.cls}>{st.label}</span>
        </div>

        {event.description && (
          <p style={{ color: 'var(--text2)', fontSize: '14px', marginTop: '12px' }}>{event.description}</p>
        )}

        <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
          <Tag variant="navy">{FORMAT_LABELS[event.format as CBTFormat]}</Tag>
          <Tag variant="clay">{MATCH_TYPE_LABELS[event.matchType as CBTMatchType]}</Tag>
          <Tag variant="gold">{CATEGORY_LABELS[event.category as CBTCategory]}</Tag>
          <Tag variant="green">{DRAW_TYPE_LABELS[event.drawType]}</Tag>
        </div>

        <div style={{ marginTop: '18px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <RegisterButton eventId={event.id} registered={!!myReg} closed={event.status !== 'OPEN'} />
          {event.maxParticipants && (
            <span style={{ fontSize: '12px', color: 'var(--text3)' }}>
              {confirmed.length}/{event.maxParticipants} confirmados
            </span>
          )}
        </div>

        {myReg?.status === 'PENDING' && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,197,24,.12)', border: '1px solid rgba(245,197,24,.3)', fontSize: '13px', color: 'var(--gold-d)' }}>
            <i className="ti ti-clock" style={{ verticalAlign: '-2px' }} /> Inscrição enviada — aguardando confirmação do organizador.
          </div>
        )}
      </Card>

      {canSchedule && (
        <Card style={{ borderLeft: '4px solid var(--green)' }}>
          <EventScheduleForm eventId={event.id} opponents={scheduleOpponents} />
        </Card>
      )}

      {admin && (
        <Card style={{ background: 'rgba(245,197,24,.06)', borderColor: 'rgba(245,197,24,.3)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gold-d)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: '10px' }}>
            <i className="ti ti-shield-star" style={{ verticalAlign: '-2px' }} /> Gestão do organizador
          </div>
          <EventStatusControl eventId={event.id} status={event.status} />
          <div style={{ height: '1px', background: 'var(--border)', margin: '14px 0' }} />
          <AdminAddAthlete eventId={event.id} available={availableAthletes} />
        </Card>
      )}

      {/* Pendentes de confirmação */}
      {pending.length > 0 && (admin || pending.some((r) => r.userId === me)) && (
        <div>
          <SectionTitle icon="ti-clock" style={{ fontSize: '20px' }}>
            Aguardando confirmação <Tag variant="gold">{pending.length}</Tag>
          </SectionTitle>
          <Card>
            {pending.map((r) => (
              <div key={r.id} className="athlete-row">
                <Avatar name={r.user.name} avatarUrl={r.user.avatarUrl} />
                <div style={{ flex: 1 }}>
                  <div className="athlete-name">
                    {r.user.name}
                    {r.userId === me && <span className="me-badge">VOCÊ</span>}
                  </div>
                  <div className="athlete-meta">Pendente</div>
                </div>
                {admin && (
                  <ConfirmRegistrationButton eventId={event.id} userId={r.userId} athleteName={r.user.name} />
                )}
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Confirmados */}
      <div>
        <SectionTitle icon="ti-users" style={{ fontSize: '20px' }}>
          Inscritos confirmados <Tag variant="green">{confirmed.length}</Tag>
        </SectionTitle>
        <Card>
          {confirmed.length === 0 ? (
            <p style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
              Nenhum atleta confirmado ainda.
            </p>
          ) : (
            confirmed.map((r) => (
              <div key={r.id} className="athlete-row">
                <Avatar name={r.user.name} avatarUrl={r.user.avatarUrl} />
                <div style={{ flex: 1 }}>
                  <div className="athlete-name">
                    {r.user.name}
                    {r.userId === me && <span className="me-badge">VOCÊ</span>}
                  </div>
                </div>
                {admin && (
                  <RemoveRegistrationButton eventId={event.id} userId={r.userId} athleteName={r.user.name} />
                )}
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
