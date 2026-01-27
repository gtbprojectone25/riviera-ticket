import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { seats } from '@/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type SeatStatus = 'available' | 'occupied'

type SeatResponse = {
  id: string
  row: string
  number: number
  type: string
  status: SeatStatus
}

type RowResponse = {
  label: string
  seats: SeatResponse[]
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params

    // sessionId vem do banco como UUID. Se for um mock (ex: "session-abc-4"),
    // evitamos quebrar a query e retornamos erro claro.
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json(
        { error: 'sessionId inválido. Use o ID UUID real da sessão salva no banco.' },
        { status: 400 },
      )
    }

    const dbSeats = await db
      .select()
      .from(seats)
      .where(eq(seats.sessionId, sessionId))

    const seatMap = new Map<string, SeatResponse[]>()
    const now = new Date()

    for (const seat of dbSeats) {
      const rowLabel = seat.row
      if (!seatMap.has(rowLabel)) {
        seatMap.set(rowLabel, [])
      }

      const isHeld = seat.status === 'HELD' && seat.heldUntil && seat.heldUntil > now
      const isAvailable = seat.status === 'AVAILABLE' || (seat.status === 'HELD' && !isHeld)
      const status: SeatStatus = isAvailable ? 'available' : 'occupied'

      seatMap.get(rowLabel)!.push({
        id: seat.seatId,
        row: seat.row,
        number: seat.number,
        type: seat.type,
        status,
      })
    }

    const rows: RowResponse[] = Array.from(seatMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, rowSeats]) => ({
        label,
        seats: rowSeats.sort(
          (a, b) => Number(a.number) - Number(b.number),
        ),
      }))

    return NextResponse.json(rows)
  } catch (error) {
    console.error('Erro ao buscar assentos da sessão:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar assentos da sessão' },
      { status: 500 },
    )
  }
}
