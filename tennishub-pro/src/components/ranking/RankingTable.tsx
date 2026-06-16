'use client'

import { motion } from 'framer-motion'
import type { RankingEntry } from '@/lib/ranking'
import { Avatar } from '@/components/ui/Avatar'

const MEDALS = ['🥇', '🥈', '🥉', '⭐']

function zoneTag(tier: RankingEntry['tier']) {
  if (tier === 'podium') return <span className="zone-tag zt-p">Pódio</span>
  if (tier === 'classified') return <span className="zone-tag zt-c">Top 8</span>
  if (tier === 'danger') return <span className="zone-tag zt-d">Zona ▼</span>
  return null
}

function rkClass(entry: RankingEntry) {
  if (entry.position <= 4) return ['rk-1', 'rk-2', 'rk-3', 'rk-top'][entry.position - 1]
  if (entry.tier === 'danger') return 'rk-bot'
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
            <th>Vit.</th>
            <th>Jogos</th>
            <th title="Saldo de sets">S.Sets</th>
            <th title="Saldo de games">S.Games</th>
            {showEvents && <th>Ev.</th>}
            <th>Zona</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const isMe = e.userId === currentUserId
            const trClass =
              e.tier === 'podium' ? 't-podium' : e.tier === 'classified' ? 't-class' : e.tier === 'danger' ? 't-danger' : ''
            const medal = e.position <= 4 ? ' ' + MEDALS[e.position - 1] : ''
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
                  <span className={`rk-num ${rkClass(e)}`}>{e.position}</span>
                </td>
                <td className="name-td">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Avatar name={e.name} avatarUrl={e.avatarUrl} size={28} />
                    <span>{e.name}{medal}</span>
                    {isMe && <span className="me-badge">VOCÊ</span>}
                  </div>
                </td>
                <td>
                  <span className="pts-big">{e.totalPoints}</span>
                </td>
                <td>{e.wins}</td>
                <td>{e.matches}</td>
                <td className={e.setDiff > 0 ? 'ss-pos' : e.setDiff < 0 ? 'ss-neg' : ''}>
                  {e.setDiff > 0 ? `+${e.setDiff}` : e.setDiff}
                </td>
                <td className={e.gameDiff > 0 ? 'ss-pos' : e.gameDiff < 0 ? 'ss-neg' : ''}>
                  {e.gameDiff > 0 ? `+${e.gameDiff}` : e.gameDiff}
                </td>
                {showEvents && <td>{e.eventsCount}</td>}
                <td>{zoneTag(e.tier)}</td>
              </motion.tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
