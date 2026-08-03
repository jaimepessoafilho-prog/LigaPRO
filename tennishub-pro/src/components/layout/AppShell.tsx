import type { ReactNode } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'
import { APP_VERSION } from '@/lib/version'

export function AppShell({
  children,
  avatarUrl,
}: {
  children: ReactNode
  avatarUrl?: string | null
}) {
  return (
    <div className="app-bg">
      <TopNav avatarUrl={avatarUrl} />
      <main className="content page">
        {children}
        <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--text3)', marginTop: '24px' }}>{APP_VERSION}</div>
      </main>
      <MobileNav />
    </div>
  )
}
