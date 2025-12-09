/**
 * API Route: POST /api/cron/release-expired-seats
 * 
 * Cron job para liberar assentos com reservas expiradas
 * 
 * Pode ser acionado por:
 * - Vercel Cron Jobs
 * - GitHub Actions
 * - Qualquer scheduler externo
 * 
 * Proteção via CRON_SECRET para evitar chamadas não autorizadas
 */

import { NextRequest, NextResponse } from 'next/server'
import { releaseExpiredReservations } from '@/lib/seat-reservation'

const CRON_SECRET = process.env.CRON_SECRET

export async function POST(request: NextRequest) {
  try {
    // Verificar autorização
    const authHeader = request.headers.get('authorization')
    
    if (CRON_SECRET) {
      if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Executar limpeza
    const result = await releaseExpiredReservations()

    if (!result.success) {
      return NextResponse.json(
        { error: 'Falha ao liberar reservas' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Liberados ${result.releasedCount} assentos expirados`,
      releasedCount: result.releasedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Erro no cron job:', error)
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    )
  }
}

// GET para verificar status (health check)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    job: 'release-expired-seats',
    description: 'Libera assentos com reservas expiradas',
  })
}
