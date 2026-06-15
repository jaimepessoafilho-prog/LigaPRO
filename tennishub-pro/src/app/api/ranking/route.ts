import { NextRequest, NextResponse } from 'next/server'
import { calculateUnifiedRanking } from '@/lib/ranking'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam) : undefined

  const ranking = await calculateUnifiedRanking(year)
  return NextResponse.json(ranking)
}
