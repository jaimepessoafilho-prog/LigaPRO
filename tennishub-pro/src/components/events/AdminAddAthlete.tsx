'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

type Option = { id: string; name: string }

export function AdminAddAthlete({ eventId, available }: { eventId: string; available: Option[] }) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [userId, setUserId] = useState('')

  function add() {
    if (!userId) return
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        toast.show('Atleta inscrito!', 'ti-user-plus')
        setUserId('')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao inscrever', 'ti-alert-triangle')
      }
    })
  }

  if (available.length === 0) {
    return (
      <p style={{ fontSize: '12px', color: 'var(--text3)', margin: 0 }}>
        Todos os atletas cadastrados já estão inscritos.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
      <select
        className="input-field"
        style={{ flex: 1, minWidth: '180px' }}
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      >
        <option value="">Inscrever atleta…</option>
        {available.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
      <button className="btn btn-green" disabled={!userId || isPending} onClick={add}>
        <i className="ti ti-user-plus" /> {isPending ? '...' : 'Inscrever'}
      </button>
    </div>
  )
}
