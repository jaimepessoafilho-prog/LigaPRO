export type NavItem = {
  href: string
  icon: string
  label: string
  mobileLabel: string
  adminOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', icon: 'ti-dashboard', label: 'Dashboard', mobileLabel: 'Início' },
  { href: '/eventos', icon: 'ti-calendar-event', label: 'Eventos', mobileLabel: 'Eventos' },
  { href: '/ranking', icon: 'ti-medal', label: 'Ranking', mobileLabel: 'Ranking' },
  { href: '/duplas', icon: 'ti-users-group', label: 'Duplas', mobileLabel: 'Duplas' },
  { href: '/atletas', icon: 'ti-users', label: 'Atletas', mobileLabel: 'Atletas' },
  { href: '/resultados', icon: 'ti-clipboard-list', label: 'Resultados', mobileLabel: 'Jogos' },
  { href: '/perfil', icon: 'ti-user-circle', label: 'Perfil', mobileLabel: 'Perfil' },
]

export function isAdminRole(role?: string | null) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN'
}
