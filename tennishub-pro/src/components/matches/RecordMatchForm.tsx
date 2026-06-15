'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, SectionTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'

type Option = { id: string; name: string }

const setInputStyle: React.CSSProperties = {
  width: '52px', height: '52px', textAlign: 'center',
  fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--navy)',
  border: '2px solid var(--border)', borderRadius: '12px', outline: 'none',
}

export function RecordMatchForm({ events, athletes }: { events: Option[]; athletes: Option[] }) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [sets, setSets] = useState([
    { p1: '', p2: '' },
    { p1: '', p2: '' },
    { p1: '', p2: '' },
  ])

  function setScore(i: number, side: 'p1' | 'p2', value: string) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, [side]: value } : s)))
  }

  const canSubmit = eventId && p1 && p2 && p1 !== p2

  function submit() {
    const parsedSets = sets
      .map((s) => ({ p1: parseInt(s.p1), p2: parseInt(s.p2) }))
      .filter((s) => Number.isFinite(s.p1) && Number.isFinite(s.p2) && !(s.p1 === 0 && s.p2 === 0))

    if (parsedSets.length === 0) {
      toast.show('Informe ao menos um set', 'ti-alert-triangle')
      return
    }

    startTransition(async () => {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, player1Id: p1, player2Id: p2, sets: parsedSets }),
      })
      if (res.ok) {
        toast.show('Resultado lançado!', 'ti-check')
        setP1('')
        setP2('')
        setSets([{ p1: '', p2: '' }, { p1: '', p2: '' }, { p1: '', p2: '' }])
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao lançar', 'ti-alert-triangle')
      }
    })
  }

  if (events.length === 0) {
    return (
      <Card>
        <SectionTitle icon="ti-clipboard-list">Lançar Resultado</SectionTitle>
        <p style={{ color: 'var(--text2)', fontSize: '14px' }}>
          Crie um evento primeiro para poder lançar partidas.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <SectionTitle icon="ti-clipboard-list">Lançar Resultado</SectionTitle>

      <div style={{ marginBottom: '14px' }}>
        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: '6px' }}>
          Evento
        </label>
        <select className="input-field" value={eventId} onChange={(e) => setEventId(e.target.value)}>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <select className="input-field" value={p1} onChange={(e) => setP1(e.target.value)}>
          <option value="">Atleta 1</option>
          {athletes.map((a) => <option key={a.id} value={a.id} disabled={a.id === p2}>{a.name}</option>)}
        </select>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--clay)' }}>VS</span>
        <select className="input-field" value={p2} onChange={(e) => setP2(e.target.value)}>
          <option value="">Atleta 2</option>
          {athletes.map((a) => <option key={a.id} value={a.id} disabled={a.id === p1}>{a.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', margin: '8px 0 18px' }}>
        {sets.map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
              Set {i + 1}
            </label>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input style={setInputStyle} inputMode="numeric" maxLength={2} value={s.p1} onChange={(e) => setScore(i, 'p1', e.target.value)} />
              <span style={{ color: 'var(--text3)', fontWeight: 700 }}>×</span>
              <input style={setInputStyle} inputMode="numeric" maxLength={2} value={s.p2} onChange={(e) => setScore(i, 'p2', e.target.value)} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-green" disabled={!canSubmit || isPending} onClick={submit}>
          <i className="ti ti-send" /> {isPending ? 'Lançando...' : 'Lançar Resultado'}
        </button>
      </div>
    </Card>
  )
}
