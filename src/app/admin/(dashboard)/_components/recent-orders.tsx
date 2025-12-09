import { db } from '@/db'
import { paymentIntents, users } from '@/db/schema'
import { desc, eq } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

async function getRecentOrders() {
  // Buscar últimos pagamentos com sucesso
  const recentPayments = await db
    .select({
      id: paymentIntents.id,
      amount: paymentIntents.amount,
      status: paymentIntents.status,
      createdAt: paymentIntents.createdAt,
      cartId: paymentIntents.cartId,
      userId: paymentIntents.userId,
    })
    .from(paymentIntents)
    .orderBy(desc(paymentIntents.createdAt))
    .limit(5)

  // Buscar dados dos usuários
  const ordersWithDetails = await Promise.all(
    recentPayments.map(async (payment) => {
      let userName = 'Convidado'
      let userEmail = '-'

      if (payment.userId) {
        const [user] = await db
          .select({ name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, payment.userId))
          .limit(1)

        if (user) {
          userName = user.name
          userEmail = user.email
        }
      }

      return {
        ...payment,
        userName,
        userEmail,
      }
    })
  )

  return ordersWithDetails
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

export async function RecentOrders() {
  const orders = await getRecentOrders()

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Últimos Pedidos</h3>
        <a href="/admin/orders" className="text-sm text-red-500 hover:text-red-400">
          Ver todos →
        </a>
      </div>

      {orders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Nenhum pedido encontrado</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {order.userName}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {order.userEmail}
                </p>
              </div>

              <div className="text-right mx-4">
                <p className="text-sm font-medium text-white">
                  {new Intl.NumberFormat('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL' 
                  }).format(order.amount / 100)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(order.createdAt), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </p>
              </div>

              <Badge className={statusColors[order.status || 'PENDING']}>
                {statusLabels[order.status || 'PENDING']}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
