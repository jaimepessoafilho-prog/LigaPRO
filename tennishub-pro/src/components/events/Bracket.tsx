import { Avatar } from '@/components/ui/Avatar'

type Player = { id: string; name: string; avatarUrl?: string | null } | null
type SetScore = { p1: number; p2: number }

export type BracketMatch = {
  id: string
  status: string
  player1: Player
  player2: Player
  player1Id: string
  player2Id: string | null
  winnerId: string | null
  walkover: boolean
  sets: SetScore[]
}

export type BracketDraw = {
  id: string
  round: number
  phase: string
  matches: BracketMatch[]
}

const PHASE_LABEL: Record<string, string> = {
  GROUP_STAGE: 'Fase de Grupos',
  ROUND_OF_64: 'Segunda Rodada',
  ROUND_OF_32: 'Terceira Rodada',
  ROUND_OF_16: 'Oitavas de Final',
  QUARTER_FINALS: 'Quartas de Final',
  SEMI_FINALS: 'Semifinais',
  FINAL: 'Final',
  THIRD_PLACE: 'Disputa de 3º',
}

function PlayerRow({ player, isWinner, score }: { player: Player; isWinner: boolean; score?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
      <Avatar name={player?.name ?? '—'} avatarUrl={player?.avatarUrl} size={22} />
      <span style={{ flex: 1, fontSize: '13px', fontWeight: isWinner ? 700 : 500, color: isWinner ? 'var(--green-d)' : player ? 'var(--text)' : 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {player?.name ?? 'A definir'}
      </span>
      {score && <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--navy)' }}>{score}</span>}
      {isWinner && <i className="ti ti-check" style={{ color: 'var(--green)', fontSize: '14px' }} />}
    </div>
  )
}

function MatchBox({ m }: { m: BracketMatch }) {
  const p1Score = m.sets.map((s) => s.p1).join(' ')
  const p2Score = m.sets.map((s) => s.p2).join(' ')
  const border =
    m.status === 'FINISHED' || m.status === 'WALKOVER' ? 'var(--green)' : m.status === 'SCHEDULED' ? 'var(--navy-l)' : 'var(--border)'
  return (
    <div style={{ width: '210px', background: 'white', border: '1px solid var(--border)', borderLeft: `4px solid ${border}`, borderRadius: '10px', padding: '8px 10px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
      <PlayerRow player={m.player1} isWinner={m.winnerId === m.player1Id} score={m.sets.length ? p1Score : undefined} />
      <div style={{ borderTop: '1px solid var(--border)', margin: '2px 0' }} />
      <PlayerRow player={m.player2} isWinner={!!m.player2Id && m.winnerId === m.player2Id} score={m.sets.length ? p2Score : undefined} />
      {m.walkover && <div style={{ fontSize: '10px', color: 'var(--clay)', marginTop: '4px' }}>W.O. — avançou direto</div>}
    </div>
  )
}

export function Bracket({ draws }: { draws: BracketDraw[] }) {
  if (draws.length === 0) return null
  return (
    <div style={{ overflowX: 'auto', paddingBottom: '8px' }}>
      <div style={{ display: 'flex', gap: '20px', minWidth: 'max-content' }}>
        {draws.map((d) => (
          <div key={d.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', textAlign: 'center' }}>
              {PHASE_LABEL[d.phase] ?? d.phase}
            </div>
            {d.matches.map((m) => <MatchBox key={m.id} m={m} />)}
          </div>
        ))}
      </div>
    </div>
  )
}
