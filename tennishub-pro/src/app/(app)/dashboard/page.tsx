import { auth } from '@/lib/auth'
import { StatsCard } from '@/components/ui/StatsCard'
import { Card, SectionTitle, Tag } from '@/components/ui/Card'

export default async function DashboardPage() {
  const session = await auth()
  const name = session?.user?.name ?? 'Atleta'

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          background: 'var(--navy)',
          borderRadius: '20px',
          padding: '30px 32px',
          marginBottom: '20px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 28px rgba(0,0,0,.13)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 70% 90% at -5% 110%, rgba(0,196,106,.22) 0%, transparent 55%),' +
              'radial-gradient(ellipse 50% 60% at 110% 0%, rgba(200,90,26,.14) 0%, transparent 55%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '44px', color: 'white', letterSpacing: '1px', lineHeight: 1 }}>
            Olá, <em style={{ color: 'var(--green)', fontStyle: 'normal' }}>{name.split(' ')[0]}</em>
          </div>
          <div style={{ color: 'rgba(255,255,255,.36)', fontSize: '12px', marginTop: '6px' }}>
            Bem-vindo à sua liga de tênis recreativo
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        <StatsCard label="Pontos" value={0} icon="⭐" />
        <StatsCard label="Vitórias" value={0} icon="🏆" />
        <StatsCard label="Partidas" value={0} icon="🎾" />
        <StatsCard label="Eventos" value={0} icon="📅" />
      </div>

      {/* Placeholder de próximos passos */}
      <Card>
        <SectionTitle icon="ti-rocket">
          Migração em andamento <Tag variant="gold">Fase 2 / 5</Tag>
        </SectionTitle>
        <p style={{ color: 'var(--text2)', fontSize: '14px', lineHeight: 1.7 }}>
          O shell visual (navegação, cards, tema) está pronto. Os dados reais de ranking,
          partidas e estatísticas chegam na <strong>Fase 3 — Módulo do Atleta</strong>.
        </p>
      </Card>
    </div>
  )
}
