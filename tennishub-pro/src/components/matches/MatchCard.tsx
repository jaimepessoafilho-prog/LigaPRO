'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { Avatar } from '@/components/ui/Avatar'

type SetScore = { p1: number; p2: number }
type Player = { id: string; name: string; avatarUrl?: string | null } | null

export type MatchView = {
  id: string
  status: string
  player1: Player
  player2: Player
  player1Id: string
  player2Id: string | null
  player3Id?: string | null
  player4Id?: string | null
  player1Partner?: string | null
  player2Partner?: string | null
  eventName: string
  sets: SetScore[]
  winnerId: string | null
  scoreSubmittedById: string | null
  scheduledAt: string | null
}

const setInputStyle: React.CSSProperties = {
  width: '46px', height: '46px', textAlign: 'center',
  fontFamily: 'var(--font-display)', fontSize: '22px', color: 'var(--navy)',
  border: '2px solid var(--border)', borderRadius: '10px', outline: 'none',
}

export function MatchCard({ match, meId }: { match: MatchView; meId: string }) {
  const router = useRouter()
  const toast = useToast()
  const [isPending, startTransition] = useTransition()
  const [sets, setSets] = useState([
    { p1: '', p2: '' },
    { p1: '', p2: '' },
    { p1: '', p2: '' },
  ])

  // Times (duplas): A = player1+player3 ; B = player2+player4
  const teamA = [match.player1Id, match.player3Id].filter(Boolean) as string[]
  const teamB = [match.player2Id, match.player4Id].filter(Boolean) as string[]
  const isProposer = teamA.includes(meId)
  const isOpponent = teamB.includes(meId)
  const submitterOnA = match.scoreSubmittedById ? teamA.includes(match.scoreSubmittedById) : false
  // Meu time lançou o placar? (então estou aguardando o adversário confirmar)
  const iSubmittedScore = !!match.scoreSubmittedById && (isProposer ? submitterOnA : !submitterOnA)

  function act(action: string, extra?: object) {
    startTransition(async () => {
      const res = await fetch(`/api/matches/${match.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (res.ok) {
        const msgs: Record<string, string> = {
          'confirm-match': 'Jogo confirmado!',
          decline: 'Jogo recusado.',
          'submit-score': 'Placar lançado! Aguardando confirmação.',
          'confirm-score': 'Placar confirmado! Pontos creditados.',
          'contest-score': 'Placar contestado.',
        }
        toast.show(msgs[action] ?? 'Feito!', action === 'decline' || action === 'contest-score' ? 'ti-flag' : 'ti-check')
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.show(data.message ?? 'Erro', 'ti-alert-triangle')
      }
    })
  }

  function submitScore() {
    const parsed = sets
      .map((s) => ({ p1: parseInt(s.p1), p2: parseInt(s.p2) }))
      .filter((s) => Number.isFinite(s.p1) && Number.isFinite(s.p2) && !(s.p1 === 0 && s.p2 === 0))
    if (parsed.length === 0) {
      toast.show('Informe ao menos um set', 'ti-alert-triangle')
      return
    }
    act('submit-score', { sets: parsed })
  }

  const p1Name = (match.player1?.name ?? '—') + (match.player1Partner ? ` & ${match.player1Partner}` : '')
  const p2Name = (match.player2?.name ?? '—') + (match.player2Partner ? ` & ${match.player2Partner}` : '')

  const scheduledLabel = match.scheduledAt
    ? new Date(match.scheduledAt).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : null

  const dateLine = (
    <div style={{ fontSize: '12px', color: 'var(--text2)', margin: '6px 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
      <i className="ti ti-calendar-time" style={{ color: 'var(--clay)' }} />
      {scheduledLabel ? <span>Proposta: <strong>{scheduledLabel}</strong></span> : <span style={{ color: 'var(--text3)' }}>Sem data definida</span>}
    </div>
  )

  const header = (
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
  )

  const score = (
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
  )

  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderLeft: `4px solid ${borderColor(match.status)}`, borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      {header}

      {/* PENDING_OPPONENT */}
      {match.status === 'PENDING_OPPONENT' && isOpponent && (
        <div>
          <span style={{ fontSize: '13px', color: 'var(--text2)' }}>
            <strong>{p1Name}</strong> propôs um jogo com você. Você concorda com o agendamento?
          </span>
          {dateLine}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-green btn-sm" disabled={isPending} onClick={() => act('confirm-match')}>
              <i className="ti ti-check" /> Aceitar agendamento
            </button>
            <button className="btn btn-outline btn-sm" disabled={isPending} onClick={() => act('decline')}>
              <i className="ti ti-x" /> Recusar
            </button>
          </div>
        </div>
      )}
      {match.status === 'PENDING_OPPONENT' && isProposer && (
        <div>
          {dateLine}
          <span className="badge-pend">Aguardando {p2Name} aceitar o agendamento</span>
        </div>
      )}

      {/* SCHEDULED or CONTESTED → lançar placar */}
      {(match.status === 'SCHEDULED' || match.status === 'CONTESTED') && (
        <div>
          {match.status === 'SCHEDULED' && scheduledLabel && (
            <div style={{ fontSize: '12px', color: 'var(--green-d)', marginBottom: '8px', fontWeight: 600 }}>
              <i className="ti ti-calendar-check" style={{ verticalAlign: '-2px' }} /> Agendamento aceito — {scheduledLabel}
            </div>
          )}
          {match.status === 'CONTESTED' && (
            <div style={{ fontSize: '12px', color: 'var(--clay)', marginBottom: '8px' }}>
              <i className="ti ti-flag" /> Placar contestado — lance novamente.
            </div>
          )}
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
          <div style={{ fontSize: '11px', color: 'var(--text3)', marginBottom: '4px' }}>
            {p1Name} (esq.) × {p2Name} (dir.)
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text3)', marginBottom: '8px' }}>
            Até 3 sets · tie-break em 6-6 nos sets 1 e 2 · 3º set em super tie-break (10 pts)
          </div>
          <button className="btn btn-green btn-sm" disabled={isPending} onClick={submitScore}>
            <i className="ti ti-send" /> Lançar placar
          </button>
        </div>
      )}

      {/* PENDING_SCORE */}
      {match.status === 'PENDING_SCORE' && (
        <div>
          {score}
          {iSubmittedScore ? (
            <span className="badge-pend">Aguardando {isProposer ? p2Name : p1Name} confirmar o placar</span>
          ) : (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text2)', flex: 1 }}>Confira o placar lançado pelo adversário:</span>
              <button className="btn btn-green btn-sm" disabled={isPending} onClick={() => act('confirm-score')}>
                <i className="ti ti-check" /> Confirmar
              </button>
              <button className="btn btn-outline btn-sm" disabled={isPending} onClick={() => act('contest-score')}>
                <i className="ti ti-flag" /> Contestar
              </button>
            </div>
          )}
        </div>
      )}

      {/* FINISHED */}
      {match.status === 'FINISHED' && (
        <div>
          {score}
          <span className="badge-ok">
            <i className="ti ti-trophy" style={{ verticalAlign: '-2px' }} /> Vencedor: {match.winnerId === match.player1Id ? p1Name : p2Name}
          </span>
        </div>
      )}
    </div>
  )
}

function borderColor(status: string) {
  switch (status) {
    case 'FINISHED': return 'var(--green)'
    case 'PENDING_SCORE': return 'var(--gold)'
    case 'CONTESTED': return 'var(--red)'
    case 'SCHEDULED': return 'var(--navy-l)'
    default: return 'var(--clay)'
  }
}
