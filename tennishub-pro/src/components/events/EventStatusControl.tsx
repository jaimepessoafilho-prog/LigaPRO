'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

type Status = 'DRAFT' | 'OPEN' | 'CLOSED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED'

// Próximas transições oferecidas conforme o estado atual
const NEXT: Record<Status, { to: Status; label: string; icon: string; variant: string }[]> = {
  DRAFT: [{ to: 'OPEN', label: 'Abrir inscrições', icon: 'ti-lock-open', variant: 'btn-green' }],
  OPEN: [
    { to: 'CLOSED', label: 'Encerrar inscrições', icon: 'ti-lock', variant: 'btn-outline' },
    { to: 'IN_PROGRESS', label: 'Iniciar evento', icon: 'ti-player-play', variant: 'btn-green' },
  ],
  CLOSED: [
    { to: 'OPEN', label: 'Reabrir inscrições', icon: 'ti-lock-open', variant: 'btn-outline' },
    { to: 'IN_PROGRESS', label: 'Iniciar evento', icon: 'ti-player-play', variant: 'btn-green' },
  ],
  IN_PROGRESS: [{ to: 'FINISHED', label: 'Finalizar evento', icon: 'ti-flag-check', variant: 'btn-green' }],
  FINISHED: [],
  CANCELLED: [],
}

export function EventStatusControl({ eventId, status }: { eventId: string; status: Status }) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  function setStatus(to: Status, label: string) {
    if (to === 'FINISHED' && !window.confirm('Finalizar o evento? As posições finais serão calculadas.')) return
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: to }),
      })
      if (res.ok) {
        toast.show(`${label} ✓`, 'ti-check')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro', 'ti-alert-triangle')
      }
    })
  }

  const options = NEXT[status] ?? []
  const canCancel = status !== 'FINISHED' && status !== 'CANCELLED'

  function deleteEvent() {
    if (!window.confirm('EXCLUIR este evento permanentemente? Todas as inscrições, partidas e pontos deste evento serão removidos. Não pode ser desfeito.')) return
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.show('Evento excluído', 'ti-trash')
        router.push('/eventos')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao excluir', 'ti-alert-triangle')
      }
    })
  }

  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      {options.map((o) => (
        <button key={o.to} className={`btn btn-sm ${o.variant}`} disabled={isPending} onClick={() => setStatus(o.to, o.label)}>
          <i className={`ti ${o.icon}`} /> {o.label}
        </button>
      ))}
      {canCancel && (
        <button
          className="btn btn-sm btn-outline"
          style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
          disabled={isPending}
          onClick={() => {
            if (window.confirm('Cancelar este evento?')) setStatus('CANCELLED', 'Evento cancelado')
          }}
        >
          <i className="ti ti-ban" /> Cancelar evento
        </button>
      )}
      <button
        className="btn btn-sm"
        style={{ background: 'var(--red)', color: 'white', border: '1.5px solid var(--red)' }}
        disabled={isPending}
        onClick={deleteEvent}
      >
        <i className="ti ti-trash" /> Excluir evento
      </button>
    </div>
  )
}
