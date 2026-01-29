import Image from 'next/image'
import Link from 'next/link'
import { db } from '@/db'
import { auditoriums, assets, cinemas } from '@/db/schema'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Armchair, Edit, Image as ImageIcon } from 'lucide-react'
import { desc, eq } from 'drizzle-orm'
import { DeleteAuditoriumButton } from './delete-auditorium-button'

type AuditoriumRow = typeof auditoriums.$inferSelect

type AuditoriumWithMeta = {
  auditorium: AuditoriumRow
  cinemaName: string | null
  assetUrl: string | null
  assetTitle: string | null
}

async function getAuditoriums(): Promise<AuditoriumWithMeta[]> {
  const rows = await db
    .select({
      auditorium: auditoriums,
      cinemaName: cinemas.name,
      assetUrl: assets.url,
      assetTitle: assets.title,
    })
    .from(auditoriums)
    .leftJoin(cinemas, eq(auditoriums.cinemaId, cinemas.id))
    .leftJoin(assets, eq(auditoriums.imageAssetId, assets.id))
    .orderBy(desc(auditoriums.createdAt))

  return rows
}

function getSeatMapRows(auditorium: AuditoriumRow) {
  const seatMap = auditorium.seatMapConfig || auditorium.layout
  return Array.isArray(seatMap?.rowsConfig) ? seatMap.rowsConfig.length : 0
}

export async function AuditoriumsTable() {
  const rows = await getAuditoriums()

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Sala
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Cinema
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Capacidade
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Mapa
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Acoes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  Nenhuma sala cadastrada
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const { auditorium } = row
                const rowsCount = getSeatMapRows(auditorium)

                return (
                  <tr key={auditorium.id} className="hover:bg-gray-700/20 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                          {row.assetUrl ? (
                            <Image
                              src={row.assetUrl}
                              alt={row.assetTitle || auditorium.name}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Armchair className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{auditorium.name}</p>
                          <p className="text-xs text-gray-500">{auditorium.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-300">{row.cinemaName || 'Sem cinema'}</p>
                      <p className="text-xs text-gray-500">{auditorium.cinemaId}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        className={
                          auditorium.type === 'IMAX'
                            ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                        }
                      >
                        {auditorium.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-white">{auditorium.capacity}</p>
                      <p className="text-xs text-gray-500">Total: {auditorium.totalSeats}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <ImageIcon className="w-4 h-4 text-gray-500" />
                        {rowsCount > 0 ? `${rowsCount} fileiras` : 'Sem mapa'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/auditoriums/${auditorium.id}/edit`}>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <DeleteAuditoriumButton auditoriumId={auditorium.id} />
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
