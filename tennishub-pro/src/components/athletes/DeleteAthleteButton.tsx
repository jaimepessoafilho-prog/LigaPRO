'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'

export function DeleteAthleteButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()

  function remove() {
    if (!window.confirm(`Excluir o atleta ${name}? Isso remove TODAS as inscrições, partidas e pontos dele. Esta ação não pode ser desfeita.`)) return
    startTransition(async () => {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.show('Atleta excluído', 'ti-user-x')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao excluir', 'ti-alert-triangle')
      }
    })
  }

  return (
    <button
      onClick={remove}
      disabled={isPending}
      title={`Excluir ${name}`}
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
