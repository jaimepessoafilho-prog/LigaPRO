'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, SectionTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'

type Option = { id: string; name: string }

const labelStyle: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'var(--text2)',
  textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: '6px',
}

export function ScheduleMatchForm({
  events,
  opponentsByEvent,
}: {
  events: Option[]
  opponentsByEvent: Record<string, Option[]>
}) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [opponentId, setOpponentId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  const opponents = opponentsByEvent[eventId] ?? []
  const canSubmit = eventId && opponentId

  function submit() {
    startTransition(async () => {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, opponentId, scheduledAt: scheduledAt || null }),
      })
      if (res.ok) {
        toast.show('Convite enviado ao adversário!', 'ti-send')
        setOpponentId('')
        setScheduledAt('')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao marcar jogo', 'ti-alert-triangle')
      }
    })
  }

  if (events.length === 0) {
    return (
      <Card>
        <SectionTitle icon="ti-calendar-plus">Marcar Jogo</SectionTitle>
        <p style={{ color: 'var(--text2)', fontSize: '14px' }}>
          Você ainda não tem inscrição <strong>confirmada</strong> em nenhum evento
          <strong> Todos contra Todos</strong>. Inscreva-se em <strong>Eventos</strong> e aguarde
          a confirmação do organizador para marcar jogos.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <SectionTitle icon="ti-calendar-plus">Marcar Jogo</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Evento</label>
          <select
            className="input-field"
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value)
              setOpponentId('')
            }}
          >
            {events.map((ev) => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Adversário</label>
          {opponents.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text3)' }}>
              Nenhum outro atleta inscrito neste evento ainda.
            </p>
          ) : (
            <select className="input-field" value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
              <option value="">Escolha o adversário</option>
              {opponents.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          )}
        </div>
        <div>
          <label style={labelStyle}>Data e horário do jogo (proposta)</label>
          <input type="datetime-local" className="input-field" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
          <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>
            O adversário precisa <strong>aceitar este agendamento</strong> para o jogo valer.
          </p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-green" disabled={!canSubmit || isPending} onClick={submit}>
            <i className="ti ti-send" /> {isPending ? 'Enviando...' : 'Enviar convite'}
          </button>
        </div>
      </div>
    </Card>
  )
}
