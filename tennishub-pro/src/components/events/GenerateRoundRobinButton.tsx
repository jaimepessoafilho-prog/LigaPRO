'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

export function GenerateRoundRobinButton({ eventId }: { eventId: string }) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  function generate() {
    if (!window.confirm('Gerar todos os confrontos ainda faltantes entre os atletas confirmados? Os jogos já existentes não são alterados.')) return
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/generate-matches`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.show(data.created > 0 ? `${data.created} confronto(s) gerado(s)!` : 'Nenhum confronto novo — já estava completo.', 'ti-sitemap')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao gerar confrontos', 'ti-alert-triangle')
      }
    })
  }

  return (
    <button className="btn btn-outline btn-sm" disabled={isPending} onClick={generate}>
      <i className="ti ti-sitemap" /> {isPending ? 'Gerando...' : 'Gerar confrontos pendentes'}
    </button>
  )
}
