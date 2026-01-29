import { db } from '@/db'
import { paymentIntents, sessions, tickets } from '@/db/schema'
import { sql, gte, and, eq, count } from 'drizzle-orm'
import { DollarSign, Ticket, Film, Percent } from 'lucide-react'

type SessionRow = typeof sessions.$inferSelect

async function getReportStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const monthAgo = new Date(today)
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  // Faturamento total do mês
  const [monthRevenue] = await db
    .select({ total: sql<number>`COALESCE(SUM(${paymentIntents.amountCents}), 0)` })
    .from(paymentIntents)
    .where(and(
      eq(paymentIntents.status, 'SUCCEEDED'),
      gte(paymentIntents.createdAt, monthAgo)
    ))

  // Total de ingressos vendidos no mês
  const [monthTickets] = await db
    .select({ count: count() })
    .from(tickets)
    .where(and(
      eq(tickets.status, 'CONFIRMED'),
      gte(tickets.createdAt, monthAgo)
    ))

  // Total de sessões no mês
  const [monthSessions] = await db
    .select({ count: count() })
    .from(sessions)
    .where(gte(sessions.startTime, monthAgo))

  // Média de ocupação
  const sessionsData = (await db
    .select({
      totalSeats: sessions.totalSeats,
      availableSeats: sessions.availableSeats,
    })
    .from(sessions)
    .where(gte(sessions.startTime, monthAgo))
    .limit(100)) as SessionRow[]

  let avgOccupancy = 0
  if (sessionsData.length > 0) {
    const totalOccupancy = sessionsData.reduce((acc: number, s: SessionRow) => {
      const sold = s.totalSeats - s.availableSeats
      return acc + (sold / s.totalSeats) * 100
    }, 0)
    avgOccupancy = Math.round(totalOccupancy / sessionsData.length)
  }

  return {
    monthRevenue: Number(monthRevenue?.total || 0) / 100,
    monthTickets: monthTickets?.count || 0,
    monthSessions: monthSessions?.count || 0,
    avgOccupancy,
  }
}

export async function ReportCards() {
  const stats = await getReportStats()

  const cards = [
    {
      title: 'Faturamento Mensal',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.monthRevenue),
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Ingressos Vendidos',
      value: stats.monthTickets.toString(),
      icon: Ticket,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      subtitle: 'último mês',
    },
    {
      title: 'Sessões Realizadas',
      value: stats.monthSessions.toString(),
      icon: Film,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      subtitle: 'último mês',
    },
    {
      title: 'Ocupação Média',
      value: `${stats.avgOccupancy}%`,
      icon: Percent,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      subtitle: 'último mês',
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
              {card.subtitle && (
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              )}
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
