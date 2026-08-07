import { Avatar } from '@/components/ui/Avatar'
import type { AdminMatchView } from '@/components/matches/AdminMatchPanel'

/** Mesmo card do painel do admin, mas sem nenhuma ação — só consulta, pra qualquer atleta ver o resultado dos outros. */
export function AthleteMatchReadOnly({ match }: { match: AdminMatchView }) {
  const p1Name = (match.player1?.name ?? '—') + (match.player1Partner ? ` & ${match.player1Partner}` : '')
  const p2Name = (match.player2?.name ?? '—') + (match.player2Partner ? ` & ${match.player2Partner}` : '')

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
        </div>
      ) : (
        <span className="badge-pend">Aguardando realização</span>
      )}
    </div>
  )
}
