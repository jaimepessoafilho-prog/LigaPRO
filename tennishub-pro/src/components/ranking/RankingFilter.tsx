'use client'

import { useRouter } from 'next/navigation'

type EventOption = { id: string; name: string }

export function RankingFilter({
  events,
  selected,
  basePath = '/ranking',
}: {
  events: EventOption[]
  selected: string
  basePath?: string
}) {
  const router = useRouter()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        Visualizar:
      </span>
      <select
        className="input-field"
        style={{ maxWidth: '320px' }}
        value={selected}
        onChange={(e) => {
          const v = e.target.value
          router.push(v ? `${basePath}?event=${v}` : basePath)
        }}
      >
        <option value="">🏆 Geral (soma de todos os eventos)</option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>📅 {ev.name}</option>
        ))}
      </select>
    </div>
  )
}
