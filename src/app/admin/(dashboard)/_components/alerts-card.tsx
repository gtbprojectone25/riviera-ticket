import { db } from '@/db'
import { sessions, carts } from '@/db/schema'
import { gte, lte, and, eq, sql, count } from 'drizzle-orm'
import { AlertTriangle, TrendingDown, Users, Ticket, LucideIcon } from 'lucide-react'

type AlertItem = {
  type: 'warning' | 'danger' | 'info'
  icon: LucideIcon
  message: string
}

async function getAlerts() {
  const now = new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const alerts: AlertItem[] = []

  // Sessões quase lotadas (> 90%)
  const almostFullSessions = await db
    .select({ count: count() })
    .from(sessions)
    .where(and(
      gte(sessions.startTime, today),
      lte(sessions.startTime, tomorrow),
      sql`(${sessions.totalSeats} - ${sessions.availableSeats}) * 100 / ${sessions.totalSeats} >= 90`
    ))

  if (almostFullSessions[0]?.count > 0) {
    alerts.push({
      type: 'warning',
      icon: Users,
      message: `${almostFullSessions[0].count} sessão(ões) quase lotada(s) hoje`,
    })
  }

  // Sessões com baixa venda (< 20%)
  const lowSalesSessions = await db
    .select({ count: count() })
    .from(sessions)
    .where(and(
      gte(sessions.startTime, today),
      lte(sessions.startTime, tomorrow),
      sql`(${sessions.totalSeats} - ${sessions.availableSeats}) * 100 / ${sessions.totalSeats} < 20`
    ))

  if (lowSalesSessions[0]?.count > 0) {
    alerts.push({
      type: 'danger',
      icon: TrendingDown,
      message: `${lowSalesSessions[0].count} sessão(ões) com baixa venda hoje`,
    })
  }

  // Carrinhos expirando (ativos há mais de 8 minutos)
  const expiringCarts = await db
    .select({ count: count() })
    .from(carts)
    .where(and(
      eq(carts.status, 'ACTIVE'),
      lte(carts.expiresAt, new Date(now.getTime() + 2 * 60 * 1000))
    ))

  if (expiringCarts[0]?.count > 0) {
    alerts.push({
      type: 'info',
      icon: Ticket,
      message: `${expiringCarts[0].count} carrinho(s) prestes a expirar`,
    })
  }

  // Se não houver alertas
  if (alerts.length === 0) {
    alerts.push({
      type: 'info',
      icon: AlertTriangle,
      message: 'Nenhum alerta no momento',
    })
  }

  return alerts
}

const alertStyles = {
  warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
  danger: 'bg-red-500/10 border-red-500/20 text-red-500',
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
}

export async function AlertsCard() {
  const alerts = await getAlerts()

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Alertas</h3>
        <span className="text-xs text-gray-500">Atualizado agora</span>
      </div>

      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`flex items-center gap-3 p-3 rounded-lg border ${alertStyles[alert.type]}`}
          >
            <alert.icon className="w-5 h-5 shrink-0" />
            <p className="text-sm">{alert.message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
