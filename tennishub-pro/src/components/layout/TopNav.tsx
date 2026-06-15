'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { NAV_ITEMS, isAdminRole } from '@/lib/nav'

export function TopNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const role = session?.user?.role
  const admin = isAdminRole(role)
  const name = session?.user?.name ?? 'Atleta'
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()

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
          <div className="user-av">{initials}</div>
          <span className="user-name">{name.split(' ')[0]}</span>
        </div>
      </div>
    </nav>
  )
}
