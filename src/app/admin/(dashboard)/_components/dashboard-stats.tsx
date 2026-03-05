import { db } from '@/db'
import { tickets, sessions, paymentIntents } from '@/db/schema'
import { eq, gte, sql, and, count } from 'drizzle-orm'
import { DollarSign, Ticket, CalendarCheck, TrendingUp } from 'lucide-react'
import { withDbRetry } from '@/lib/db-retry'

async function safeSumPaymentIntents(fromDate: Date) {
  try {
    const [row] = await withDbRetry(() =>
      db
        .select({ total: sql<number>`COALESCE(SUM(${paymentIntents.amountCents}), 0)` })
        .from(paymentIntents)
        .where(and(
          eq(paymentIntents.status, 'SUCCEEDED'),
          gte(paymentIntents.createdAt, fromDate),
        )),
    )

    return Number(row?.total || 0)
  } catch (error) {
    const cause = (error as { cause?: unknown })?.cause
    console.error('DashboardStats: failed to sum payment_intents', { error, cause })
    return 0
  }
}

async function safeCountTodayTickets(today: Date) {
  try {
    const [todayTickets] = await withDbRetry(() =>
      db
        .select({ count: count() })
        .from(tickets)
        .where(and(
          eq(tickets.status, 'CONFIRMED'),
          gte(tickets.createdAt, today),
        )),
    )
    return todayTickets?.count || 0
  } catch (error) {
    console.error('DashboardStats: failed to count tickets', error)
    return 0
  }
}

async function safeCountActiveSessions(today: Date) {
  try {
    const [activeSessions] = await withDbRetry(() =>
      db
        .select({ count: count() })
        .from(sessions)
        .where(gte(sessions.startTime, today)),
    )
    return activeSessions?.count || 0
  } catch (error) {
    console.error('DashboardStats: failed to count sessions', error)
    return 0
  }
}

async function getStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  const todayRevenue = await safeSumPaymentIntents(today)
  const monthRevenue = await safeSumPaymentIntents(monthAgo)
  const todayTickets = await safeCountTodayTickets(today)
  const activeSessions = await safeCountActiveSessions(today)

  return {
    todayRevenue: todayRevenue / 100,
    monthRevenue: monthRevenue / 100,
    todayTickets,
    activeSessions,
  }
}

export async function DashboardStats() {
  const stats = await getStats()

  const cards = [
    {
      title: 'Faturamento Hoje',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.todayRevenue),
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Faturamento Mensal',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.monthRevenue),
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Ingressos Vendidos Hoje',
      value: stats.todayTickets.toString(),
      icon: Ticket,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Sessoes Ativas Hoje',
      value: stats.activeSessions.toString(),
      icon: CalendarCheck,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">{card.title}</p>
              <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
            </div>
            <div className={`${card.bgColor} p-3 rounded-xl`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
