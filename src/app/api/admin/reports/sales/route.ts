/**
 * API: GET /api/admin/reports/sales
 * Sales report (revenue, tickets sold, average ticket, breakdowns)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSalesReport } from '@/db/queries'
import { requireRole } from '@/lib/admin-auth'

function parseDateParam(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest) {
  try {
    await requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])

    const { searchParams } = new URL(request.url)
    const from = parseDateParam(searchParams.get('from'))
    const to = parseDateParam(searchParams.get('to'))
    const report = await getSalesReport({ from: from || undefined, to: to || undefined })

    return NextResponse.json(report)
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error fetching sales report:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
