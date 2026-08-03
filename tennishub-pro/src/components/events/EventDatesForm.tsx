'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

function toInputDate(iso: string): string {
  return iso.slice(0, 10)
}

export function EventDatesForm({ eventId, startDate, endDate }: { eventId: string; startDate: string; endDate: string }) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [start, setStart] = useState(toInputDate(startDate))
  const [end, setEnd] = useState(toInputDate(endDate))

  const dirty = start !== toInputDate(startDate) || end !== toInputDate(endDate)

  function confirm() {
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/dates`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startDate: start, endDate: end }),
      })
      if (res.ok) {
        toast.show('Datas atualizadas!', 'ti-check')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao atualizar datas', 'ti-alert-triangle')
      }
    })
  }

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div>
        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: '4px' }}>Início</label>
        <input type="date" className="input-field" value={start} onChange={(e) => setStart(e.target.value)} />
      </div>
      <div>
        <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: '4px' }}>Término</label>
        <input type="date" className="input-field" value={end} onChange={(e) => setEnd(e.target.value)} />
      </div>
      {dirty && (
        <button className="btn btn-green btn-sm" disabled={isPending} onClick={confirm}>
          <i className="ti ti-check" /> Confirmar alteração
        </button>
      )}
    </div>
  )
}
