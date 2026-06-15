'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

export function RemoveRegistrationButton({
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

  function remove() {
    if (!window.confirm(`Remover ${athleteName} deste evento?`)) return
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/registrations?userId=${userId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.show('Inscrição removida', 'ti-user-minus')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao remover', 'ti-alert-triangle')
      }
    })
  }

  return (
    <button
      onClick={remove}
      disabled={isPending}
      title={`Remover ${athleteName}`}
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        color: 'var(--red)',
        width: '32px',
        height: '32px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isPending ? 'not-allowed' : 'pointer',
        flexShrink: 0,
      }}
    >
      <i className="ti ti-trash" style={{ fontSize: '16px' }} />
    </button>
  )
}
