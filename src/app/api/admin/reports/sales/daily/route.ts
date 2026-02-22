/**
 * GET /api/admin/reports/sales/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Retorna receita por dia para o gráfico do dashboard.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSalesByDay } from '@/db/queries'
import { requireAdmin } from '@/lib/admin-auth'

function parseDateParam(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const from = parseDateParam(searchParams.get('from'))
    const to = parseDateParam(searchParams.get('to'))

    const daily = await getSalesByDay({ from: from || undefined, to: to || undefined })
    return NextResponse.json({ daily })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }
    console.error('Error fetching daily sales:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
