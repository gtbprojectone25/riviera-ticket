import { db } from '@/db'
import { cinemas, auditoriums, sessions } from '@/db/schema'
import { desc, eq, count } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Edit, Trash2, MapPin, Monitor } from 'lucide-react'
import Link from 'next/link'

async function getCinemas() {
  const allCinemas = await db
    .select()
    .from(cinemas)
    .orderBy(desc(cinemas.createdAt))

  // Enriquecer com contagem de auditoriums e sessões
  const enrichedCinemas = await Promise.all(
    allCinemas.map(async (cinema) => {
      const [audsCount] = await db
        .select({ count: count() })
        .from(auditoriums)
        .where(eq(auditoriums.cinemaId, cinema.id))

      const [sessionsCount] = await db
        .select({ count: count() })
        .from(sessions)
        .where(eq(sessions.cinemaId, cinema.id))

      return {
        ...cinema,
        auditoriumsCount: audsCount?.count || 0,
        sessionsCount: sessionsCount?.count || 0,
      }
    })
  )

  return enrichedCinemas
}

export async function CinemasTable() {
  const allCinemas = await getCinemas()

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Cinema
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Localização
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Formato
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Salas
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Sessões
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {allCinemas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  Nenhum cinema cadastrado
                </td>
              </tr>
            ) : (
              allCinemas.map((cinema) => (
                <tr key={cinema.id} className="hover:bg-gray-700/20 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                        <Monitor className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{cinema.name}</p>
                        <p className="text-xs text-gray-500">{cinema.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-300">{cinema.city}</p>
                        <p className="text-xs text-gray-500">{cinema.state}, {cinema.country}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={cinema.isIMAX 
                      ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
                      : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }>
                      {cinema.isIMAX ? 'IMAX' : 'Standard'}
                    </Badge>
                    {cinema.format && (
                      <span className="text-xs text-gray-500 ml-2">{cinema.format}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-white">{cinema.auditoriumsCount}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm text-white">{cinema.sessionsCount}</p>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/cinemas/${cinema.id}/edit`}>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
