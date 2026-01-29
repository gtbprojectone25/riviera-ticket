/**
 * API: POST /api/price-rules/calculate
 * Calcula preco final com regras
 */

import { NextRequest, NextResponse } from 'next/server'
import { calculateFinalPrice } from '@/db/queries'
import { z } from 'zod'

const calculateSchema = z.object({
  amountCents: z.number().int().min(0),
  sessionId: z.string().uuid().optional().nullable(),
  auditoriumId: z.string().uuid().optional().nullable(),
  cinemaId: z.string().optional().nullable(),
  startTime: z.string().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = calculateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados invalidos', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const data = validation.data
    const startTime = data.startTime ? new Date(data.startTime) : null
    if (data.startTime && Number.isNaN(startTime?.getTime())) {
      return NextResponse.json({ error: 'startTime invalido' }, { status: 400 })
    }

    const result = await calculateFinalPrice({
      amountCents: data.amountCents,
      sessionId: data.sessionId ?? null,
      auditoriumId: data.auditoriumId ?? null,
      cinemaId: data.cinemaId ?? null,
      startTime,
    })

    return NextResponse.json({
      amountCents: result.amountCents,
      ruleId: result.rule?.id ?? null,
      ruleName: result.rule?.name ?? null,
    })
  } catch (error) {
    console.error('Error calculating price:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
