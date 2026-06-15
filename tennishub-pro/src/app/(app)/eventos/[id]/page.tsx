import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, SectionTitle, Tag } from '@/components/ui/Card'
import { RegisterButton } from '@/components/events/RegisterButton'
import { RemoveRegistrationButton } from '@/components/events/RemoveRegistrationButton'
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

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  const me = session?.user?.id ?? ''

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { registeredAt: 'asc' },
      },
    },
  })
  if (!event) notFound()

  const myReg = event.registrations.find((r) => r.userId === me)
  const admin = isAdminRole(session?.user?.role)
  const st = STATUS[event.status] ?? STATUS.DRAFT

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
              {event.registrations.length}/{event.maxParticipants} vagas
            </span>
          )}
        </div>
      </Card>

      <div>
        <SectionTitle icon="ti-users" style={{ fontSize: '20px' }}>
          Inscritos <Tag variant="green">{event.registrations.length}</Tag>
        </SectionTitle>
        <Card>
          {event.registrations.length === 0 ? (
            <p style={{ color: 'var(--text2)', fontSize: '14px', textAlign: 'center', padding: '16px' }}>
              Ninguém inscrito ainda. Seja o primeiro!
            </p>
          ) : (
            event.registrations.map((r) => (
              <div key={r.id} className="athlete-row">
                <div className="athlete-av">{initials(r.user.name)}</div>
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
