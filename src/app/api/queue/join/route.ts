import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { allocateQueueNumber } from '@/db/queries'

const joinSchema = z.object({
  scopeKey: z.string().trim().min(1).max(120).regex(/^[a-zA-Z0-9:_-]+$/),
  userId: z.string().uuid().nullable().optional(),
  cartId: z.string().uuid().nullable().optional(),
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = joinSchema.parse(body)
    const visitorCookieName = 'rt_visit_id'
    const visitorToken = request.cookies.get(visitorCookieName)?.value ?? randomUUID()

    const result = await allocateQueueNumber({
      scopeKey: parsed.scopeKey,
      visitorToken,
      userId: parsed.userId ?? null,
      cartId: parsed.cartId ?? null,
    })

    if (process.env.NODE_ENV !== 'production') {
      console.info('[queue] join.success', {
        scopeKey: parsed.scopeKey,
        status: result.status,
        queueNumber: result.queueNumber,
        peopleInQueue: result.peopleInQueue,
      })
    }

    const response = NextResponse.json({
      queueEntryId: result.entryId,
      queueNumber: result.queueNumber,
      initialQueueNumber: result.initialQueueNumber,
      peopleInQueue: result.peopleInQueue,
      status: result.status,
      expiresAt: result.expiresAt,
    })

    response.cookies.set(visitorCookieName, visitorToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    })

    return response
  } catch (error) {
    const migrationCheck = isMissingVisitorTokenMigration(error)
    if (migrationCheck.missing) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[queue] join.missing-migration', {
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

    if (error instanceof z.ZodError) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[queue] join.invalid-payload', { issues: error.flatten().fieldErrors })
      }
      return NextResponse.json(
        { error: 'Invalid queue payload', details: error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    console.error('Queue join failed:', error)
    return NextResponse.json(
      { error: 'Queue temporarily unavailable. Please try again.' },
      { status: 503 },
    )
  }
}
