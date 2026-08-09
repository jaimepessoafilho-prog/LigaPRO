'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { Avatar } from '@/components/ui/Avatar'

type SetScore = { p1: number; p2: number }
type Player = { id: string; name: string; avatarUrl?: string | null } | null

export type AdminMatchView = {
  id: string
  status: string
  eventId: string
  eventName: string
  eventFinished: boolean
  player1: Player
  player2: Player
  player1Id: string
  player2Id: string | null
  player1Partner: string | null
  player2Partner: string | null
  sets: SetScore[]
  winnerId: string | null
  isAdminScore: boolean
  resultType: string | null
  suggestedWinnerId: string | null
  matchesPlayedA: number
  matchesPlayedB: number
  // Correção de placar proposta, pendente de anuência das duas partes
  correctionPendingSets: SetScore[] | null
  correctionConfirmedA: boolean
  correctionConfirmedB: boolean
  correctionProposedByName: string | null
  correctionContestedByName: string | null
}

const setInputStyle: React.CSSProperties = {
  width: '46px', height: '46px', textAlign: 'center',
  fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--navy)',
  border: '2px solid var(--border)', borderRadius: '10px', outline: 'none',
}

export function AdminMatchPanel({ match }: { match: AdminMatchView }) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [correcting, setCorrecting] = useState(false)
  const [sets, setSets] = useState(() => {
    const base = [{ p1: '', p2: '' }, { p1: '', p2: '' }, { p1: '', p2: '' }]
    match.sets.forEach((s, i) => {
      if (i < 3) base[i] = { p1: String(s.p1), p2: String(s.p2) }
    })
    return base
  })

  const p1Name = (match.player1?.name ?? '—') + (match.player1Partner ? ` & ${match.player1Partner}` : '')
  const p2Name = (match.player2?.name ?? '—') + (match.player2Partner ? ` & ${match.player2Partner}` : '')
  const locked = match.eventFinished

  function submitCorrection() {
    const parsed = sets
      .map((s) => ({ p1: parseInt(s.p1), p2: parseInt(s.p2) }))
      .filter((s) => Number.isFinite(s.p1) && Number.isFinite(s.p2) && !(s.p1 === 0 && s.p2 === 0))
    if (parsed.length === 0) {
      toast.show('Informe ao menos um set', 'ti-alert-triangle')
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/matches/${match.id}/admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'propose-correction', sets: parsed }),
      })
      if (res.ok) {
        toast.show('Correção proposta! Aguardando ciência das duas partes.', 'ti-check')
        setCorrecting(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao propor correção', 'ti-alert-triangle')
      }
    })
  }

  function forceApplyCorrection() {
    if (!window.confirm('Aplicar a correção proposta mesmo sem a anuência das duas partes?')) return
    startTransition(async () => {
      const res = await fetch(`/api/matches/${match.id}/admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'force-apply-correction' }),
      })
      if (res.ok) {
        toast.show('Correção aplicada! Ranking recalculado.', 'ti-check')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao aplicar correção', 'ti-alert-triangle')
      }
    })
  }

  function cancelCorrection() {
    if (!window.confirm('Cancelar esta proposta de correção? O placar atual é mantido.')) return
    startTransition(async () => {
      const res = await fetch(`/api/matches/${match.id}/admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel-correction' }),
      })
      if (res.ok) {
        toast.show('Proposta de correção cancelada.', 'ti-flag')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao cancelar correção', 'ti-alert-triangle')
      }
    })
  }

  function declareWO(winnerId: string, winnerName: string) {
    if (!window.confirm(`Fechar este jogo como W.O. Admin (6/0 6/0) para ${winnerName}?`)) return
    startTransition(async () => {
      const res = await fetch(`/api/matches/${match.id}/admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'wo-admin', winnerId }),
      })
      if (res.ok) {
        toast.show('Jogo fechado como W.O. Admin! Ranking recalculado.', 'ti-flag')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro ao fechar jogo', 'ti-alert-triangle')
      }
    })
  }

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderLeft: `4px solid ${match.status === 'FINISHED' ? 'var(--green)' : 'var(--clay)'}`, borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
          <Avatar name={p1Name} avatarUrl={match.player1?.avatarUrl} size={28} />
          <span>{p1Name}</span>
          <span style={{ color: 'var(--clay)', fontFamily: 'var(--font-display)', margin: '0 2px' }}>VS</span>
          <span>{p2Name}</span>
          <Avatar name={p2Name} avatarUrl={match.player2?.avatarUrl} size={28} />
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text3)' }}>
          <i className="ti ti-calendar-event" style={{ verticalAlign: '-2px' }} /> {match.eventName}
        </span>
      </div>

      {match.status === 'FINISHED' ? (
        <div>
          <div style={{ display: 'flex', gap: '10px', fontFamily: 'var(--font-display)', fontSize: '20px', color: 'var(--navy)', margin: '6px 0' }}>
            {match.sets.map((s, i) => {
              const p1Won = s.p1 > s.p2
              return (
                <span key={i}>
                  <span style={{ color: p1Won ? 'var(--green-d)' : 'var(--text2)' }}>{s.p1}</span>
                  <span style={{ color: 'var(--text3)' }}>/</span>
                  <span style={{ color: !p1Won ? 'var(--green-d)' : 'var(--text2)' }}>{s.p2}</span>
                </span>
              )
            })}
          </div>
          <span className="badge-ok">
            <i className="ti ti-trophy" style={{ verticalAlign: '-2px' }} /> Vencedor: {match.winnerId === match.player1Id ? p1Name : p2Name}
          </span>
          {match.isAdminScore && (
            <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--clay)', fontWeight: 600 }}>
              <i className="ti ti-shield-star" style={{ verticalAlign: '-2px' }} /> W.O. Admin — placar inserido pelo ADMIN
            </div>
          )}

          {match.correctionPendingSets && (
            <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '10px', background: 'rgba(200,90,26,.08)', border: '1px solid rgba(200,90,26,.25)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--clay)', marginBottom: '4px' }}>
                <i className="ti ti-hourglass" style={{ verticalAlign: '-2px' }} /> Correção proposta — aguardando ciência
              </div>
              <div style={{ fontSize: '13px', color: 'var(--navy)', marginBottom: '6px' }}>
                Placar proposto: {match.correctionPendingSets.map((s, i) => (
                  <span key={i} style={{ fontFamily: 'var(--font-display)', marginRight: '8px' }}>{s.p1}/{s.p2}</span>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '4px' }}>
                {p1Name}: {match.correctionConfirmedA ? '✅ confirmou' : '⏳ aguardando'} · {p2Name}: {match.correctionConfirmedB ? '✅ confirmou' : '⏳ aguardando'}
              </div>
              {match.correctionContestedByName && (
                <div style={{ fontSize: '11px', color: 'var(--red)', fontWeight: 600, marginBottom: '6px' }}>
                  <i className="ti ti-flag" style={{ verticalAlign: '-2px' }} /> Contestada por {match.correctionContestedByName}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                <button className="btn btn-green btn-sm" disabled={isPending} onClick={forceApplyCorrection}>
                  <i className="ti ti-shield-check" /> Forçar aplicação
                </button>
                <button className="btn btn-outline btn-sm" disabled={isPending} onClick={cancelCorrection}>
                  <i className="ti ti-x" /> Cancelar correção
                </button>
              </div>
            </div>
          )}

          {!locked && (
            correcting ? (
              <div style={{ marginTop: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '10px' }}>
                  {sets.map((s, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <label style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: '4px' }}>SET {i + 1}</label>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <input style={setInputStyle} inputMode="numeric" maxLength={2} value={s.p1}
                          onChange={(e) => setSets((p) => p.map((x, idx) => (idx === i ? { ...x, p1: e.target.value } : x)))} />
                        <span style={{ color: 'var(--text3)' }}>×</span>
                        <input style={setInputStyle} inputMode="numeric" maxLength={2} value={s.p2}
                          onChange={(e) => setSets((p) => p.map((x, idx) => (idx === i ? { ...x, p2: e.target.value } : x)))} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-green btn-sm" disabled={isPending} onClick={submitCorrection}>
                    <i className="ti ti-check" /> {match.correctionPendingSets ? 'Propor nova correção' : 'Propor correção'}
                  </button>
                  <button className="btn btn-outline btn-sm" disabled={isPending} onClick={() => setCorrecting(false)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '10px' }}>
                <button className="btn btn-outline btn-sm" disabled={isPending} onClick={() => setCorrecting(true)}>
                  <i className="ti ti-edit" /> {match.correctionPendingSets ? 'Corrigir placar (reenvia a proposta)' : 'Corrigir placar'}
                </button>
              </div>
            )
          )}
        </div>
      ) : (
        <div>
          <span className="badge-pend">Aguardando realização</span>
          {!match.player2Id ? (
            <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '8px' }}>Confronto incompleto — sem adversário definido.</p>
          ) : locked ? (
            <p style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '8px' }}>Evento encerrado.</p>
          ) : (
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '6px' }}>
                Fechamento administrativo (W.O. Admin — 6/0 6/0) · jogos realizados: {p1Name.split(' ')[0]} {match.matchesPlayedA} × {match.matchesPlayedB} {p2Name.split(' ')[0]}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className={`btn btn-sm ${match.suggestedWinnerId === match.player1Id ? 'btn-green' : 'btn-outline'}`}
                  disabled={isPending}
                  onClick={() => declareWO(match.player1Id, p1Name)}
                >
                  <i className="ti ti-trophy" /> {p1Name} {match.suggestedWinnerId === match.player1Id && '(sugerido)'}
                </button>
                <button
                  className={`btn btn-sm ${match.suggestedWinnerId === match.player2Id ? 'btn-green' : 'btn-outline'}`}
                  disabled={isPending}
                  onClick={() => declareWO(match.player2Id as string, p2Name)}
                >
                  <i className="ti ti-trophy" /> {p2Name} {match.suggestedWinnerId === match.player2Id && '(sugerido)'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
