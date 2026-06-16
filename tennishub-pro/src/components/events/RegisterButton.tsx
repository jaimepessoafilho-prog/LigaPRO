'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

export function RegisterButton({
  eventId,
  registered,
  closed,
}: {
  eventId: string
  registered: boolean
  closed: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/registrations`, {
        method: registered ? 'DELETE' : 'POST',
      })
      if (res.ok) {
        if (registered) {
          toast.show('Inscrição cancelada', 'ti-x')
          router.refresh()
        } else {
          // Após inscrever-se, volta para a lista de eventos
          toast.show('Inscrição enviada! Aguarde a confirmação do organizador.', 'ti-check')
          router.push('/eventos')
          router.refresh()
        }
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro', 'ti-alert-triangle')
      }
    })
  }

  if (closed && !registered) {
    return <span className="badge-pend">Inscrições encerradas</span>
  }

  return (
    <button
      className={`btn ${registered ? 'btn-outline' : 'btn-green'}`}
      disabled={isPending}
      onClick={toggle}
    >
      <i className={`ti ${registered ? 'ti-user-minus' : 'ti-user-plus'}`} />
      {isPending ? '...' : registered ? 'Cancelar inscrição' : 'Inscrever-se'}
    </button>
  )
}
