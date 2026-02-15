import { NextRequest, NextResponse } from 'next/server'
import { getQueueStatus } from '@/db/queries'
import { z } from 'zod'

const statusQuerySchema = z.object({
  entryId: z.string().uuid(),
})

function getErrorChain(error: unknown) {
  const messages: string[] = []
  const codes: string[] = []
  let current: unknown = error
  let depth = 0

  while (current && depth < 8) {
    const candidate = current as { message?: string; code?: string; cause?: unknown }
    if (candidate.message) messages.push(candidate.message)
    if (candidate.code) codes.push(candidate.code)
    current = candidate.cause
    depth += 1
  }

  return { messages, codes }
}

function isMissingVisitorTokenMigration(error: unknown) {
  const { messages, codes } = getErrorChain(error)
  const merged = messages.join(' | ')
  const hasUndefinedColumnCode = codes.includes('42703')
  const hasMissingColumnMessage = /column ["']?visitor_token["']? does not exist/i.test(merged)
  return {
    missing: hasMissingColumnMessage || (hasUndefinedColumnCode && /visitor_token/i.test(merged)),
    codes,
    merged,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = statusQuerySchema.safeParse({
      entryId: searchParams.get('entryId'),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'entryId must be a valid uuid' }, { status: 400 })
    }
    const entryId = parsed.data.entryId

    const visitorToken = request.cookies.get('rt_visit_id')?.value
    if (!visitorToken) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const status = await getQueueStatus(entryId)

    if (!status) {
      return NextResponse.json({ error: 'Queue entry not found' }, { status: 404 })
    }

    if (status.visitorToken !== visitorToken) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[queue] status.forbidden-visitor', { entryId })
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (process.env.NODE_ENV !== 'production') {
      console.info('[queue] status.success', {
        entryId,
        status: status.status,
        queueNumber: status.queueNumber,
        peopleInQueue: status.peopleInQueue,
      })
    }

    return NextResponse.json({
      status: status.status,
      queueNumber: status.queueNumber,
      initialQueueNumber: status.initialQueueNumber,
      peopleInQueue: status.peopleInQueue,
      scopeKey: status.scopeKey,
      progress: status.progress,
      expiresAt: status.expiresAt,
      createdAt: status.createdAt,
    })
  } catch (error) {
    const migrationCheck = isMissingVisitorTokenMigration(error)
    if (migrationCheck.missing) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[queue] status.missing-migration', {
          errorCodes: migrationCheck.codes,
          errorMessage: migrationCheck.merged,
        })
      }
      return NextResponse.json(
        {
          error: 'DB migration missing: visitor_token',
          message: 'Queue temporarily unavailable. Please try again.',
        },
        { status: 503 },
      )
    }

    console.error('Queue status failed:', error)
    return NextResponse.json(
      { error: 'Queue temporarily unavailable. Please try again.' },
      { status: 503 },
    )
  }
}
