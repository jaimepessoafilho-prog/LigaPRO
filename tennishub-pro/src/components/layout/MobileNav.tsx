'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { NAV_ITEMS, isAdminRole } from '@/lib/nav'

export function MobileNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const admin = isAdminRole(session?.user?.role)
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || admin)

  return (
    <nav className="mob-nav">
      <div className="mob-tabs">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`mob-tab ${pathname.startsWith(item.href) ? 'active' : ''}`}
          >
            <i className={`ti ${item.icon}`} />
            {item.mobileLabel}
          </Link>
        ))}
      </div>
    </nav>
  )
}
