import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { db } from '@/db'

type ExistsRow = { exists: boolean }

export async function GET() {
  try {
    await db.execute(sql`select 1`)

    const result = await db.execute<ExistsRow>(sql`
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'queue_entries'
          and column_name = 'visitor_token'
      ) as "exists"
    `)

    const visitorTokenColumn = Boolean(result.rows?.[0]?.exists)
    if (!visitorTokenColumn) {
      return NextResponse.json(
        {
          ok: false,
          checks: {
            db: true,
            visitorTokenColumn: false,
          },
          error: 'DB migration missing: visitor_token',
          message: 'Queue temporarily unavailable. Please try again.',
        },
        { status: 503 },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        checks: {
          db: true,
          visitorTokenColumn: true,
        },
      },
      { status: 200 },
    )
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[queue] health.failed', {
        message: error instanceof Error ? error.message : String(error),
      })
    }

    return NextResponse.json(
      {
        ok: false,
        checks: {
          db: false,
          visitorTokenColumn: false,
        },
        error: 'Queue healthcheck failed',
        message: 'Queue temporarily unavailable. Please try again.',
      },
      { status: 503 },
    )
  }
}
