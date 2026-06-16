'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

export function ConfirmRegistrationButton({
  eventId,
  userId,
  athleteName,
}: {
  eventId: string
  userId: string
  athleteName: string
}) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  function act(action: 'confirm' | 'reject') {
    if (action === 'reject' && !window.confirm(`Recusar a inscrição de ${athleteName}?`)) return
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/registrations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      })
      if (res.ok) {
        toast.show(action === 'confirm' ? 'Inscrição confirmada' : 'Inscrição recusada', action === 'confirm' ? 'ti-check' : 'ti-x')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro', 'ti-alert-triangle')
      }
    })
  }

  return (
    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
      <button className="btn btn-green btn-sm" disabled={isPending} onClick={() => act('confirm')}>
        <i className="ti ti-check" /> Confirmar
      </button>
      <button className="btn btn-outline btn-sm" disabled={isPending} onClick={() => act('reject')} style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
        <i className="ti ti-x" />
      </button>
    </div>
  )
}
