import { db } from '@/db'
import { paymentIntents, carts, users, sessions } from '@/db/schema'
import { desc, eq, and, gte, lte } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Eye } from 'lucide-react'
import Link from 'next/link'

type SearchParams = Promise<{ [key: string]: string | undefined }>

type OrderRow = {
  id: string
  stripeId: string | null
  amountCents: number
  status: string | null
  createdAt: Date
  cartId: string | null
  userId: string | null
}

type OrderWithDetails = OrderRow & {
  userName: string
  userEmail: string
  sessionTitle: string
}

async function getOrders(params: { [key: string]: string | undefined }) {
  const { search, status, dateFrom, dateTo, page = '1' } = params
  const limit = 20
  const offset = (parseInt(page) - 1) * limit

  // Construir filtros
  const conditions = [] as ReturnType<typeof and>[] | Parameters<typeof and>

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

  const orders = (await db
    .select({
      id: paymentIntents.id,
      stripeId: paymentIntents.stripePaymentIntentId,
      amountCents: paymentIntents.amountCents,
      status: paymentIntents.status,
      createdAt: paymentIntents.createdAt,
      cartId: paymentIntents.cartId,
      userId: paymentIntents.userId,
    })
    .from(paymentIntents)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(paymentIntents.createdAt))
    .limit(limit)
    .offset(offset)) as OrderRow[]

  // Enriquecer com dados do usuario e sessao
  const enrichedOrders: OrderWithDetails[] = await Promise.all(
    orders.map(async (order: OrderRow) => {
      let userName = 'Convidado'
      let userEmail = '-'
      let sessionTitle = '-'

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
            .select({ movieTitle: sessions.movieTitle })
            .from(sessions)
            .where(eq(sessions.id, cart.sessionId))
            .limit(1)

          if (session) {
            sessionTitle = session.movieTitle
          }
        }
      }

      return {
        ...order,
        userName,
        userEmail,
        sessionTitle,
      }
    })
  )

  // Filtro em memoria por search
  let filtered = enrichedOrders
  if (search) {
    const searchLower = search.toLowerCase()
    filtered = enrichedOrders.filter(
      (o) =>
        o.userName.toLowerCase().includes(searchLower) ||
        o.userEmail.toLowerCase().includes(searchLower) ||
        o.id.toLowerCase().includes(searchLower)
    )
  }

  return filtered
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  SUCCEEDED: 'bg-green-500/10 text-green-500 border-green-500/20',
  FAILED: 'bg-red-500/10 text-red-500 border-red-500/20',
  CANCELLED: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  SUCCEEDED: 'Pago',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelado',
}

export async function OrdersTable({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const orders = await getOrders(params)

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Pedido
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Cliente
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Sessao
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Data
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  Nenhum pedido encontrado
                </td>
              </tr>
            ) : (
              orders.map((order: OrderWithDetails) => (
                <tr key={order.id} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">#{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500 truncate max-w-[120px]">
                        {order.stripeId || '-'}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <p className="text-sm font-medium text-white">{order.userName}</p>
                      <p className="text-xs text-gray-500">{order.userEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-300 truncate max-w-[150px]">{order.sessionTitle}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-medium text-white">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.amountCents / 100)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={statusColors[order.status || 'PENDING']}>
                      {statusLabels[order.status || 'PENDING']}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-gray-300">
                      {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
