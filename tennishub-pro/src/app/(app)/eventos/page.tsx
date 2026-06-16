import Link from 'next/link'
import { auth } from '@/lib/auth'
import type { CSSProperties } from 'react'
import { prisma } from '@/lib/prisma'
import { isAdminRole } from '@/lib/nav'
import { Card, SectionTitle, Tag } from '@/components/ui/Card'
import {
  FORMAT_LABELS,
  MATCH_TYPE_LABELS,
  CATEGORY_LABELS,
  type CBTFormat,
  type CBTMatchType,
  type CBTCategory,
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

export default async function EventosPage() {
  const session = await auth()
  const admin = isAdminRole(session?.user?.role)
  const me = session?.user?.id ?? ''

  const [events, myRegs] = await Promise.all([
    prisma.event.findMany({
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { registrations: true } } },
    }),
    prisma.eventRegistration.findMany({
      where: { userId: me },
      select: { eventId: true, status: true },
    }),
  ])

  // eventId -> status da minha inscrição
  const myStatusByEvent = new Map(myRegs.map((r) => [r.eventId, r.status]))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <SectionTitle icon="ti-calendar-event">
          Eventos <Tag variant="green">{events.length}</Tag>
        </SectionTitle>
        {admin && (
          <Link href="/eventos/novo" className="btn btn-green" style={{ textDecoration: 'none' }}>
            <i className="ti ti-plus" /> Novo Evento
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📅</div>
            <p style={{ color: 'var(--text2)', fontSize: '14px', marginBottom: admin ? '16px' : 0 }}>
              Nenhum evento criado ainda.
            </p>
            {admin && (
              <Link href="/eventos/novo" className="btn btn-green" style={{ textDecoration: 'none' }}>
                <i className="ti ti-plus" /> Criar primeiro evento
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {events.map((e) => {
            const st = STATUS[e.status] ?? STATUS.DRAFT
            const myStatus = myStatusByEvent.get(e.id)
            const cardLink: CSSProperties = { textDecoration: 'none', color: 'inherit', display: 'block' }
            return (
              <Link key={e.id} href={`/eventos/${e.id}`} style={cardLink}>
                <Card style={myStatus === 'CONFIRMED' ? { borderLeft: '4px solid var(--green)' } : undefined}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--navy)', letterSpacing: '.5px' }}>
                        {e.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '4px' }}>
                        <i className="ti ti-map-pin" style={{ verticalAlign: '-2px' }} /> {e.location} ·{' '}
                        {new Date(e.startDate).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                      <span className={st.cls}>{st.label}</span>
                      {myStatus === 'CONFIRMED' && <span className="badge-ok"><i className="ti ti-circle-check" style={{ verticalAlign: '-2px' }} /> Você está inscrito</span>}
                      {myStatus === 'PENDING' && <span className="badge-pend"><i className="ti ti-clock" style={{ verticalAlign: '-2px' }} /> Inscrição pendente</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                    <Tag variant="navy">{FORMAT_LABELS[e.format as CBTFormat]}</Tag>
                    <Tag variant="clay">{MATCH_TYPE_LABELS[e.matchType as CBTMatchType]}</Tag>
                    <Tag variant="gold">{CATEGORY_LABELS[e.category as CBTCategory]}</Tag>
                    <Tag variant="green">{e._count.registrations} inscritos</Tag>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--green-d)', fontWeight: 600 }}>
                    {myStatus ? 'Ver detalhes' : 'Ver detalhes e inscrever-se'} <i className="ti ti-arrow-right" style={{ verticalAlign: '-2px' }} />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
