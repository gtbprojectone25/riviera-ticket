/**
 * API: GET /api/admin/reports/orders/excel
 * Exportar relatório de pedidos em Excel
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { paymentIntents, users, carts, sessions } from '@/db/schema'
import { desc, eq, and, gte, lte } from 'drizzle-orm'
import { requireAdmin } from '@/lib/admin-auth'
import ExcelJS from 'exceljs'

type OrderRow = {
  id: string
  stripeId: string | null
  amount: number
  status: string | null
  createdAt: Date
  userId: string | null
  cartId: string | null
}

type OrderWithDetails = OrderRow & {
  userName: string
  userEmail: string
  sessionTitle: string
  cinemaName: string
}

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

    // Buscar dados
    const orders = (await db
      .select({
        id: paymentIntents.id,
        stripeId: paymentIntents.stripePaymentIntentId,
        amount: paymentIntents.amount,
        status: paymentIntents.status,
        createdAt: paymentIntents.createdAt,
        userId: paymentIntents.userId,
        cartId: paymentIntents.cartId,
      })
      .from(paymentIntents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(paymentIntents.createdAt))
      .limit(1000)) as OrderRow[]

    // Enriquecer com dados do usuário e sessão
    const enrichedOrders: OrderWithDetails[] = await Promise.all(
      orders.map(async (order: OrderRow) => {
        let userName = 'Convidado'
        let userEmail = '-'
        let sessionTitle = '-'
        let cinemaName = '-'

        if (order.userId) {
          const [user] = await db
            .select({ name: users.name, email: users.email })
            .from(users)
            .where(eq(users.id, order.userId))
            .limit(1)

          if (user) {
            userName = user.name
            userEmail = user.email
          }
        }

        if (order.cartId) {
          const [cart] = await db
            .select({ sessionId: carts.sessionId })
            .from(carts)
            .where(eq(carts.id, order.cartId))
            .limit(1)

          if (cart?.sessionId) {
            const [session] = await db
              .select({ movieTitle: sessions.movieTitle, cinemaName: sessions.cinemaName })
              .from(sessions)
              .where(eq(sessions.id, cart.sessionId))
              .limit(1)

            if (session) {
              sessionTitle = session.movieTitle
              cinemaName = session.cinemaName
            }
          }
        }

        return {
          ...order,
          userName,
          userEmail,
          sessionTitle,
          cinemaName,
        }
      })
    )

    // Criar Excel
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Riviera Ticket Admin'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Pedidos')

    // Definir colunas
    worksheet.columns = [
      { header: 'ID Pedido', key: 'id', width: 20 },
      { header: 'ID Stripe', key: 'stripeId', width: 30 },
      { header: 'Cliente', key: 'userName', width: 25 },
      { header: 'Email', key: 'userEmail', width: 30 },
      { header: 'Filme', key: 'sessionTitle', width: 25 },
      { header: 'Cinema', key: 'cinemaName', width: 25 },
      { header: 'Valor (R$)', key: 'amount', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Data', key: 'createdAt', width: 20 },
    ]

    // Estilizar header
    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F2937' },
    }
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

    // Adicionar dados
    enrichedOrders.forEach((order) => {
      worksheet.addRow({
        id: order.id,
        stripeId: order.stripeId || '-',
        userName: order.userName,
        userEmail: order.userEmail,
        sessionTitle: order.sessionTitle,
        cinemaName: order.cinemaName,
        amount: (order.amount / 100).toFixed(2),
        status: order.status,
        createdAt: new Date(order.createdAt).toLocaleString('pt-BR'),
      })
    })

    // Gerar buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Retornar arquivo
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="pedidos-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }
    console.error('Error generating Excel report:', error)
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 })
  }
}

