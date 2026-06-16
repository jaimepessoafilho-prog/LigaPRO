import type { ReactNode } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'

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
      <main className="content page">{children}</main>
      <MobileNav />
    </div>
  )
}
