import type { NextAuthConfig } from 'next-auth'

/**
 * Configuração base do NextAuth — SEM Prisma/bcrypt, portanto segura para o
 * Edge Runtime (middleware). Os providers que tocam o banco ficam em auth.ts.
 */
export const authConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.avatarUrl = user.avatarUrl
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.avatarUrl = token.avatarUrl as string | null | undefined
      return session
    },
  },
} satisfies NextAuthConfig
