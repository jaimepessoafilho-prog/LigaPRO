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
      `Aplicar +1 ponto de participação (vencedor e perdedor) nos jogos já finalizados de ${pendingEvents} evento(s)? Isso soma pontos ao total atual de cada atleta. Não pode ser desfeito automaticamente.`,
    )
    if (!ok) return
    startTransition(async () => {
      const res = await fetch('/api/admin/backfill-participation-points', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.show(`✓ ${data.athletesUpdated} atleta(s) ajustado(s) em ${data.eventsProcessed} evento(s)`, 'ti-check')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao aplicar ajuste', 'ti-alert-triangle')
      }
    })
  }

  return (
    <button className="btn btn-sm btn-green" disabled={isPending} onClick={apply}>
      <i className="ti ti-award" /> Aplicar ponto de participação retroativo ({pendingEvents})
    </button>
  )
}
