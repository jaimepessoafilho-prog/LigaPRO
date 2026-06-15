/**
 * Cria (ou promove) o usuário administrador inicial.
 * NÃO insere atletas nem eventos — o banco permanece limpo para testes.
 *
 * Uso: npm run admin
 * Variáveis opcionais: ADMIN_EMAIL, ADMIN_PASS, ADMIN_NAME
 */
import 'dotenv/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const email = (process.env.ADMIN_EMAIL ?? 'jaime.pessoa.filho@gmail.com').toLowerCase()
const pass = process.env.ADMIN_PASS ?? 'j123456'
const name = process.env.ADMIN_NAME ?? 'Jaime Pessoa'

async function main() {
  const passwordHash = await bcrypt.hash(pass, 12)
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', passwordHash },
    create: {
      name,
      email,
      whatsapp: '+55 00 00000-0000',
      age: 30,
      gender: 'OTHER',
      role: 'ADMIN',
      passwordHash,
    },
  })
  console.log(`✅ Admin pronto: ${user.email} (role=${user.role})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
