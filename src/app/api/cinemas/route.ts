import { NextResponse } from 'next/server'
import { db } from '@/db'
import { cinemas } from '@/db/schema'

export async function GET() {
  try {
    const allCinemas = await db.select().from(cinemas)
    return NextResponse.json(allCinemas)
  } catch (error) {
    console.error('Erro ao listar cinemas:', error)
    return NextResponse.json(
      { error: 'Erro ao listar cinemas' },
      { status: 500 },
    )
  }
}

