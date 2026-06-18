'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

export function GenerateDrawButton({ eventId, hasDraw }: { eventId: string; hasDraw: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [preventPartnerClash, setPreventPartnerClash] = useState(true)

  function generate() {
    const msg = hasDraw
      ? 'Já existe uma chave. Gerar uma NOVA substitui a anterior? (as partidas atuais da chave serão recriadas)'
      : 'Gerar a chave do torneio agora? Os atletas confirmados serão sorteados.'
    if (!window.confirm(msg)) return
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preventPartnerClash }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.show(data.message ?? 'Chave gerada!', 'ti-sitemap')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao gerar chave', 'ti-alert-triangle')
      }
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <button className="btn btn-green" disabled={isPending} onClick={generate}>
        <i className="ti ti-sitemap" /> {isPending ? 'Gerando...' : hasDraw ? 'Gerar nova chave' : 'Gerar chave'}
      </button>
      <label style={{ fontSize: '12px', color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input type="checkbox" checked={preventPartnerClash} onChange={(e) => setPreventPartnerClash(e.target.checked)} style={{ accentColor: 'var(--green)' }} />
        Evitar parceiros/conflitos na 1ª rodada
      </label>
    </div>
  )
}
