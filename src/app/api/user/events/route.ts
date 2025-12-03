// API Route: GET /api/user/events
// Lista eventos/tickets do usuário

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { tickets, sessions } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    // TODO: Obter userId do JWT token
    // const userId = getUserIdFromRequest(request)
    const userId = request.headers.get('x-user-id') // Temporário

    if (!userId) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Buscar tickets do usuário
    const userTickets = await db
      .select({
        ticket: tickets,
        session: sessions,
      })
      .from(tickets)
      .innerJoin(sessions, eq(sessions.id, tickets.sessionId))
      .where(eq(tickets.userId, userId))

    // Agrupar por sessão/evento
    const events = userTickets.reduce((acc, item) => {
      const sessionId = item.session.id
      if (!acc[sessionId]) {
        acc[sessionId] = {
          session: item.session,
          tickets: [],
        }
      }
      acc[sessionId].tickets.push(item.ticket)
      return acc
    }, {} as Record<string, { session: typeof sessions.$inferSelect; tickets: typeof tickets.$inferSelect[] }>)

    return NextResponse.json({
      events: Object.values(events),
    })
  } catch (error) {
    console.error('Error fetching user events:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar eventos' },
      { status: 500 }
    )
  }
}

