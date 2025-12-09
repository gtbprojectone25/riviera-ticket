/**
 * API: GET /api/admin/reports/orders/pdf
 * Exportar relatório de pedidos em PDF
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { paymentIntents, users } from '@/db/schema'
import { desc, eq, and, gte, lte, sql } from 'drizzle-orm'
import { requireAdmin } from '@/lib/admin-auth'
import PDFDocument from 'pdfkit'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Construir condições
    const conditions = []

    if (status) {
      conditions.push(eq(paymentIntents.status, status as 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED'))
    }

    if (dateFrom) {
      conditions.push(gte(paymentIntents.createdAt, new Date(dateFrom)))
    }

    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setHours(23, 59, 59, 999)
      conditions.push(lte(paymentIntents.createdAt, endDate))
    }

    // Buscar dados agregados
    const [totals] = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(${paymentIntents.amount}), 0)`,
        paidCount: sql<number>`SUM(CASE WHEN ${paymentIntents.status} = 'SUCCEEDED' THEN 1 ELSE 0 END)`,
        paidAmount: sql<number>`COALESCE(SUM(CASE WHEN ${paymentIntents.status} = 'SUCCEEDED' THEN ${paymentIntents.amount} ELSE 0 END), 0)`,
      })
      .from(paymentIntents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)

    // Buscar últimos pedidos
    const orders = await db
      .select({
        id: paymentIntents.id,
        amount: paymentIntents.amount,
        status: paymentIntents.status,
        createdAt: paymentIntents.createdAt,
        userId: paymentIntents.userId,
      })
      .from(paymentIntents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(paymentIntents.createdAt))
      .limit(50)

    // Enriquecer com dados do usuário
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        let userName = 'Convidado'

        if (order.userId) {
          const [user] = await db
            .select({ name: users.name })
            .from(users)
            .where(eq(users.id, order.userId))
            .limit(1)

          if (user) {
            userName = user.name
          }
        }

        return { ...order, userName }
      })
    )

    // Criar PDF
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', (chunk) => chunks.push(chunk))

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Relatório de Pedidos', { align: 'center' })
    doc.moveDown()
    doc.fontSize(10).font('Helvetica').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' })
    doc.moveDown(2)

    // Filtros aplicados
    if (dateFrom || dateTo || status) {
      doc.fontSize(12).font('Helvetica-Bold').text('Filtros aplicados:')
      doc.fontSize(10).font('Helvetica')
      if (dateFrom) doc.text(`• De: ${new Date(dateFrom).toLocaleDateString('pt-BR')}`)
      if (dateTo) doc.text(`• Até: ${new Date(dateTo).toLocaleDateString('pt-BR')}`)
      if (status) doc.text(`• Status: ${status}`)
      doc.moveDown()
    }

    // Resumo
    doc.fontSize(14).font('Helvetica-Bold').text('Resumo')
    doc.moveDown(0.5)
    
    const summaryData = [
      ['Total de Pedidos', totals.count?.toString() || '0'],
      ['Pedidos Pagos', totals.paidCount?.toString() || '0'],
      ['Valor Total', `R$ ${(Number(totals.totalAmount || 0) / 100).toFixed(2)}`],
      ['Valor Pago', `R$ ${(Number(totals.paidAmount || 0) / 100).toFixed(2)}`],
    ]

    doc.fontSize(10).font('Helvetica')
    summaryData.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`)
    })
    doc.moveDown(2)

    // Tabela de pedidos
    doc.fontSize(14).font('Helvetica-Bold').text('Últimos Pedidos')
    doc.moveDown(0.5)

    // Header da tabela
    const tableTop = doc.y
    const tableHeaders = ['ID', 'Cliente', 'Valor', 'Status', 'Data']
    const colWidths = [80, 150, 80, 80, 100]
    let xPos = 50

    doc.fontSize(9).font('Helvetica-Bold')
    tableHeaders.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'left' })
      xPos += colWidths[i]
    })

    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke()

    // Dados da tabela
    doc.fontSize(8).font('Helvetica')
    let y = tableTop + 20

    enrichedOrders.forEach((order) => {
      if (y > 700) {
        doc.addPage()
        y = 50
      }

      xPos = 50
      const rowData = [
        order.id.slice(0, 8) + '...',
        order.userName.slice(0, 20),
        `R$ ${(order.amount / 100).toFixed(2)}`,
        order.status || 'PENDING',
        new Date(order.createdAt).toLocaleDateString('pt-BR'),
      ]

      rowData.forEach((cell, i) => {
        doc.text(cell, xPos, y, { width: colWidths[i], align: 'left' })
        xPos += colWidths[i]
      })

      y += 15
    })

    // Footer
    doc.fontSize(8).text('© 2025 Riviera Ticket - Relatório Confidencial', 50, 750, { align: 'center' })

    doc.end()

    // Esperar o PDF terminar
    await new Promise<void>((resolve) => doc.on('end', resolve))

    const pdfBuffer = Buffer.concat(chunks)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="pedidos-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    console.error('Error generating PDF report:', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
  }
}
