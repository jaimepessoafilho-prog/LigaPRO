'use client'

import { signOut } from 'next-auth/react'

export function LogoutButton({
  variant = 'icon',
}: {
  variant?: 'icon' | 'full'
}) {
  if (variant === 'full') {
    return (
      <button
        className="btn btn-outline"
        onClick={() => signOut({ callbackUrl: '/login' })}
        style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
      >
        <i className="ti ti-logout" /> Sair da conta
      </button>
    )
  }

  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      title="Sair"
      style={{
        background: 'rgba(255,255,255,.07)',
        border: '1px solid rgba(255,255,255,.1)',
        color: 'rgba(255,255,255,.7)',
        borderRadius: '9999px',
        width: '34px',
        height: '34px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <i className="ti ti-logout" style={{ fontSize: '17px' }} />
    </button>
  )
}
