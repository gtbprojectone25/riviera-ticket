// API Route: GET /api/ticket/:id/barcode
// Retorna barcode (blurred ou real conforme data do evento)

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tickets, sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { barcodeService } from '@/lib/barcode-service'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticketId = params.id

    // Buscar ticket
    const [ticket] = await db
      .select({
        ticket: tickets,
        session: sessions,
      })
      .from(tickets)
      .innerJoin(sessions, eq(sessions.id, tickets.sessionId))
      .where(eq(tickets.id, ticketId))
      .limit(1)

    if (!ticket) {
      return NextResponse.json(
        { error: 'Ticket não encontrado' },
        { status: 404 }
      )
    }

    // TODO: Verificar autenticação e ownership
    // const userId = getUserIdFromRequest(request)
    // if (ticket.ticket.userId !== userId) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    // }

    // Verificar se deve revelar barcode real
    const revealDate = ticket.ticket.barcodeRevealedAt || ticket.session.startTime
    const shouldReveal = new Date() >= new Date(revealDate)

    // Buscar imagem do barcode
    const barcodeBuffer = await barcodeService.getBarcodeImage(
      ticketId,
      shouldReveal ? new Date(revealDate) : null
    )

    return new NextResponse(barcodeBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error fetching barcode:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar barcode' },
      { status: 500 }
    )
  }
}

