import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      role: string
      avatarUrl?: string | null
    }
  }

  interface User {
    id: string
    role: string
    avatarUrl?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    avatarUrl?: string | null
  }
}
