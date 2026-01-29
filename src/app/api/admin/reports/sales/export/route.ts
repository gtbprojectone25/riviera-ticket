/**
 * API: GET /api/admin/reports/sales/export
 * Exporta relatorio de vendas em CSV
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSalesReport } from '@/db/queries'
import { requireRole } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit-log'

type ExportType = 'summary' | 'region' | 'city' | 'cinema' | 'session' | 'user'

function parseDateParam(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toCsv(headers: string[], rows: Array<Array<string | number | null>>) {
  const escapeValue = (value: string | number | null) => {
    if (value === null || value === undefined) return ''
    const text = String(value)
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const lines = [
    headers.map(escapeValue).join(','),
    ...rows.map((row) => row.map(escapeValue).join(',')),
  ]

  return lines.join('\n')
}

function getClientMeta(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
  const userAgent = request.headers.get('user-agent') || null
  return { ipAddress, userAgent }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])

    const { searchParams } = new URL(request.url)
    const from = parseDateParam(searchParams.get('from'))
    const to = parseDateParam(searchParams.get('to'))
    const type = (searchParams.get('type') || 'session') as ExportType

    const report = await getSalesReport({ from: from || undefined, to: to || undefined })

    let headers: string[] = []
    let rows: Array<Array<string | number | null>> = []

    switch (type) {
      case 'summary':
        headers = ['revenueCents', 'ticketsSold', 'ordersCount', 'avgTicketCents']
        rows = [[
          report.summary.revenueCents,
          report.summary.ticketsSold,
          report.summary.ordersCount,
          report.summary.avgTicketCents,
        ]]
        break
      case 'region':
        headers = ['region', 'country', 'ticketsSold', 'revenueCents']
        rows = report.salesByRegion.map((row) => [
          row.region,
          row.country,
          row.ticketsSold,
          row.revenueCents,
        ])
        break
      case 'city':
        headers = ['city', 'state', 'ticketsSold', 'revenueCents']
        rows = report.salesByCity.map((row) => [
          row.city,
          row.state,
          row.ticketsSold,
          row.revenueCents,
        ])
        break
      case 'cinema':
        headers = ['cinemaId', 'cinemaName', 'city', 'state', 'ticketsSold', 'revenueCents']
        rows = report.salesByCinema.map((row) => [
          row.cinemaId,
          row.cinemaName,
          row.city,
          row.state,
          row.ticketsSold,
          row.revenueCents,
        ])
        break
      case 'user':
        headers = ['userId', 'name', 'email', 'ticketsSold', 'revenueCents']
        rows = report.salesByUser.map((row) => [
          row.userId,
          row.name,
          row.email,
          row.ticketsSold,
          row.revenueCents,
        ])
        break
      case 'session':
      default:
        headers = ['sessionId', 'movieTitle', 'startTime', 'cinemaName', 'auditoriumName', 'ticketsSold', 'revenueCents']
        rows = report.salesBySession.map((row) => [
          row.sessionId,
          row.movieTitle,
          row.startTime?.toISOString?.() ?? '',
          row.cinemaName,
          row.auditoriumName ?? '',
          row.ticketsSold,
          row.revenueCents,
        ])
        break
    }

    const csv = toCsv(headers, rows)
    const dateSuffix = new Date().toISOString().slice(0, 10)
    const filename = `sales-report-${type}-${dateSuffix}.csv`

    const { ipAddress, userAgent } = getClientMeta(request)
    await writeAuditLog({
      adminId: admin.id,
      action: 'EXPORT_SALES_CSV',
      entity: 'sales_report',
      entityId: type,
      newValues: { type, from, to },
      ipAddress,
      userAgent,
    })

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }
    if ((error as Error).message === 'Forbidden') {
      return NextResponse.json({ error: 'Sem permissao' }, { status: 403 })
    }
    console.error('Error exporting sales report:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
