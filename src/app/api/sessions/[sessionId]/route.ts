import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { movies, sessions } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

type Params = {
  sessionId: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> },
) {
  try {
    const rawParam = (await params).sessionId as string
    const decoded = decodeURIComponent(rawParam ?? '')
    const sessionId = decoded.trim()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)

    if (process.env.NODE_ENV !== 'production') {
      console.warn('[sessions/:id] params', { raw: rawParam, rawLength: rawParam?.length ?? 0 })
      console.warn('[sessions/:id] params decoded', { id: sessionId, idLength: sessionId?.length ?? 0 })
      console.warn('[sessions/:id] params json', JSON.stringify({ sessionId }))
      console.warn('[sessions/:id] request', { url: _request.url, path: _request.nextUrl.pathname })
      if (!isUuid) {
        const chars = Array.from(rawParam ?? '').map((c) => c.charCodeAt(0))
        console.warn('[sessions/:id] invalid uuid chars', { chars })
      }
    }

    if (!isUuid) {
      return NextResponse.json(
        {
          error: 'INVALID_SESSION_ID',
          raw: rawParam,
          id: sessionId,
          rawLength: rawParam?.length ?? 0,
          idLength: sessionId?.length ?? 0,
          url: _request.url,
        },
        { status: 400 },
      )
    }

    const [row] = await db
      .select({
        session: sessions,
        movieTitle: sql<string>`coalesce(${movies.title}, ${sessions.movieTitle})`.as('movie_title'),
      })
      .from(sessions)
      .leftJoin(movies, eq(sessions.movieId, movies.id))
      .where(eq(sessions.id, sessionId))
      .limit(1)

    if (!row) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 },
      )
    }

    return NextResponse.json({
      ...row.session,
      movieTitle: row.movieTitle,
    })
  } catch (error) {
    console.error('Erro ao buscar sessão:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar sessão' },
      { status: 500 },
    )
  }
}
