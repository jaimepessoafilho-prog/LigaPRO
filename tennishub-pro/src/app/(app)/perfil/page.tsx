import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { Card } from '@/components/ui/Card'
import { LogoutButton } from '@/components/layout/LogoutButton'

export const dynamic = 'force-dynamic'

export default async function PerfilPage() {
  const session = await auth()
  const user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id } })
    : null

  if (!user) {
    return (
      <Card>
        <p style={{ color: 'var(--text2)', fontSize: '14px' }}>Perfil não encontrado.</p>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <ProfileForm
        initial={{
          name: user.name,
          whatsapp: user.whatsapp,
          age: user.age,
          gender: user.gender as 'MALE' | 'FEMALE' | 'OTHER',
          avatarUrl: user.avatarUrl,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <LogoutButton variant="full" />
      </div>
    </div>
  )
}
