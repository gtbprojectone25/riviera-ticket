import { db } from '@/db'
import { sessions } from '@/db/schema'
import { desc, gte } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

type SessionRow = typeof sessions.$inferSelect
type SessionWithSales = SessionRow & {
  soldSeats: number
  occupancy: number
}

async function getTopSessions() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Buscar sessões ativas com contagem de tickets vendidos
  const sessionsWithSales = (await db
    .select({
      id: sessions.id,
      movieTitle: sessions.movieTitle,
      cinemaName: sessions.cinemaName,
      startTime: sessions.startTime,
      totalSeats: sessions.totalSeats,
      availableSeats: sessions.availableSeats,
      screenType: sessions.screenType,
    })
    .from(sessions)
    .where(gte(sessions.startTime, today))
    .orderBy(desc(sessions.startTime))
    .limit(5)) as SessionRow[]

  // Calcular ocupação
  return sessionsWithSales.map((session: SessionRow): SessionWithSales => {
    const soldSeats = session.totalSeats - session.availableSeats
    const occupancy = Math.round((soldSeats / session.totalSeats) * 100)

    return {
      ...session,
      soldSeats,
      occupancy,
    }
  })
}

export async function TopSessions() {
  const topSessions = await getTopSessions()

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 90) return 'bg-red-500/10 text-red-500 border-red-500/20'
    if (occupancy >= 70) return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    if (occupancy >= 50) return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    return 'bg-green-500/10 text-green-500 border-green-500/20'
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Sessões de Hoje</h3>
        <a href="/admin/sessions" className="text-sm text-red-500 hover:text-red-400">
          Ver todas →
        </a>
      </div>

      {topSessions.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Nenhuma sessão para hoje</p>
      ) : (
        <div className="space-y-3">
          {topSessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {session.movieTitle}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session.cinemaName} • {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })}
                </p>
              </div>

              <div className="text-right mx-4">
                <p className="text-sm font-medium text-white">
                  {session.soldSeats}/{session.totalSeats}
                </p>
                <p className="text-xs text-gray-500">assentos</p>
              </div>

              <Badge className={getOccupancyColor(session.occupancy)}>
                {session.occupancy}%
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

