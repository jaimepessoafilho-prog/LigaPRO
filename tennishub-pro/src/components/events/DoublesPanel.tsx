'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SectionTitle } from '@/components/ui/Card'
import { useToast } from '@/components/ui/Toast'

type Option = { id: string; name: string }

export function DoublesPanel({
  eventId,
  registered,
  myStatus,
  partnerId,
  partnerName,
  partnerStatus,
  available,
  open,
}: {
  eventId: string
  registered: boolean
  myStatus: string | null
  partnerId: string | null
  partnerName: string | null
  partnerStatus: string | null
  available: Option[]
  open: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [inviteeId, setInviteeId] = useState('')

  function call(method: 'POST' | 'PATCH' | 'DELETE', body?: object, okMsg?: string) {
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/doubles/invite`, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        toast.show(okMsg ?? data.message ?? 'Feito!', 'ti-check')
        router.refresh()
      } else {
        toast.show(data.message ?? 'Erro', 'ti-alert-triangle')
      }
    })
  }

  const card: React.CSSProperties = { borderLeft: '4px solid var(--clay)' }

  // Sou o convidado (pendente) → aceitar/recusar
  if (registered && myStatus === 'PENDING' && partnerId) {
    return (
      <Wrap style={card}>
        <p style={{ fontSize: '14px', color: 'var(--text2)', marginBottom: '10px' }}>
          👥 <strong>{partnerName}</strong> convidou você para formar dupla neste torneio.
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-green btn-sm" disabled={isPending} onClick={() => call('PATCH', { inviterId: partnerId }, 'Parceria confirmada!')}>
            <i className="ti ti-check" /> Aceitar
          </button>
          <button className="btn btn-outline btn-sm" disabled={isPending} onClick={() => call('DELETE', undefined, 'Convite recusado')}>
            <i className="ti ti-x" /> Recusar
          </button>
        </div>
      </Wrap>
    )
  }

  // Sou o convidador, aguardando o parceiro aceitar
  if (registered && myStatus === 'CONFIRMED' && partnerId && partnerStatus === 'PENDING') {
    return (
      <Wrap style={card}>
        <p style={{ fontSize: '14px', color: 'var(--text2)' }}>
          ⏳ Aguardando <strong>{partnerName}</strong> aceitar o convite de dupla.
        </p>
        <button className="btn btn-outline btn-sm" style={{ marginTop: '10px' }} disabled={isPending} onClick={() => call('DELETE', undefined, 'Convite cancelado')}>
          <i className="ti ti-x" /> Cancelar convite
        </button>
      </Wrap>
    )
  }

  // Dupla formada — não pode ser desfeita pelo atleta (só o organizador)
  if (registered && myStatus === 'CONFIRMED' && partnerId && partnerStatus === 'CONFIRMED') {
    return (
      <Wrap style={{ borderLeft: '4px solid var(--green)' }}>
        <p style={{ fontSize: '14px', color: 'var(--text)' }}>
          ✅ Dupla formada: <strong>Você + {partnerName}</strong>
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '8px' }}>
          <i className="ti ti-lock" style={{ verticalAlign: '-2px' }} /> A dupla está fixada para este evento. Mudanças só com autorização do organizador.
        </p>
      </Wrap>
    )
  }

  // Sem dupla ainda → convidar (se inscrições abertas)
  return (
    <Wrap style={card}>
      {!open ? (
        <p style={{ fontSize: '13px', color: 'var(--text3)' }}>Inscrições encerradas para formar dupla.</p>
      ) : available.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text3)' }}>Não há atletas disponíveis para convidar no momento.</p>
      ) : (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="input-field" style={{ flex: 1, minWidth: '180px' }} value={inviteeId} onChange={(e) => setInviteeId(e.target.value)}>
            <option value="">Convidar parceiro…</option>
            {available.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button className="btn btn-green" disabled={!inviteeId || isPending} onClick={() => call('POST', { inviteeId }, 'Convite enviado!')}>
            <i className="ti ti-send" /> Convidar
          </button>
        </div>
      )}
    </Wrap>
  )
}

function Wrap({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={style}>
      <SectionTitle icon="ti-users-group" style={{ fontSize: '18px', marginBottom: '10px' }}>
        Duplas
      </SectionTitle>
      {children}
    </div>
  )
}
