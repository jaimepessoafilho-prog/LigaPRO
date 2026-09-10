'use client'

import { motion } from 'framer-motion'
import type { RankingEntry } from '@/lib/ranking'
import { Avatar } from '@/components/ui/Avatar'

/** Classe por posição (bandas fixas de 4): A = mais nobre até E = iniciante. 21+ não tem classe. */
type ClassBand = 'A' | 'B' | 'C' | 'D' | 'E' | null
function classBand(position: number): ClassBand {
  if (position <= 4) return 'A'
  if (position <= 8) return 'B'
  if (position <= 12) return 'C'
  if (position <= 16) return 'D'
  if (position <= 20) return 'E'
  return null
}

function classBadge(cls: ClassBand) {
  if (!cls) return null
  return <span className={`cls-badge cls-${cls}`}>{cls}</span>
}

function rkClass(position: number) {
  const cls = classBand(position)
  if (cls) return `rk-class${cls}`
  return 'rk-mid'
}

export function RankingTable({
  entries,
  currentUserId,
  showEvents = false,
}: {
  entries: RankingEntry[]
  currentUserId?: string
  showEvents?: boolean
}) {
  if (entries.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎾</div>
        <p style={{ color: 'var(--text2)', fontSize: '14px' }}>
          Nenhum atleta no ranking ainda. Cadastre atletas para começar.
        </p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th className="name-th">Atleta</th>
            <th>Pts</th>
            <th title="Vitórias (não conta W.O. Admin)">V</th>
            <th title="Derrotas (não conta W.O. Admin)">D</th>
            <th>Jogos</th>
            <th title="Saldo de sets">S.Sets</th>
            <th title="Saldo de games">S.Games</th>
            {showEvents && <th>Ev.</th>}
            <th>Classe</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const isMe = e.userId === currentUserId
            const cls = classBand(e.position)
            const trClass = cls ? `tr-class${cls}` : 'tr-unclassed'
            return (
              <motion.tr
                key={e.userId}
                className={trClass}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.6) }}
                style={isMe ? { background: 'rgba(0,196,106,.08)', borderLeft: '3px solid var(--green)' } : undefined}
              >
                <td>
                  <span className={`rk-num ${rkClass(e.position)}`}>{cls ?? ''}{e.position}</span>
                </td>
                <td className="name-td">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Avatar name={e.name} avatarUrl={e.avatarUrl} size={28} />
                    <span>{e.name}</span>
                    {isMe && <span className="me-badge">VOCÊ</span>}
                  </div>
                </td>
                <td>
                  <span className="pts-big">{e.totalPoints}</span>
                </td>
                <td>{e.wins}</td>
                <td>{e.losses}</td>
                <td>{e.matches}</td>
                <td className={e.setDiff > 0 ? 'ss-pos' : e.setDiff < 0 ? 'ss-neg' : ''}>
                  {e.setDiff > 0 ? `+${e.setDiff}` : e.setDiff}
                </td>
                <td className={e.gameDiff > 0 ? 'ss-pos' : e.gameDiff < 0 ? 'ss-neg' : ''}>
                  {e.gameDiff > 0 ? `+${e.gameDiff}` : e.gameDiff}
                </td>
                {showEvents && <td>{e.eventsCount}</td>}
                <td>{classBadge(cls)}</td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
