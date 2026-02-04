import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { sessions, seats, tickets } from '@/db/schema'
import { requireRole } from '@/lib/admin-auth'
import { eq } from 'drizzle-orm'
import { generateSeatsForSession } from '@/server/seats/generateSeatsForSession'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function POST(_: NextRequest, context: RouteContext) {
  try {
    await requireRole(['ADMIN', 'SUPER_ADMIN', 'SUPPORT'])

    const { id } = await context.params

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)

    if (!session) {
      return NextResponse.json({ error: 'Sessao nao encontrada' }, { status: 404 })
    }

    const [ticket] = await db
      .select({ id: tickets.id })
      .from(tickets)
      .where(eq(tickets.sessionId, id))
      .limit(1)

    if (ticket) {
      return NextResponse.json(
        { error: 'Sessao ja possui tickets emitidos' },
        { status: 409 },
      )
    }

    await db.delete(seats).where(eq(seats.sessionId, id))

    const result = await generateSeatsForSession(id)

    return NextResponse.json({ success: true, created: result.created })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error regenerating seats:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
