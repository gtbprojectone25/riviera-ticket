import { NextRequest, NextResponse } from 'next/server'
import { getQueueStatus } from '@/db/queries'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const entryId = searchParams.get('entryId')

    if (!entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 })
    }

    const status = await getQueueStatus(entryId)

    if (!status) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 })
    }

    return NextResponse.json(status)
  } catch (error) {
    console.error('Erro ao buscar status da fila:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar status da fila' },
      { status: 500 },
    )
  }
}
