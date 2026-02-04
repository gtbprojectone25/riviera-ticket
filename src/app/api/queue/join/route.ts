import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { allocateQueueNumber } from '@/db/queries'

const joinSchema = z.object({
  scopeKey: z.string().min(1),
  userId: z.string().uuid().nullable().optional(),
  cartId: z.string().uuid().nullable().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = joinSchema.parse(body)

    const result = await allocateQueueNumber({
      scopeKey: parsed.scopeKey,
      userId: parsed.userId ?? null,
      cartId: parsed.cartId ?? null,
    })

    return NextResponse.json({
      queueEntryId: result.entryId,
      queueNumber: result.queueNumber,
      status: result.status,
    })
  } catch (error) {
    console.error('Erro ao entrar na fila:', error)
    return NextResponse.json(
      { error: 'Erro ao entrar na fila' },
      { status: 500 },
    )
  }
}
