'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { NAV_ITEMS, isAdminRole } from '@/lib/nav'
import { Avatar } from '@/components/ui/Avatar'

export function TopNav({ avatarUrl }: { avatarUrl?: string | null }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role
  const admin = isAdminRole(role)
  const name = session?.user?.name ?? 'Atleta'

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || admin)

  return (
    <nav className="topnav">
      <div className="nav-brand">
        LIGA<em>PRO</em>
      </div>

      <div className="nav-links">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <i className={`ti ${item.icon}`} />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="nav-right">
        <span className={`role-pill ${admin ? 'role-admin' : 'role-atleta'}`}>
          {admin ? 'ADMIN' : 'ATLETA'}
        </span>
        <div className="user-chip" onClick={() => signOut({ callbackUrl: '/login' })} title="Sair">
          <Avatar name={name} avatarUrl={avatarUrl} size={30} className="user-av" />
          <span className="user-name">{name.split(' ')[0]}</span>
        </div>
      </div>
    </nav>
  )
}
