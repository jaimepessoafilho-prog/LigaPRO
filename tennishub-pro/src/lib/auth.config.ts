import type { NextAuthConfig } from 'next-auth'

/**
 * Configuração base do NextAuth — SEM Prisma/bcrypt, portanto segura para o
 * Edge Runtime (middleware). Os providers que tocam o banco ficam em auth.ts.
 */
export const authConfig = {
  // Confia no host fornecido pela Vercel (necessário para previews/produção)
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      // IMPORTANTE: não guardar avatarUrl no token — a foto (base64) deixa o
      // cookie grande demais e causa 494 REQUEST_HEADER_TOO_LARGE. O avatar é
      // sempre lido do banco nas páginas/componentes.
      if (trigger === 'update' && session?.name) {
        token.name = session.name
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      if (token.name) session.user.name = token.name as string
      return session
    },
  },
} satisfies NextAuthConfig
