export type NavItem = {
  href: string
  icon: string
  label: string
  mobileLabel: string
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: 'ti-dashboard', label: 'Dashboard', mobileLabel: 'Início' },
  { href: '/ranking', icon: 'ti-medal', label: 'Ranking', mobileLabel: 'Ranking' },
  { href: '/resultados', icon: 'ti-clipboard-list', label: 'Resultados', mobileLabel: 'Resultados' },
  { href: '/perfil', icon: 'ti-user-circle', label: 'Perfil', mobileLabel: 'Perfil' },
  { href: '/eventos', icon: 'ti-calendar-event', label: 'Eventos', mobileLabel: 'Eventos', adminOnly: true },
]

export function isAdminRole(role?: string | null) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}
