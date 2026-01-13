import { db } from '@/db'
import { sessions, tickets } from '@/db/schema'
import { desc, eq, count } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Edit, Trash2, Eye, Film, Calendar } from 'lucide-react'
import Link from 'next/link'

type SearchParams = Promise<{ [key: string]: string | undefined }>
type SessionRow = typeof sessions.$inferSelect
type SessionWithStats = SessionRow & {
  ticketsSold: number
  soldSeats: number
  occupancy: number
}

async function getSessions() {
  const allSessions = (await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.startTime))
    .limit(50)) as SessionRow[]

  // Enriquecer com contagem de tickets vendidos
  const enrichedSessions: SessionWithStats[] = await Promise.all(
    allSessions.map(async (session: SessionRow) => {
      const [ticketsCount] = await db
        .select({ count: count() })
        .from(tickets)
        .where(eq(tickets.sessionId, session.id))

      const soldSeats = session.totalSeats - session.availableSeats
      const occupancy = Math.round((soldSeats / session.totalSeats) * 100)

      return {
        ...session,
        ticketsSold: ticketsCount?.count || 0,
        soldSeats,
        occupancy,
      }
    })
  )

  return enrichedSessions
}

export async function SessionsTable({ searchParams: _ }: { searchParams: SearchParams }) {
  void _  // Suprimir aviso de não usado
  const allSessions = await getSessions()

  const getTimeStatus = (startTime: Date) => {
    const now = new Date()
    const start = new Date(startTime)
    
    if (start < now) {
      return { label: 'Encerrada', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' }
    }
    
    const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntil < 2) {
      return { label: 'Em breve', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' }
    }
    
    return { label: 'Ativa', color: 'bg-green-500/10 text-green-500 border-green-500/20' }
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Filme
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Cinema
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Data/Hora
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Formato
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Ocupação
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {allSessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  Nenhuma sessão encontrada
                </td>
              </tr>
            ) : (
              allSessions.map((session) => {
                const timeStatus = getTimeStatus(session.startTime)
                
                return (
                  <tr key={session.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                          <Film className="w-5 h-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white truncate max-w-[200px]">
                            {session.movieTitle}
                          </p>
                          <p className="text-xs text-gray-500">{session.movieDuration} min</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-300 truncate max-w-[150px]">
                        {session.cinemaName}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="text-sm text-white">
                            {format(new Date(session.startTime), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(session.startTime), 'HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                        {session.screenType}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${session.occupancy}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-300">{session.occupancy}%</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {session.soldSeats}/{session.totalSeats} vendidos
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={timeStatus.color}>
                        {timeStatus.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/sessions/${session.id}`}>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/sessions/${session.id}/edit`}>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
