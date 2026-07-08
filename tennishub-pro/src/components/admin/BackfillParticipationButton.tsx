'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

export function BackfillParticipationButton({ pendingEvents }: { pendingEvents: number }) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  function apply() {
    const ok = window.confirm(
      `Recalcular os pontos (vitória + participação) de ${pendingEvents} evento(s) a partir dos jogos já finalizados? Isso substitui o total de pontos de cada participante (inclusive admin) pelo valor correto.`,
    )
    if (!ok) return
    startTransition(async () => {
      const res = await fetch('/api/admin/backfill-participation-points', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.show(`✓ ${data.athletesUpdated} participante(s) recalculado(s) em ${data.eventsProcessed} evento(s)`, 'ti-check')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao recalcular', 'ti-alert-triangle')
      }
    })
  }

  return (
    <button className="btn btn-sm btn-green" disabled={isPending} onClick={apply}>
      <i className="ti ti-award" /> Recalcular pontos ({pendingEvents})
    </button>
  )
}
