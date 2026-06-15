import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

// Instância edge-safe (sem Prisma) só para checagem de sessão no middleware
const { auth } = NextAuth(authConfig)

const PUBLIC_PATHS = ['/login', '/register', '/api/auth', '/api/users']

export default auth((req) => {
  const { pathname } = req.nextUrl

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Admin-only routes
  if (pathname.startsWith('/admin')) {
    const role = req.auth.user?.role
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
