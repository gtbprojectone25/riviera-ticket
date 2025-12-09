import { db } from '@/db'
import { sessions } from '@/db/schema'
import { desc, gte } from 'drizzle-orm'

async function getOccupancyData() {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const recentSessions = await db
    .select({
      id: sessions.id,
      movieTitle: sessions.movieTitle,
      cinemaName: sessions.cinemaName,
      totalSeats: sessions.totalSeats,
      availableSeats: sessions.availableSeats,
    })
    .from(sessions)
    .where(gte(sessions.startTime, weekAgo))
    .orderBy(desc(sessions.startTime))
    .limit(10)

  return recentSessions.map((s) => {
    const sold = s.totalSeats - s.availableSeats
    const occupancy = Math.round((sold / s.totalSeats) * 100)
    return {
      ...s,
      sold,
      occupancy,
    }
  })
}

export async function OccupancyStats() {
  const sessionsData = await getOccupancyData()

  const getOccupancyColor = (occupancy: number) => {
    if (occupancy >= 80) return 'bg-green-500'
    if (occupancy >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Ocupação por Sessão</h3>
          <p className="text-sm text-gray-400 mt-1">Últimas sessões</p>
        </div>
      </div>

      <div className="space-y-3">
        {sessionsData.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma sessão recente</p>
        ) : (
          sessionsData.map((session) => (
            <div key={session.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{session.movieTitle}</p>
                <p className="text-xs text-gray-500 truncate">{session.cinemaName}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getOccupancyColor(session.occupancy)}`}
                    style={{ width: `${session.occupancy}%` }}
                  />
                </div>
                <span className="text-sm text-gray-300 w-10 text-right">{session.occupancy}%</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
