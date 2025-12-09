import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { auditoriums } from '@/db/schema'
import { eq } from 'drizzle-orm'

interface Params {
  cinemaId: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const { cinemaId } = await params

    const rows = await db
      .select()
      .from(auditoriums)
      .where(eq(auditoriums.cinemaId, cinemaId))

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Erro ao listar auditoriums:', error)
    return NextResponse.json(
      { error: 'Erro ao listar auditoriums' },
      { status: 500 },
    )
  }
}

