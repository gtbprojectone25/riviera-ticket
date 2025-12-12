import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { and, eq, gt, or, ilike } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const cinemaId = searchParams.get('cinemaId')
    const auditoriumId = searchParams.get('auditoriumId')

    const now = new Date()

    // Buscar sessões - se cinemaId fornecido, buscar por cinemaId OU cinemaName
    // (para compatibilidade com dados antigos que usam cinemaName)
    const rows = await db
      .select()
      .from(sessions)
      .where(
        and(
          gt(sessions.startTime, now),
          cinemaId 
            ? or(
                eq(sessions.cinemaId, cinemaId),
                ilike(sessions.cinemaName, `%${cinemaId.replace(/-/g, ' ')}%`)
              )
            : undefined,
          auditoriumId ? eq(sessions.auditoriumId, auditoriumId) : undefined,
        ),
      )

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Erro ao listar sessions:', error)
    return NextResponse.json(
      { error: 'Erro ao listar sessões' },
      { status: 500 },
    )
  }
}
