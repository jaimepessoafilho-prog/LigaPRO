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
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.avatarUrl = user.avatarUrl
      }
      // Atualização disparada por useSession().update() após editar o perfil
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name
        if ('avatarUrl' in session) token.avatarUrl = session.avatarUrl
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.avatarUrl = token.avatarUrl as string | null | undefined
      if (token.name) session.user.name = token.name as string
      return session
    },
  },
} satisfies NextAuthConfig
