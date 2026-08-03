import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isAdminRole } from '@/lib/nav'
import { recomputeAllPoints } from '@/lib/ranking-recompute'

/**
 * Recalcula os pontos de ranking (vitória + participação) de todos os eventos
 * com jogos FINISHED, a partir do zero. Idempotente: pode rodar quantas vezes
 * precisar, sempre convergindo para o total correto — inclusive para quem
 * organiza e também joga (admin), que antes ficava de fora da pontuação.
 */
export async function POST() {
  const session = await auth()
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
  }

  const result = await recomputeAllPoints()
  return NextResponse.json(result)
}
