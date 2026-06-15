import type { ReactNode } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { MobileNav } from '@/components/layout/MobileNav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-bg">
      <TopNav />
      <main className="content page">{children}</main>
      <MobileNav />
    </div>
  )
}
